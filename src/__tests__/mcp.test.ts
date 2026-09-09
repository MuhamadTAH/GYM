import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "@/mcp/server";
import { db } from "@/db";
import { workoutSessions, exerciseSets } from "@/db/schema";

describe("Native Model Context Protocol (MCP) Server", () => {
  let client: Client;

  beforeAll(async () => {
    // Clear test isolation artifacts
    await db.delete(exerciseSets);
    await db.delete(workoutSessions);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client(
      { name: "vitest-mcp-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists all 6 read-only resources with exact URIs", async () => {
    const res = await client.listResources();
    expect(res.resources).toHaveLength(6);

    const uris = res.resources.map((r) => r.uri);
    expect(uris).toContain("gym://profile");
    expect(uris).toContain("gym://session/active");
    expect(uris).toContain("gym://mesocycle/summary");
    expect(uris).toContain("gym://history/recent");
    expect(uris).toContain("gym://chat/pending");
    expect(uris).toContain("gym://goals");
  });

  it("reads gym://profile resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://profile" });
    expect(res.contents).toHaveLength(1);
    expect(res.contents[0].mimeType).toBe("application/json");

    const textContent = res.contents[0] as { text: string };
    const profile = JSON.parse(textContent.text);
    expect(profile).toBeDefined();
    expect(profile.name).toBeDefined();
    expect(profile.baselineLifts).toBeDefined();
    expect(profile.baselineLifts.squat_1rm).toBeGreaterThan(0);
  });

  it("reads gym://session/active resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://session/active" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const session = JSON.parse(textContent.text);
    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();
    expect(session.sessionName).toBeDefined();
    expect(Array.isArray(session.exercises)).toBe(true);
  });

  it("reads gym://mesocycle/summary resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://mesocycle/summary" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const summary = JSON.parse(textContent.text);
    expect(summary).toBeDefined();
    expect(typeof summary.totalSessions).toBe("number");
    expect(typeof summary.completedSessions).toBe("number");
    expect(typeof summary.activeWeek).toBe("number");
  });

  it("reads gym://history/recent resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://history/recent" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const history = JSON.parse(textContent.text);
    expect(Array.isArray(history)).toBe(true);
  });

  it("reads gym://chat/pending resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://chat/pending" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const pending = JSON.parse(textContent.text);
    expect(Array.isArray(pending)).toBe(true);
  });

  it("reads gym://goals resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://goals" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const goals = JSON.parse(textContent.text);
    expect(goals).toBeDefined();
    expect(goals.userId).toBeDefined();
  });

  it("lists all 15 action & state mutation tools", async () => {
    const res = await client.listTools();
    expect(res.tools).toHaveLength(15);

    const toolNames = res.tools.map((t) => t.name);
    expect(toolNames).toContain("log_workout_set");
    expect(toolNames).toContain("get_active_workout");
    expect(toolNames).toContain("trigger_safety_abort");
    expect(toolNames).toContain("calculate_nutrition");
    expect(toolNames).toContain("generate_mesocycle");
    expect(toolNames).toContain("swap_workout_order");
    expect(toolNames).toContain("get_pending_chat_messages");
    expect(toolNames).toContain("post_chat_reply");
    expect(toolNames).toContain("get_daily_goals");
    expect(toolNames).toContain("update_daily_goals");
    expect(toolNames).toContain("get_training_plans");
    expect(toolNames).toContain("update_training_plans");
    expect(toolNames).toContain("get_recommended_plans");
    expect(toolNames).toContain("log_natural_entry");
    expect(toolNames).toContain("delete_logged_entry");
  });

  it("calls update_daily_goals and get_daily_goals tools with weekly and monthly parameters", async () => {
    const updateRes = await client.callTool({
      name: "update_daily_goals",
      arguments: {
        calories_target: 1900,
        calories_notes: "fat loss deficit",
        protein_min_grams: 65,
        weekly_workouts_target: 5,
        weekly_split_schedule: [
          { day: "Mon", title: "Push", focus: "Chest & Shoulders", isRest: false },
          { day: "Tue", title: "Pull", focus: "Back & Biceps", isRest: false },
        ],
        monthly_mesocycle_name: "Block 1",
        monthly_weight_loss_target_kg: 1.5,
      },
    });
    expect(updateRes.isError).toBeFalsy();

    const getRes = await client.callTool({
      name: "get_daily_goals",
      arguments: {},
    });
    expect(getRes.isError).toBeFalsy();
    const payload = JSON.parse(((getRes as any).content[0] as { text: string }).text);
    expect(payload.caloriesTarget).toBe(1900);
    expect(payload.proteinMinGrams).toBe(65);
    expect(payload.weeklyWorkoutsTarget).toBe(5);
    expect(payload.weeklySplitSchedule).toHaveLength(2);
    expect(payload.monthlyMesocycleName).toBe("Block 1");
    expect(payload.monthlyWeightLossTargetKg).toBe(1.5);
  });

  it("calls get_training_plans, update_training_plans, and get_recommended_plans tools", async () => {
    // 1. Test get_recommended_plans
    const recRes = await client.callTool({
      name: "get_recommended_plans",
      arguments: { plan_type: "both" },
    });
    expect(recRes.isError).toBeFalsy();
    const recPayload = JSON.parse(((recRes as any).content[0] as { text: string }).text);
    expect(recPayload.weekly.weeklyWorkoutsTarget).toBe(5);
    expect(recPayload.monthly.monthlyMesocycleName).toBeDefined();

    // 2. Test update_training_plans
    const updatePlanRes = await client.callTool({
      name: "update_training_plans",
      arguments: {
        weekly_workouts_target: 4,
        weekly_walk_minutes_target: 160,
        monthly_mesocycle_name: "Strength Peaking Block",
      },
    });
    expect(updatePlanRes.isError).toBeFalsy();

    // 3. Test get_training_plans
    const getPlanRes = await client.callTool({
      name: "get_training_plans",
      arguments: {},
    });
    expect(getPlanRes.isError).toBeFalsy();
    const planPayload = JSON.parse(((getPlanRes as any).content[0] as { text: string }).text);
    expect(planPayload.weeklyPlan.weeklyWorkoutsTarget).toBe(4);
    expect(planPayload.weeklyPlan.weeklyWalkMinutesTarget).toBe(160);
    expect(planPayload.monthlyMesocycle.monthlyMesocycleName).toBe("Strength Peaking Block");
  });

  it("calls log_natural_entry and delete_logged_entry tools via MCP", async () => {
    const logRes = await client.callTool({
      name: "log_natural_entry",
      arguments: {
        text: "I ate 4 eggs",
      },
    });
    expect(logRes.isError).toBeFalsy();
    const logPayload = JSON.parse(((logRes as any).content[0] as { text: string }).text);
    expect(logPayload.success).toBe(true);
    expect(logPayload.goals.todayCalories).toBeGreaterThan(0);
    expect(logPayload.loggedItem).toBeDefined();

    const itemId = logPayload.loggedItem.id;

    const delRes = await client.callTool({
      name: "delete_logged_entry",
      arguments: {
        item_id: itemId,
      },
    });
    expect(delRes.isError).toBeFalsy();
    const delPayload = JSON.parse(((delRes as any).content[0] as { text: string }).text);
    expect(delPayload.success).toBe(true);
  });

  it("calls calculate_nutrition tool deterministically", async () => {
    const res = await client.callTool({
      name: "calculate_nutrition",
      arguments: {
        goal: "cut",
        activity_level: "moderately_active",
      },
    });

    expect(res.isError).toBeFalsy();
    expect((res as any).content).toHaveLength(1);

    const payload = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(payload.nutrition).toBeDefined();
    expect(payload.nutrition.targetCalories).toBe(payload.nutrition.tdee - 500);
    expect(payload.nutrition.proteinGrams).toBeGreaterThan(100);
    expect(payload.nutrition.fatGrams).toBeGreaterThan(40);
  });

  it("calls get_active_workout tool", async () => {
    const res = await client.callTool({
      name: "get_active_workout",
      arguments: {},
    });

    expect(res.isError).toBeFalsy();
    const workout = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(workout.sessionId).toBeDefined();
    expect(workout.sessionName).toBeDefined();
  });

  it("calls log_workout_set tool with shorthand telemetry", async () => {
    const res = await client.callTool({
      name: "log_workout_set",
      arguments: {
        raw_input: "bench 100kg 3x5 rpe8",
        user_override: false,
      },
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.success).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed.exercise_name).toBe("bench_press");
    expect(result.parsed.load_value).toBe(100);
    expect(result.coachDirective).toBeDefined();
    expect(result.coachDirective.word_count).toBeLessThanOrEqual(30);
  });

  it("calls trigger_safety_abort tool to activate Layer 0 Hard Stop", async () => {
    const res = await client.callTool({
      name: "trigger_safety_abort",
      arguments: {
        reason: "Acute shoulder impingement flag",
      },
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.hard_stop_active).toBe(true);
    expect(result.arbitration_decision).toBe("HARD_STOP");
    expect(result.resolved_load_modifier).toBe(0.0);
  });

  it("calls generate_mesocycle tool", async () => {
    const res = await client.callTool({
      name: "generate_mesocycle",
      arguments: {
        primary_goal: "hypertrophy",
        split: "push_pull_legs",
        days_per_week: 4,
      },
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.success).toBe(true);
    expect(result.totalSessions).toBe(28);
  });

  it("calls swap_workout_order tool", async () => {
    const res = await client.callTool({
      name: "swap_workout_order",
      arguments: {},
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.success).toBe(true);
    expect(result.nowActiveSession).toBeDefined();
  });
});

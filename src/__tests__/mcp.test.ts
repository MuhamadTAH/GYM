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

  it("lists all 4 read-only resources with exact URIs", async () => {
    const res = await client.listResources();
    expect(res.resources).toHaveLength(4);

    const uris = res.resources.map((r) => r.uri);
    expect(uris).toContain("gym://profile");
    expect(uris).toContain("gym://session/active");
    expect(uris).toContain("gym://mesocycle/summary");
    expect(uris).toContain("gym://history/recent");
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

  it("lists all 6 action & state mutation tools", async () => {
    const res = await client.listTools();
    expect(res.tools).toHaveLength(6);

    const toolNames = res.tools.map((t) => t.name);
    expect(toolNames).toContain("log_workout_set");
    expect(toolNames).toContain("get_active_workout");
    expect(toolNames).toContain("trigger_safety_abort");
    expect(toolNames).toContain("calculate_nutrition");
    expect(toolNames).toContain("generate_mesocycle");
    expect(toolNames).toContain("swap_workout_order");
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

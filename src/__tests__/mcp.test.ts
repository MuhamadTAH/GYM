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

  it("lists all 7 read-only resources with exact URIs", async () => {
    const res = await client.listResources();
    expect(res.resources).toHaveLength(7);

    const uris = res.resources.map((r) => r.uri);
    expect(uris).toContain("gym://profile");
    expect(uris).toContain("gym://session/active");
    expect(uris).toContain("gym://goals");
    expect(uris).toContain("gym://history/recent");
    expect(uris).toContain("gym://mesocycle/summary");
    expect(uris).toContain("gym://briefing/today");
    expect(uris).toContain("gym://body/measurements");
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

  it("reads gym://goals resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://goals" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const goals = JSON.parse(textContent.text);
    expect(goals).toBeDefined();
    expect(goals.userId).toBeDefined();
  });

  it("reads gym://briefing/today resource correctly", async () => {
    const res = await client.readResource({ uri: "gym://briefing/today" });
    expect(res.contents).toHaveLength(1);

    const textContent = res.contents[0] as { text: string };
    const briefing = JSON.parse(textContent.text);
    expect(briefing).toBeDefined();
    expect(briefing.headline).toBeDefined();
    expect(briefing.dailyTargets).toBeDefined();
  });

  it("lists all 20 streamlined action & state mutation tools", async () => {
    const res = await client.listTools();
    expect(res.tools).toHaveLength(20);

    const toolNames = res.tools.map((t) => t.name);
    expect(toolNames).toContain("get_active_workout");
    expect(toolNames).toContain("generate_ai_workout");
    expect(toolNames).toContain("add_workout_exercise");
    expect(toolNames).toContain("update_workout_exercise");
    expect(toolNames).toContain("replace_workout_exercise");
    expect(toolNames).toContain("delete_workout_exercise");
    expect(toolNames).toContain("search_exercise_catalog");
    expect(toolNames).toContain("get_exercise_guide");
    expect(toolNames).toContain("log_workout_set");
    expect(toolNames).toContain("get_daily_goals");
    expect(toolNames).toContain("update_daily_goals");
    expect(toolNames).toContain("plan_daily_calories");
    expect(toolNames).toContain("update_today_calorie_usage");
    expect(toolNames).toContain("log_natural_entry");
    expect(toolNames).toContain("delete_logged_entry");
    expect(toolNames).toContain("update_body_measurements");
    expect(toolNames).toContain("get_body_measurements");
    expect(toolNames).toContain("submit_workout_debrief");
    expect(toolNames).toContain("update_exercise_guide");
    expect(toolNames).toContain("get_daily_calorie_report");
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

  it("calls plan_daily_calories and update_today_calorie_usage tools", async () => {
    const planRes = await client.callTool({
      name: "plan_daily_calories",
      arguments: {
        goal: "cut",
        prompt: "high protein deficit",
      },
    });
    expect(planRes.isError).toBeFalsy();
    const planPayload = JSON.parse(((planRes as any).content[0] as { text: string }).text);
    expect(planPayload.success).toBe(true);
    expect(planPayload.plan.targetCalories).toBeGreaterThan(1200);

    const usageRes = await client.callTool({
      name: "update_today_calorie_usage",
      arguments: {
        set_total_calories: 1450,
        reason: "Adjusted after dinner",
      },
    });
    expect(usageRes.isError).toBeFalsy();
    const usagePayload = JSON.parse(((usageRes as any).content[0] as { text: string }).text);
    expect(usagePayload.success).toBe(true);
    expect(usagePayload.goals.todayCalories).toBe(1450);
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

  it("calls search_exercise_catalog tool", async () => {
    const res = await client.callTool({
      name: "search_exercise_catalog",
      arguments: {
        query: "bench press",
        limit: 5,
      },
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.success).toBe(true);
    expect(result.exercises.length).toBeGreaterThan(0);
    expect(result.exercises[0].name.toLowerCase()).toContain("bench");
  });

  it("calls add_workout_exercise and update_workout_exercise tools", async () => {
    const addRes = await client.callTool({
      name: "add_workout_exercise",
      arguments: {
        exercise_name: "Incline Dumbbell Press",
        target_sets: 4,
        target_reps: 10,
        target_load: 28,
        load_unit: "kg",
        rest_seconds: 90,
        notes: "Strict 2s eccentric",
      },
    });

    expect(addRes.isError).toBeFalsy();
    const addResult = JSON.parse(((addRes as any).content[0] as { text: string }).text);
    expect(addResult.success).toBe(true);
    const addedExercise = addResult.todaysWorkout.exercises[addResult.todaysWorkout.exercises.length - 1];
    expect(addedExercise.exerciseName).toBe("Incline Dumbbell Press");

    const updateRes = await client.callTool({
      name: "update_workout_exercise",
      arguments: {
        exercise_index: addResult.todaysWorkout.exercises.length - 1,
        target_load: 30,
        notes: "Increased weight safely",
      },
    });

    expect(updateRes.isError).toBeFalsy();
    const updateResult = JSON.parse(((updateRes as any).content[0] as { text: string }).text);
    expect(updateResult.success).toBe(true);
    const updatedExercise = updateResult.todaysWorkout.exercises[addResult.todaysWorkout.exercises.length - 1];
    expect(updatedExercise.targetLoad).toBe(30);
  });

  it("calls generate_ai_workout tool", async () => {
    const res = await client.callTool({
      name: "generate_ai_workout",
      arguments: {
        prompt: "Push day chest and shoulders",
        target_minutes: 45,
      },
    });

    expect(res.isError).toBeFalsy();
    const result = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(result.success).toBe(true);
    expect(result.plan.exercises.length).toBeGreaterThan(0);
    expect(result.todaysWorkout.exercises.length).toBeGreaterThan(0);
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

  it("calls get_exercise_guide tool and returns movement animation and cues", async () => {
    const res = await client.callTool({
      name: "get_exercise_guide",
      arguments: {
        exercise_name: "bench_press",
      },
    });

    expect(res.isError).toBeFalsy();
    const guide = JSON.parse(((res as any).content[0] as { text: string }).text);
    expect(guide.name).toBe("Barbell Bench Press");
    expect(guide.animationUrl).toContain(".gif");
    expect(guide.coachingCues.length).toBeGreaterThan(0);
    expect(guide.formWarnings.length).toBeGreaterThan(0);
  });

  it("schedules, queries, and updates workout on specific date like '29 of sep'", async () => {
    const genRes = await client.callTool({
      name: "generate_ai_workout",
      arguments: {
        prompt: "5-day split Lower #1 knee-spared",
        date: "29 of sep",
      },
    });

    expect(genRes.isError).toBeFalsy();
    const genResult = JSON.parse(((genRes as any).content[0] as { text: string }).text);
    expect(genResult.success).toBe(true);
    expect(genResult.plan.exercises.length).toBeGreaterThan(0);
    expect(genResult.todaysWorkout.exercises.length).toBeGreaterThan(0);

    // Read back workout for 29 of sep using get_active_workout
    const getRes = await client.callTool({
      name: "get_active_workout",
      arguments: {
        date: "29 of sep",
      },
    });
    expect(getRes.isError).toBeFalsy();
    const getResult = JSON.parse(((getRes as any).content[0] as { text: string }).text);
    expect(getResult.exercises.length).toBeGreaterThan(0);

    // Add exercise to 29 of sep workout
    const addRes = await client.callTool({
      name: "add_workout_exercise",
      arguments: {
        exercise_name: "Barbell Squat",
        target_sets: 3,
        target_reps: 8,
        date: "29 of sep",
      },
    });
    expect(addRes.isError).toBeFalsy();
    const addResult = JSON.parse(((addRes as any).content[0] as { text: string }).text);
    expect(addResult.success).toBe(true);

    // Delete exercise from 29 of sep workout
    const delRes = await client.callTool({
      name: "delete_workout_exercise",
      arguments: {
        exercise_index: addResult.todaysWorkout.exercises.length - 1,
        date: "29 of sep",
      },
    });
    expect(delRes.isError).toBeFalsy();
  });

  it("calls update_body_measurements and get_body_measurements tools", async () => {
    const updateRes = await client.callTool({
      name: "update_body_measurements",
      arguments: {
        weight: 82.5,
        weight_goal: 78.0,
        weight_unit: "kg",
        arm_size: 38.5,
        arm_size_goal: 41.0,
        leg_size: 58.0,
        leg_size_goal: 62.0,
        waist_size: 86.0,
        waist_size_goal: 80.0,
        notes: "Morning weigh-in after fasted cardio",
      },
    });

    expect(updateRes.isError).toBeFalsy();
    const updatePayload = JSON.parse(((updateRes as any).content[0] as { text: string }).text);
    expect(updatePayload.success).toBe(true);
    expect(updatePayload.measurements.weight).toBe(82.5);
    expect(updatePayload.measurements.weightGoal).toBe(78.0);
    expect(updatePayload.measurements.armSize).toBe(38.5);
    expect(updatePayload.measurements.armSizeGoal).toBe(41.0);
    expect(updatePayload.measurements.legSize).toBe(58.0);
    expect(updatePayload.measurements.legSizeGoal).toBe(62.0);

    const getRes = await client.callTool({
      name: "get_body_measurements",
      arguments: {},
    });
    expect(getRes.isError).toBeFalsy();
    const getPayload = JSON.parse(((getRes as any).content[0] as { text: string }).text);
    expect(getPayload.latest).toBeDefined();
    expect(getPayload.latest.weight).toBe(82.5);
    expect(getPayload.latest.armSize).toBe(38.5);
    expect(getPayload.latest.armSizeGoal).toBe(41.0);
    expect(getPayload.history.length).toBeGreaterThan(0);
  });

  it("calls submit_workout_debrief tool and returns coach feedback", async () => {
    const debriefRes = await client.callTool({
      name: "submit_workout_debrief",
      arguments: {
        athlete_rating: 5,
        session_rpe: 8,
        energy_level: "high",
        muscle_soreness: "mild",
        athlete_debrief: "Chest felt phenomenal, barbell bench was smooth with great shoulder stability.",
      },
    });

    expect(debriefRes.isError).toBeFalsy();
    const debriefPayload = JSON.parse(((debriefRes as any).content[0] as { text: string }).text);
    expect(debriefPayload.success).toBe(true);
    expect(debriefPayload.athleteRating).toBe(5);
    expect(debriefPayload.coachFeedback).toBeDefined();
    expect(debriefPayload.coachFeedback.length).toBeGreaterThan(10);
  });

  it("calls update_exercise_guide tool to set benefits and instructions", async () => {
    const guideRes = await client.callTool({
      name: "update_exercise_guide",
      arguments: {
        exercise_index: 0,
        benefits: "Builds anterior deltoid and clavicular head of the pectoralis major.",
        instructions: "1. Retract scapula. 2. Lower under control for 2 seconds. 3. Explode upwards.",
      },
    });

    expect(guideRes.isError).toBeFalsy();
    const guidePayload = JSON.parse(((guideRes as any).content[0] as { text: string }).text);
    expect(guidePayload.success).toBe(true);
    expect(guidePayload.todaysWorkout.exercises[0].benefits).toContain("anterior deltoid");
    expect(guidePayload.todaysWorkout.exercises[0].instructions).toHaveLength(3);
  });

  it("calls get_daily_calorie_report tool to retrieve full macro and item breakdown", async () => {
    const reportRes = await client.callTool({
      name: "get_daily_calorie_report",
      arguments: {},
    });

    expect(reportRes.isError).toBeFalsy();
    const reportPayload = JSON.parse(((reportRes as any).content[0] as { text: string }).text);
    expect(reportPayload.date).toBeDefined();
    expect(reportPayload.dailyCalorieTarget).toBeGreaterThan(0);
    expect(reportPayload.weeklyCalorieBudget).toBe(reportPayload.dailyCalorieTarget * 7);
    expect(reportPayload.monthlyCalorieBudget).toBe(reportPayload.dailyCalorieTarget * 30);
    expect(reportPayload.caloriesUsed).toBeDefined();
    expect(reportPayload.caloriesRemaining).toBeDefined();
    expect(Array.isArray(reportPayload.loggedItems)).toBe(true);
  });

  it("swaps 1 of 5 exercises in a workout session by name or position using replace_workout_exercise", async () => {
    // 1. Generate or populate a 5-exercise workout
    await client.callTool({
      name: "generate_ai_workout",
      arguments: {
        prompt: "5-exercise upper body workout: Bench Press, Overhead Press, Incline Dumbbell Press, Tricep Pushdown, Lateral Raise",
      },
    });

    const activeRes = await client.callTool({
      name: "get_active_workout",
      arguments: {},
    });
    const activeWorkout = JSON.parse(((activeRes as any).content[0] as { text: string }).text);
    expect(activeWorkout.exercises.length).toBeGreaterThanOrEqual(1);

    // Ensure we have at least 5 exercises
    while (activeWorkout.exercises.length < 5) {
      const addRes = await client.callTool({
        name: "add_workout_exercise",
        arguments: { exercise_name: `Extra Exercise ${activeWorkout.exercises.length + 1}` },
      });
      const parsedAdd = JSON.parse(((addRes as any).content[0] as { text: string }).text);
      activeWorkout.exercises = parsedAdd.todaysWorkout.exercises;
    }

    const firstExerciseName = activeWorkout.exercises[0].exerciseName;
    const initialCount = activeWorkout.exercises.length;

    // 2. AI swaps the first exercise by its name using replace_workout_exercise
    const swapByNameRes = await client.callTool({
      name: "replace_workout_exercise",
      arguments: {
        current_exercise_name: firstExerciseName,
        new_exercise_name: "Dumbbell Bench Press",
        target_sets: 4,
        target_reps: 8,
        target_load: 32,
        load_unit: "kg",
        benefits: "Allows deeper stretch at the bottom without shoulder impingement.",
        instructions: "1. Lie flat on bench. 2. Lower dumbbells with control. 3. Press up in an arch.",
      },
    });

    expect(swapByNameRes.isError).toBeFalsy();
    const swapResult = JSON.parse(((swapByNameRes as any).content[0] as { text: string }).text);
    expect(swapResult.success).toBe(true);
    expect(swapResult.todaysWorkout.exercises).toHaveLength(initialCount);
    expect(swapResult.todaysWorkout.exercises[0].exerciseName).toBe("Dumbbell Bench Press");
    expect(swapResult.todaysWorkout.exercises[0].targetSets).toBe(4);
    expect(swapResult.todaysWorkout.exercises[0].targetReps).toBe(8);
    expect(swapResult.todaysWorkout.exercises[0].benefits).toContain("shoulder impingement");
    expect(swapResult.todaysWorkout.exercises[0].instructions).toHaveLength(3);

    // 3. AI swaps the 3rd exercise using 1-based exercise_number
    const swapByNumberRes = await client.callTool({
      name: "replace_workout_exercise",
      arguments: {
        exercise_number: 3,
        new_exercise_name: "Cable Crossover",
        target_sets: 3,
        target_reps: 15,
      },
    });

    expect(swapByNumberRes.isError).toBeFalsy();
    const numberResult = JSON.parse(((swapByNumberRes as any).content[0] as { text: string }).text);
    expect(numberResult.success).toBe(true);
    expect(numberResult.todaysWorkout.exercises[2].exerciseName).toBe("Cable Crossover");
    expect(numberResult.todaysWorkout.exercises[2].targetReps).toBe(15);

    // 4. Update exercise guide by exercise name
    const guideByNameRes = await client.callTool({
      name: "update_exercise_guide",
      arguments: {
        exercise_name: "Cable Crossover",
        benefits: "Peak contraction and tension across the entire chest range of motion.",
        instructions: "Cross hands over at full contraction for peak squeeze.",
      },
    });
    expect(guideByNameRes.isError).toBeFalsy();
    const guideResult = JSON.parse(((guideByNameRes as any).content[0] as { text: string }).text);
    expect(guideResult.success).toBe(true);
    expect(guideResult.todaysWorkout.exercises[2].benefits).toContain("Peak contraction");

    // 5. Delete an exercise by name
    const deleteByNameRes = await client.callTool({
      name: "delete_workout_exercise",
      arguments: {
        exercise_name: "Cable Crossover",
      },
    });
    expect(deleteByNameRes.isError).toBeFalsy();
    const deleteResult = JSON.parse(((deleteByNameRes as any).content[0] as { text: string }).text);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.todaysWorkout.exercises).toHaveLength(initialCount - 1);
    expect(
      deleteResult.todaysWorkout.exercises.some((e: any) => e.exerciseName === "Cable Crossover")
    ).toBe(false);
  });
});

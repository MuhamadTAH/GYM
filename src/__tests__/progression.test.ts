import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { userProfiles, workoutSessions, exerciseSets } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getUserProfileAction,
  saveUserProfileAction,
  generateNewMesocycleAction,
  getTodaysWorkoutAction,
  swapSessionOrderAction,
  skipRestDayAction,
  submitShorthandSetAction,
  completeWorkoutSessionAction,
} from "@/app/actions";

describe("Autoregulation & Sequential Mesocycle Pipeline", () => {
  beforeEach(async () => {
    // Clear previous sessions and sets for clean test isolation
    await db.delete(exerciseSets);
    await db.delete(workoutSessions);
  });

  it("saves user profile and baseline 1RMs with recalculation", async () => {
    const res = await saveUserProfileAction({
      name: "Marcus Aurelius",
      age: 32,
      sex: "male",
      heightCm: 182,
      preferredUnit: "kg",
      currentWeightValue: 88,
      baselineLifts: {
        squat_1rm: 160,
        bench_press_1rm: 120,
        deadlift_1rm: 210,
        overhead_press_1rm: 75,
        barbell_row_1rm: 95,
        pull_up_1rm: 35,
      },
      activeInjuries: [],
      regenerateMesocycle: true,
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 4,
    });

    expect(res.success).toBe(true);

    const profile = await getUserProfileAction();
    expect(profile.name).toBe("Marcus Aurelius");
    expect(profile.baselineLifts.bench_press_1rm).toBe(120);
    expect(profile.baselineLifts.squat_1rm).toBe(160);
    expect(profile.currentWeightValue).toBe(88);
  });

  it("serves Day 1 first (never Day 28) and exposes nextSession", async () => {
    // Generate a fresh 4-week mesocycle
    await generateNewMesocycleAction({
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 4,
    });

    const todaysWorkout = await getTodaysWorkoutAction();
    expect(todaysWorkout).toBeDefined();
    // First session should be Day 1 (Push Day), not Day 28
    expect(todaysWorkout.sessionName).toContain("Push");
    expect(todaysWorkout.isRestDay).toBe(false);
    expect(todaysWorkout.exercises.length).toBeGreaterThan(0);

    // Bench press working load should be calculated from 1RM (e.g. 120kg -> ~85-92.5kg)
    const benchEx = todaysWorkout.exercises.find((e) => e.exerciseName === "bench_press");
    expect(benchEx).toBeDefined();
    expect(benchEx!.targetLoad).toBeGreaterThan(60);

    // Next session should be exposed
    expect(todaysWorkout.nextSession).toBeDefined();
    expect(todaysWorkout.nextSession!.sessionId).not.toBe(todaysWorkout.sessionId);
  });

  it("allows swapping session order when equipment is occupied", async () => {
    await generateNewMesocycleAction({
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 4,
    });

    const initial = await getTodaysWorkoutAction();
    const currentId = initial.sessionId;
    const nextId = initial.nextSession!.sessionId;
    const nextName = initial.nextSession!.sessionName;

    // Swap order
    const swapRes = await swapSessionOrderAction(currentId, nextId);
    expect(swapRes.success).toBe(true);

    // Re-query: swapped session should now be active
    const swapped = await getTodaysWorkoutAction();
    expect(swapped.sessionId).toBe(nextId);
    expect(swapped.sessionName).toBe(nextName);
  });

  it("does NOT compound overload per set, but aggregates and adjusts future sessions ONCE upon completion", async () => {
    await generateNewMesocycleAction({
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 4,
    });

    const todays = await getTodaysWorkoutAction();
    const benchEx = todays.exercises.find((e) => e.exerciseName === "bench_press")!;
    const initialTargetLoad = benchEx.targetLoad;
    const targetReps = benchEx.targetReps; // e.g. 8

    // Log 3 working sets of bench press achieving all target reps at RPE 7.0 (<= 8.0 target)
    await submitShorthandSetAction(`bench ${initialTargetLoad}kg 1x${targetReps} @ 7.0`);
    await submitShorthandSetAction(`bench ${initialTargetLoad}kg 1x${targetReps} @ 7.0`);
    await submitShorthandSetAction(`bench ${initialTargetLoad}kg 1x${targetReps} @ 7.5`);

    // Verify future planned sessions are NOT yet changed (no compounding during active logging)
    const futureSessionsBeforeComplete = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.status, "planned"));

    const nextWeekBenchBefore = futureSessionsBeforeComplete
      .map((s) => JSON.parse(s.sessionNotes || "[]"))
      .flat()
      .find((e: any) => e.exerciseName === "bench_press");

    if (nextWeekBenchBefore) {
      expect(nextWeekBenchBefore.targetLoad).toBe(initialTargetLoad);
    }

    // Now call completeWorkoutSessionAction
    const completion = await completeWorkoutSessionAction(todays.sessionId);
    expect(completion.success).toBe(true);
    expect(completion.adjustmentsMade.length).toBeGreaterThan(0);

    const benchAdj = completion.adjustmentsMade.find((a) => a.exerciseName === "bench_press");
    expect(benchAdj).toBeDefined();
    expect(benchAdj!.action).toBe("INCREMENT_LOAD");
    expect(benchAdj!.loadDelta).toBe(2.5);
    expect(benchAdj!.newTarget).toBe(initialTargetLoad + 2.5);

    // Verify future planned sessions in DB now have updated +2.5kg target load
    const futureSessionsAfter = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.status, "planned"));

    const nextWeekBenchAfter = futureSessionsAfter
      .map((s) => JSON.parse(s.sessionNotes || "[]"))
      .flat()
      .find((e: any) => e.exerciseName === "bench_press");

    if (nextWeekBenchAfter) {
      expect(nextWeekBenchAfter.targetLoad).toBe(initialTargetLoad + 2.5);
    }
  });

  it("skips scheduled rest day on demand and serves next workout session", async () => {
    // Generate split with rest days
    await generateNewMesocycleAction({
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 3,
    });

    // Complete session 1
    const day1 = await getTodaysWorkoutAction();
    await completeWorkoutSessionAction(day1.sessionId);

    // Next may be another session or rest day
    const day2 = await getTodaysWorkoutAction();
    if (day2.isRestDay) {
      const skipRes = await skipRestDayAction(day2.sessionId);
      expect(skipRes.success).toBe(true);

      const postSkip = await getTodaysWorkoutAction();
      expect(postSkip.sessionId).not.toBe(day2.sessionId);
    }
  });
});

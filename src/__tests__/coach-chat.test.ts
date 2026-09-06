import { describe, it, expect } from "vitest";
import { generateCoachResponse, type CoachContext } from "@/lib/coach-chat";
import { sendCoachMessageAction, getUserProfileAction, getTodaysWorkoutAction } from "@/app/actions";
import { db } from "@/db";
import { exerciseSets } from "@/db/schema";
import { eq } from "drizzle-orm";

const mockContext: CoachContext = {
  profile: {
    id: "user-123",
    name: "Marcus Aurelius",
    age: 32,
    sex: "male",
    heightCm: 182,
    preferredUnit: "kg",
    currentWeightValue: 88,
    trainingAge: "intermediate",
    coldStartActive: false,
    baselineLifts: {
      squat_1rm: 160,
      bench_press_1rm: 120,
      deadlift_1rm: 210,
      overhead_press_1rm: 75,
      barbell_row_1rm: 95,
      pull_up_1rm: 35,
    },
    activeInjuries: [],
    isUnconfigured: false,
  },
  activeWorkout: {
    sessionId: "sess-123",
    sessionName: "Pull Day (W1D2)",
    sessionType: "pull",
    status: "in_progress",
    isRestDay: false,
    weekNumber: 1,
    dayIndex: 2,
    exercises: [
      {
        exerciseName: "deadlift",
        movementPattern: "hip_hinge",
        targetLoad: 150,
        loadUnit: "kg",
        targetSets: 3,
        targetReps: 6,
        targetRpe: 7.5,
        restSeconds: 180,
      },
    ],
    nextSession: {
      sessionId: "sess-124",
      sessionName: "Push Day (W1D1)",
      sessionType: "push",
      isRestDay: false,
      exerciseCount: 2,
    },
  },
};

describe("AI Coach Conversational Engine", () => {
  it("answers queries about today's prescribed workout", () => {
    const res = generateCoachResponse("What is my workout today?", mockContext);
    expect(res.replyText).toContain("PULL DAY");
    expect(res.replyText).toContain("DEADLIFT");
    expect(res.replyText).toContain("150kg");
    expect(res.actionReceipt?.type).toBe("WORKOUT_INFO");
  });

  it("calculates exact nutrition macros when asked about cutting", () => {
    const res = generateCoachResponse("What are my macros for cutting?", mockContext);
    expect(res.replyText).toContain("Daily Nutrition Plan for CUT");
    expect(res.replyText).toContain("Protein:");
    expect(res.actionReceipt?.type).toBe("NUTRITION_INFO");
    expect(res.actionReceipt?.data.targetCalories).toBeLessThan(res.actionReceipt?.data.tdee);
  });

  it("returns athlete 1RMs and strength baselines", () => {
    const res = generateCoachResponse("Show my 1RMs", mockContext);
    expect(res.replyText).toContain("Squat: 160kg");
    expect(res.replyText).toContain("Bench Press: 120kg");
    expect(res.replyText).toContain("Deadlift: 210kg");
    expect(res.actionReceipt?.type).toBe("PROFILE_INFO");
  });

  it("detects acute pain and activates emergency hard-stop", () => {
    const res = generateCoachResponse("I have sharp knee pain on this squat!", mockContext);
    expect(res.replyText).toContain("EMERGENCY HARD-STOP TRIGGERED");
    expect(res.actionReceipt?.type).toBe("SAFETY_ABORT");
    expect(res.actionReceipt?.badgeColor).toBe("red");
    expect(res.suggestedAction?.type).toBe("safety_abort");
  });

  it("detects shorthand logging commands and prepares action dispatch", () => {
    const res = generateCoachResponse("log bench 100kg 3x5 rpe8", mockContext);
    expect(res.replyText).toContain("Logged set: BENCH PRESS");
    expect(res.actionReceipt?.type).toBe("SET_LOGGED");
    expect(res.suggestedAction?.type).toBe("log_set");
  });

  it("handles workout swapping intent when equipment is occupied", () => {
    const res = generateCoachResponse("Can I swap with next session?", mockContext);
    expect(res.replyText).toContain("Pull Day (W1D2)");
    expect(res.actionReceipt?.type).toBe("SWAP_ORDER");
    expect(res.suggestedAction?.type).toBe("swap_session");
  });

  it("end-to-end sendCoachMessageAction persists set into gym.db", async () => {
    const res = await sendCoachMessageAction("bench 100kg 1x5 @ 8.0", true);
    expect(res.replyText).toBeDefined();
    expect(res.actionReceipt?.type).toBe("SET_LOGGED");
    expect(res.executedAction?.type).toBe("log_set");
    expect(res.executedAction?.success).toBe(true);

    // Verify written to database
    const sets = await db.select().from(exerciseSets).where(eq(exerciseSets.exerciseName, "bench_press"));
    expect(sets.length).toBeGreaterThan(0);
  });
});

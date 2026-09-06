import { db } from "../src/db";
import { userProfiles, workoutSessions, exerciseSets, coachMessages } from "../src/db/schema";

async function reset() {
  console.log("=== RESETTING GYM.DB TO FRESH ZERO STATE ===");

  // 1. Delete all mock logs, messages, and workout sessions
  await db.delete(exerciseSets);
  console.log("Cleared exercise_sets: 0 rows");

  await db.delete(coachMessages);
  console.log("Cleared coach_messages: 0 rows");

  await db.delete(workoutSessions);
  console.log("Cleared workout_sessions: 0 rows");

  await db.delete(userProfiles);
  console.log("Cleared user_profiles");

  // 2. Insert clean, zeroed initial user profile (unconfigured)
  const freshUserId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(userProfiles).values({
    id: freshUserId,
    name: "Athlete",
    email: "user@gym.local",
    age: 0,
    sex: "male",
    heightCm: 0,
    preferredUnit: "kg",
    currentWeightValue: 0,
    currentWeightUnit: "kg",
    sevenDayWeightMedian: 0,
    coldStartActive: true,
    coldStartDaysRemaining: 14,
    trainingAge: "novice",
    rawWeightHistory: [],
    baselineLifts: {
      squat_1rm: 0,
      bench_press_1rm: 0,
      deadlift_1rm: 0,
      overhead_press_1rm: 0,
      barbell_row_1rm: 0,
      pull_up_1rm: 0,
    },
    activeInjuries: [],
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Initialized fresh user profile: ${freshUserId} (All 1RMs and weights set to ZERO)`);
  console.log("=== DATABASE RESET COMPLETE ===");
}

reset().catch(console.error);

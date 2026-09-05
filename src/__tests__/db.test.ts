import { describe, it, expect } from "vitest";
import { db } from "../db/index";
import { userProfiles, workoutSessions, exerciseSets } from "../db/schema";
import { eq } from "drizzle-orm";

describe("Drizzle SQLite Database Persistence (gym.db)", () => {
  const testUserId = crypto.randomUUID();
  const testSessionId = crypto.randomUUID();
  const testSetId = crypto.randomUUID();

  it("should insert and retrieve a user profile with typed JSON sub-arrays", async () => {
    const newUser = {
      id: testUserId,
      name: "Atlas Test",
      email: "atlas@test.local",
      age: 29,
      sex: "male" as const,
      heightCm: 181,
      preferredUnit: "kg" as const,
      currentWeightValue: 85.0,
      currentWeightUnit: "kg" as const,
      sevenDayWeightMedian: 84.8,
      coldStartActive: false,
      coldStartDaysRemaining: 0,
      bodyFatPercentage: 15.0,
      trainingAge: "advanced",
      rawWeightHistory: [
        {
          timestamp: new Date().toISOString(),
          value: 85.0,
          unit: "kg" as const,
          is_outlier: false,
        },
      ],
      baselineLifts: {
        squat_1rm: 160,
        bench_press_1rm: 120,
        deadlift_1rm: 200,
        overhead_press_1rm: 80,
        barbell_row_1rm: 100,
        pull_up_1rm: 40,
      },
      activeInjuries: [
        {
          anatomical_site: "Left Knee",
          severity: "tendon_strain" as const,
          blacklisted_movement_patterns: ["deep_squat"],
          safe_substitutes: ["box_squat"],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(userProfiles).values(newUser);

    const retrieved = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, testUserId));

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].name).toBe("Atlas Test");
    expect(retrieved[0].preferredUnit).toBe("kg");
    expect(retrieved[0].activeInjuries.length).toBe(1);
    expect(retrieved[0].activeInjuries[0].anatomical_site).toBe("Left Knee");
    expect(retrieved[0].baselineLifts.bench_press_1rm).toBe(120);
  });

  it("should insert and query a workout session with arbitration modifiers", async () => {
    const session = {
      id: testSessionId,
      userId: testUserId,
      sessionName: "Leg Day A",
      sessionType: "lower",
      status: "in_progress" as const,
      startedAt: new Date().toISOString(),
      elapsedMinutes: 40,
      arbitrationHardStop: false,
      arbitrationDecision: "DOWN_REGULATE" as const,
      resolvedLoadModifier: 0.9,
      resolvedVolumeModifier: 0.85,
      activeDownRegulations: [
        {
          source_layer: 3,
          factor: "High CNS fatigue score",
          recommended_action: "reduce_load" as const,
          magnitude_pct: 10,
        },
      ],
      userOverrideActive: false,
    };

    await db.insert(workoutSessions).values(session);

    const retrieved = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, testSessionId));

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].sessionName).toBe("Leg Day A");
    expect(retrieved[0].resolvedLoadModifier).toBe(0.9);
    expect(retrieved[0].activeDownRegulations.length).toBe(1);
    expect(retrieved[0].activeDownRegulations[0].recommended_action).toBe("reduce_load");
  });

  it("should insert and query an exercise set with human override flags", async () => {
    const set = {
      id: testSetId,
      sessionId: testSessionId,
      exerciseId: crypto.randomUUID(),
      exerciseName: "Barbell Squat",
      movementPattern: "quad_dominant",
      setNumber: 1,
      setType: "working",
      loadValue: 140.0,
      loadUnit: "kg" as const,
      reps: 5,
      targetReps: 5,
      targetRpe: 8.0,
      loggedRpe: 8.5,
      rir: 1.5,
      restSeconds: 180,
      hasAcutePain: false,
      userOverrideActive: true,
      userOverrideNotes: "Athlete pushed through to match previous week",
      completedAt: new Date().toISOString(),
    };

    await db.insert(exerciseSets).values(set);

    const retrieved = await db
      .select()
      .from(exerciseSets)
      .where(eq(exerciseSets.id, testSetId));

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].exerciseName).toBe("Barbell Squat");
    expect(retrieved[0].loadValue).toBe(140.0);
    expect(retrieved[0].userOverrideActive).toBe(true);
    expect(retrieved[0].userOverrideNotes).toContain("Athlete pushed through");
  });
});

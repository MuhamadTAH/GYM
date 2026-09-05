import { describe, it, expect } from "vitest";
import { generateDeterministicMesocycle } from "../lib/planner";
import type { BaselineLifts, ActiveInjury } from "../schemas/fitness";

describe("Deterministic Mesocycle & Session Generator (/src/lib/planner.ts)", () => {
  const sampleLifts: BaselineLifts = {
    squat_1rm: 140,
    bench_press_1rm: 100,
    deadlift_1rm: 180,
    overhead_press_1rm: 60,
    barbell_row_1rm: 80,
    pull_up_1rm: 30,
  };

  it("should generate a 4-week mesocycle with calculated loads and rep targets", () => {
    const mesocycle = generateDeterministicMesocycle({
      userId: crypto.randomUUID(),
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 4,
      preferredUnit: "kg",
      bodyWeightKg: 80,
      baselineLifts: sampleLifts,
      coldStartActive: false,
    });

    expect(mesocycle.totalWeeks).toBe(4);
    expect(mesocycle.sessions.length).toBe(28); // 4 weeks * 7 days

    const workoutSessions = mesocycle.sessions.filter((s) => !s.isRestDay);
    expect(workoutSessions.length).toBe(16); // 4 days * 4 weeks

    // Check first session (Push Day: bench_press and overhead_press)
    const firstSession = workoutSessions[0];
    expect(firstSession.exercises.length).toBeGreaterThan(0);

    const bench = firstSession.exercises.find((e) => e.exerciseName === "bench_press");
    expect(bench).toBeDefined();
    // 100kg 1RM * 0.72 = 72kg -> rounded to nearest 2.5kg = 72.5kg
    expect(bench?.targetLoad).toBe(72.5);
    expect(bench?.targetReps).toBe(8);
    expect(bench?.targetRpe).toBe(7.5);
    expect(bench?.loadUnit).toBe("kg");
  });

  it("should calculate higher intensity and lower reps for strength goal", () => {
    const mesocycle = generateDeterministicMesocycle({
      userId: crypto.randomUUID(),
      primaryGoal: "strength",
      split: "upper_lower",
      daysPerWeek: 4,
      preferredUnit: "kg",
      bodyWeightKg: 80,
      baselineLifts: sampleLifts,
      coldStartActive: false,
    });

    const firstSession = mesocycle.sessions.find((s) => !s.isRestDay)!;
    const bench = firstSession.exercises.find((e) => e.exerciseName === "bench_press");

    // 100kg 1RM * 0.82 = 82kg -> rounded = 82.5kg
    expect(bench?.targetLoad).toBe(82.5);
    expect(bench?.targetReps).toBe(5);
    expect(bench?.targetRpe).toBe(8.5);
  });

  it("should NEVER generate contraindicated movements when active injury is flagged", () => {
    const kneeInjury: ActiveInjury = {
      anatomical_site: "Left Patella",
      severity: "tendon_strain",
      blacklisted_movement_patterns: ["squat", "quad_dominant"],
      safe_substitutes: ["box_squat"],
    };

    const mesocycle = generateDeterministicMesocycle({
      userId: crypto.randomUUID(),
      primaryGoal: "hypertrophy",
      split: "push_pull_legs",
      daysPerWeek: 3,
      preferredUnit: "kg",
      bodyWeightKg: 80,
      baselineLifts: sampleLifts,
      activeInjuries: [kneeInjury],
      coldStartActive: false,
    });

    // Check all exercises in all sessions: 'squat' must NEVER appear, must be substituted with 'box_squat'
    for (const session of mesocycle.sessions) {
      for (const exercise of session.exercises) {
        expect(exercise.exerciseName).not.toBe("squat");
      }
    }

    const legDay = mesocycle.sessions.find((s) => s.sessionType === "legs");
    expect(legDay).toBeDefined();
    const hasBoxSquat = legDay?.exercises.some((e) => e.exerciseName === "box_squat");
    expect(hasBoxSquat).toBe(true);
  });

  it("should apply Layer 0 baseline loads capped at RPE 6-7 during cold start", () => {
    const mesocycle = generateDeterministicMesocycle({
      userId: crypto.randomUUID(),
      primaryGoal: "strength",
      split: "upper_lower",
      daysPerWeek: 4,
      preferredUnit: "kg",
      bodyWeightKg: 80,
      baselineLifts: sampleLifts,
      coldStartActive: true, // Cold start active!
    });

    const firstSession = mesocycle.sessions.find((s) => !s.isRestDay)!;
    for (const exercise of firstSession.exercises) {
      expect(exercise.targetRpe).toBeLessThanOrEqual(7.0);
      expect(exercise.notes).toContain("Cold start");
    }

    const bench = firstSession.exercises.find((e) => e.exerciseName === "bench_press");
    // Under cold start: 100kg * 0.62 = 62kg -> 62.5kg
    expect(bench?.targetLoad).toBe(62.5);
    expect(bench?.targetRpe).toBe(6.5);
  });

  it("should support imperial 'lb' units properly", () => {
    const imperialLifts: BaselineLifts = {
      squat_1rm: 315,
      bench_press_1rm: 225,
      deadlift_1rm: 405,
      overhead_press_1rm: 135,
      barbell_row_1rm: 185,
      pull_up_1rm: 45,
    };

    const mesocycle = generateDeterministicMesocycle({
      userId: crypto.randomUUID(),
      primaryGoal: "hypertrophy",
      split: "upper_lower",
      daysPerWeek: 4,
      preferredUnit: "lb",
      bodyWeightKg: 85,
      baselineLifts: imperialLifts,
      coldStartActive: false,
    });

    const firstSession = mesocycle.sessions.find((s) => !s.isRestDay)!;
    const bench = firstSession.exercises.find((e) => e.exerciseName === "bench_press");
    expect(bench?.loadUnit).toBe("lb");
    // 225 * 0.72 = 162 -> rounded to nearest 5lb step = 160 or 165
    expect(bench?.targetLoad).toBe(160);
  });
});

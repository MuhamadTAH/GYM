import { describe, it, expect } from "vitest";
import {
  getExerciseGuide,
  getAllExerciseGuides,
  normalizeExerciseName,
  EXERCISE_DATABASE,
} from "@/lib/exercises-data";

describe("Exercise Animation & Form Guide Engine", () => {
  it("normalizes common exercise names accurately", () => {
    expect(normalizeExerciseName("Barbell Bench Press")).toBe("bench_press");
    expect(normalizeExerciseName("Dumbbell Flat Bench Press")).toBe("dumbbell_bench_press");
    expect(normalizeExerciseName("Barbell Full Squat")).toBe("squat");
    expect(normalizeExerciseName("box_squat")).toBe("box_squat");
    expect(normalizeExerciseName("Romanian Deadlift")).toBe("romanian_deadlift");
    expect(normalizeExerciseName("Overhead Press 1RM")).toBe("overhead_press");
    expect(normalizeExerciseName("Barbell Bent Over Row")).toBe("barbell_row");
    expect(normalizeExerciseName("Weighted Pull-Up")).toBe("pull_up");
    expect(normalizeExerciseName("Dumbbell Lateral Raise")).toBe("dumbbell_lateral_raise");
    expect(normalizeExerciseName("Cable Tricep Pushdown")).toBe("cable_pushdown");
  });

  it("retrieves full exercise guide for Bench Press with GIF, cues and warnings", () => {
    const guide = getExerciseGuide("bench_press");

    expect(guide).toBeDefined();
    expect(guide.name).toBe("Barbell Bench Press");
    expect(guide.targetMuscle).toContain("Pectorals");
    expect(guide.equipment).toBe("barbell");
    expect(guide.animationUrl).toContain(".gif");
    expect(guide.animationUrl).toContain("hasaneyldrm/exercises-dataset");
    expect(guide.thumbnailUrl).toContain(".jpg");

    // Coaching cues
    expect(guide.coachingCues.length).toBeGreaterThan(1);
    expect(guide.coachingCues.some((c) => c.toLowerCase().includes("eccentric"))).toBe(true);

    // Form breakdown warnings
    expect(guide.formWarnings.length).toBeGreaterThan(1);
    expect(guide.formWarnings.some((w) => w.toLowerCase().includes("bounc"))).toBe(true);
  });

  it("retrieves full exercise guide for Barbell Full Squat", () => {
    const guide = getExerciseGuide("squat");

    expect(guide.name).toBe("Barbell Full Squat");
    expect(guide.targetMuscle).toContain("Quadriceps");
    expect(guide.animationUrl).toBe(
      "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0043-qXTaZnJ.gif"
    );
    expect(guide.coachingCues.some((c) => c.toLowerCase().includes("knees out"))).toBe(true);
    expect(guide.formWarnings.some((w) => w.toLowerCase().includes("knee cave"))).toBe(true);
  });

  it("retrieves full exercise guide for Deadlift", () => {
    const guide = getExerciseGuide("deadlift");

    expect(guide.name).toBe("Barbell Deadlift");
    expect(guide.targetMuscle).toContain("Posterior Chain");
    expect(guide.animationUrl).toBe(
      "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0032-ila4NZS.gif"
    );
    expect(guide.coachingCues.some((c) => c.toLowerCase().includes("slack"))).toBe(true);
  });

  it("retrieves full exercise guide for Pull-up", () => {
    const guide = getExerciseGuide("pull_up");

    expect(guide.name).toBe("Pull-Up");
    expect(guide.targetMuscle).toContain("Latissimus");
    expect(guide.equipment).toBe("body weight");
    expect(guide.animationUrl).toBe(
      "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-lBDjFxJ.gif"
    );
    expect(guide.coachingCues.some((c) => c.toLowerCase().includes("scapulae"))).toBe(true);
    expect(guide.formWarnings.some((w) => w.toLowerCase().includes("kipping"))).toBe(true);
  });

  it("retrieves full exercise guide for Dumbbell Lateral Raise", () => {
    const guide = getExerciseGuide("dumbbell_lateral_raise");

    expect(guide.name).toBe("Dumbbell Lateral Raise");
    expect(guide.targetMuscle).toContain("Lateral Deltoid");
    expect(guide.animationUrl).toBe(
      "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-DsgkuIt.gif"
    );
    expect(guide.coachingCues.some((c) => c.toLowerCase().includes("elbows"))).toBe(true);
    expect(guide.formWarnings.some((w) => w.toLowerCase().includes("swinging"))).toBe(true);
  });

  it("provides fallback guide for uncataloged movements gracefully", () => {
    const guide = getExerciseGuide("incline_cable_flye");

    expect(guide).toBeDefined();
    expect(guide.name).toBe("Incline Cable Flye");
    expect(guide.animationUrl).toBeDefined();
    expect(guide.coachingCues.length).toBeGreaterThan(0);
    expect(guide.formWarnings.length).toBeGreaterThan(0);
  });

  it("returns all cataloged exercises in array format", () => {
    const all = getAllExerciseGuides();
    expect(all.length).toBe(Object.keys(EXERCISE_DATABASE).length);
    expect(all.every((e) => Boolean(e.name && e.animationUrl && e.targetMuscle))).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  searchExerciseCatalog,
  findCatalogExercise,
  getAllCatalogExercises,
  mapExerciseToMovementPattern,
} from "../lib/exercise-catalog";
import {
  generateFallbackWorkoutPlan,
  generateWorkoutWithAI,
} from "../lib/ai-workout-generator";

describe("Exercise Catalog (876 Exercises from GitHub)", () => {
  it("loads the full catalog with 876 exercises", () => {
    const all = getAllCatalogExercises();
    expect(all.length).toBe(876);
  });

  it("searches exercises by keyword accurately", () => {
    const benches = searchExerciseCatalog("bench press");
    expect(benches.length).toBeGreaterThan(0);
    expect(benches[0].name.toLowerCase()).toContain("bench");

    const squats = searchExerciseCatalog("squat");
    expect(squats.length).toBeGreaterThan(0);
    expect(squats[0].name.toLowerCase()).toContain("squat");
  });

  it("filters exercises by primary or secondary muscle", () => {
    const chestExercises = searchExerciseCatalog("", { muscle: "chest", limit: 10 });
    expect(chestExercises.length).toBeGreaterThan(0);
    for (const ex of chestExercises) {
      const hasChest =
        ex.primaryMuscles.includes("chest") || ex.secondaryMuscles.includes("chest");
      expect(hasChest).toBe(true);
    }
  });

  it("filters exercises by equipment", () => {
    const dumbbellExercises = searchExerciseCatalog("", { equipment: "dumbbell", limit: 10 });
    expect(dumbbellExercises.length).toBeGreaterThan(0);
    for (const ex of dumbbellExercises) {
      expect(ex.equipment?.toLowerCase()).toContain("dumbbell");
    }
  });

  it("finds exercise by ID or exact name", () => {
    const ex = findCatalogExercise("barbell bench press - medium grip");
    expect(ex).toBeDefined();
    if (ex) {
      expect(ex.name.toLowerCase()).toContain("bench press");
    }
  });

  it("maps exercises to correct physiological movement pattern", () => {
    const bench = searchExerciseCatalog("bench press")[0];
    if (bench) {
      const pattern = mapExerciseToMovementPattern(bench);
      expect(["horizontal_push", "isolation"]).toContain(pattern);
    }

    const squat = searchExerciseCatalog("barbell squat")[0];
    if (squat) {
      const pattern = mapExerciseToMovementPattern(squat);
      expect(["quad_dominant", "isolation"]).toContain(pattern);
    }
  });
});

describe("AI Workout Generator", () => {
  it("generates a balanced Push workout from prompt", () => {
    const plan = generateFallbackWorkoutPlan({ prompt: "Push day chest and shoulders" });
    expect(plan.sessionType).toBe("push");
    expect(plan.exercises.length).toBeGreaterThanOrEqual(4);
    expect(plan.exercises[0].exerciseName).toBeDefined();
    expect(plan.exercises[0].targetSets).toBeGreaterThan(0);
    expect(plan.exercises[0].targetReps).toBeGreaterThan(0);
  });

  it("generates a balanced Pull workout from prompt", () => {
    const plan = generateFallbackWorkoutPlan({ prompt: "Back and biceps pull workout" });
    expect(plan.sessionType).toBe("pull");
    expect(plan.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it("generates a balanced Legs workout from prompt", () => {
    const plan = generateFallbackWorkoutPlan({ prompt: "Heavy quad and hamstring leg day" });
    expect(plan.sessionType).toBe("legs");
    expect(plan.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it("generates a balanced Core workout from prompt", () => {
    const plan = generateFallbackWorkoutPlan({ prompt: "Abs and core burner" });
    expect(plan.sessionType).toBe("core");
    expect(plan.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it("supports user preferred units (lb)", () => {
    const plan = generateFallbackWorkoutPlan({ prompt: "Full body", preferredUnit: "lb" });
    expect(plan.exercises[0].loadUnit).toBe("lb");
  });

  it("generates plan via generateWorkoutWithAI cleanly", async () => {
    const plan = await generateWorkoutWithAI({ prompt: "Upper body dumbbell blast" });
    expect(plan).toBeDefined();
    expect(plan.exercises.length).toBeGreaterThan(0);
    expect(["gemini", "catalog_engine"]).toContain(plan.source);
  });
});

describe("AI Workout Server Actions", () => {
  it("executes generateWorkoutWithAIAction and updates active session", async () => {
    const { generateWorkoutWithAIAction } = await import("../app/actions");
    const res = await generateWorkoutWithAIAction({ prompt: "Push day chest and shoulders" });
    expect(res.success).toBe(true);
    expect(res.plan.exercises.length).toBeGreaterThan(0);
    expect(res.todaysWorkout.exercises.length).toBeGreaterThan(0);
  });

  it("adds an exercise to today's active workout", async () => {
    const { addExerciseToWorkoutAction } = await import("../app/actions");
    const res = await addExerciseToWorkoutAction({
      exerciseName: "Incline Dumbbell Press",
      targetSets: 4,
      targetReps: 10,
      targetLoad: 24,
    });
    expect(res.success).toBe(true);
    const added = res.todaysWorkout.exercises.find((e) =>
      e.exerciseName.toLowerCase().includes("incline")
    );
    expect(added).toBeDefined();
  });

  it("deletes an exercise by index from today's active workout", async () => {
    const { deleteWorkoutExerciseAction, getTodaysWorkoutAction } = await import("../app/actions");
    const initial = await getTodaysWorkoutAction();
    const initialCount = initial.exercises.length;
    expect(initialCount).toBeGreaterThan(0);

    const res = await deleteWorkoutExerciseAction(initialCount - 1);
    expect(res.success).toBe(true);
    expect(res.todaysWorkout.exercises.length).toBe(initialCount - 1);
  });

  it("searches catalog exercises via server action", async () => {
    const { searchExerciseCatalogAction } = await import("../app/actions");
    const res = await searchExerciseCatalogAction("squat", { limit: 5 });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].name.toLowerCase()).toContain("squat");
  });
});

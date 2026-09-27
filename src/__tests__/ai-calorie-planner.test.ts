import { describe, it, expect, beforeAll } from "vitest";
import {
  planDailyCaloriesWithAIAction,
  updateTodayCalorieUsageAction,
  updateWorkoutExerciseAction,
  addExerciseToWorkoutAction,
  getTodaysWorkoutAction,
  getDailyGoalsAction,
  resetDailyTrackingAction,
} from "@/app/actions";
import { resolveExerciseName } from "@/lib/exercise-catalog";
import {
  generateFallbackCaloriePlan,
  planDailyCaloriesWithAI,
} from "@/lib/ai-calorie-planner";

describe("Exercise Name Resolution Engine (Catalog vs Custom)", () => {
  it("resolves catalog exercises to their standardized name from 876-exercise package", () => {
    // Exact or alias match in the package
    const resolvedBench = resolveExerciseName("bench press");
    expect(resolvedBench.fromCatalog).toBe(true);
    expect(resolvedBench.standardizedName).toBe("Barbell Bench Press - Medium Grip");

    const resolvedIncline = resolveExerciseName("incline dumbbell press");
    expect(resolvedIncline.fromCatalog).toBe(true);
    expect(resolvedIncline.standardizedName).toBe("Incline Dumbbell Press");

    const resolvedSquat = resolveExerciseName("barbell squat");
    expect(resolvedSquat.fromCatalog).toBe(true);
    expect(resolvedSquat.standardizedName).toContain("Squat");
  });

  it("accepts and writes custom exercise name if not found in catalog without errors", () => {
    const customName = "Super Special Calisthenics Push 3000";
    const resolvedCustom = resolveExerciseName(customName);
    expect(resolvedCustom.fromCatalog).toBe(false);
    expect(resolvedCustom.standardizedName).toBe(customName);

    const emptyFallback = resolveExerciseName("   ");
    expect(emptyFallback.standardizedName).toBe("Custom Exercise");
  });
});

describe("AI Calorie & Macro Target Planning Engine", () => {
  it("calculates accurate BMR, TDEE, macros, and meal splits with sports science fallback", () => {
    const cutPlan = generateFallbackCaloriePlan({
      weightKg: 80,
      heightCm: 180,
      ageYears: 26,
      sex: "male",
      goal: "cut",
      activityLevel: "moderately_active",
    });

    expect(cutPlan.bmr).toBeGreaterThanOrEqual(1700);
    expect(cutPlan.tdee).toBeGreaterThan(cutPlan.bmr);
    // Cut should be below TDEE
    expect(cutPlan.targetCalories).toBeLessThan(cutPlan.tdee);
    expect(cutPlan.proteinGrams).toBeGreaterThanOrEqual(Math.round(80 * 1.8));
    expect(cutPlan.fatGrams).toBeGreaterThanOrEqual(40);
    expect(cutPlan.carbGrams).toBeGreaterThan(0);
    expect(cutPlan.mealSplitSuggestions.length).toBe(4);
    expect(cutPlan.mealSplitSuggestions[0].calories).toBeGreaterThan(0);
  });

  it("calculates surplus calories for bulking goal", () => {
    const bulkPlan = generateFallbackCaloriePlan({
      weightKg: 70,
      heightCm: 175,
      ageYears: 22,
      sex: "female",
      goal: "bulk",
      activityLevel: "very_active",
    });

    expect(bulkPlan.targetCalories).toBeGreaterThan(bulkPlan.tdee);
    expect(bulkPlan.proteinGrams).toBeGreaterThanOrEqual(Math.round(70 * 1.6));
  });

  it("generates a full plan via planDailyCaloriesWithAI", async () => {
    const plan = await planDailyCaloriesWithAI({
      weightKg: 75,
      heightCm: 178,
      ageYears: 30,
      sex: "male",
      goal: "maintain",
      activityLevel: "moderately_active",
      prompt: "High protein, Mediterranean style",
    });

    expect(plan.targetCalories).toBeGreaterThan(1500);
    expect(plan.proteinGrams).toBeGreaterThan(100);
    expect(plan.explanation).toBeDefined();
    expect(plan.mealSplitSuggestions.length).toBeGreaterThan(0);
  });
});

describe("Server Actions: Calorie Planning & Direct Usage Updating", () => {
  beforeAll(async () => {
    await resetDailyTrackingAction();
  });

  it("plans calories and updates daily targets in the database", async () => {
    const res = await planDailyCaloriesWithAIAction({
      weightKg: 85,
      heightCm: 182,
      ageYears: 28,
      sex: "male",
      goal: "cut",
      activityLevel: "moderately_active",
      saveToDailyGoals: true,
    });

    expect(res.success).toBe(true);
    expect(res.plan).toBeDefined();
    expect(res.goals?.caloriesTarget).toBe(res.plan?.targetCalories);
    expect(res.goals?.proteinMinGrams).toBe(res.plan?.proteinGrams);

    const liveGoals = await getDailyGoalsAction();
    expect(liveGoals.caloriesTarget).toBe(res.plan?.targetCalories);
  });

  it("updates today calorie usage directly and calculates remaining calories", async () => {
    const updateRes = await updateTodayCalorieUsageAction({
      consumedCalories: 1450,
      proteinGrams: 110,
      carbsGrams: 150,
      fatGrams: 45,
      notes: "Lunch + Dinner combo update",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.goals?.todayCalories).toBe(1450);
    expect(updateRes.goals?.todayProtein).toBe(110);
    const caloriesRemaining =
      (updateRes.goals?.caloriesTarget || 0) - (updateRes.goals?.todayCalories || 0);
    expect(caloriesRemaining).toBe(
      (updateRes.goals?.caloriesTarget || 0) - 1450
    );

    // Verify logged item was recorded in today's items
    const foodItem = updateRes.goals?.todayLoggedItems.find((i) =>
      i.name.includes("Lunch + Dinner combo update")
    );
    expect(foodItem).toBeDefined();
    expect(foodItem?.calories).toBe(1450);
  });
});

describe("Server Actions: Workout Exercise Updating with Catalog Name Resolution", () => {
  it("adds an exercise to today's workout and updates its parameters", async () => {
    // 1. Add exercise
    const addRes = await addExerciseToWorkoutAction({
      exerciseName: "lat pulldown",
      targetSets: 3,
      targetReps: 10,
      targetLoad: 60,
      loadUnit: "kg",
    });

    expect(addRes.success).toBe(true);
    const addedEx = addRes.todaysWorkout.exercises.find((e) =>
      e.exerciseName.toLowerCase().includes("lat pulldown")
    );
    expect(addedEx).toBeDefined();
    expect(addedEx?.exerciseName).toContain("Lat Pulldown");

    const exIndex = addRes.todaysWorkout.exercises.indexOf(addedEx!);

    // 2. Update the exercise with custom parameters
    const updateRes = await updateWorkoutExerciseAction({
      exerciseIndex: exIndex,
      exerciseName: "Barbell Bench Press - Medium Grip",
      targetSets: 4,
      targetReps: 8,
      targetLoad: 85,
      loadUnit: "kg",
      restSeconds: 120,
      notes: "Heavy working sets with 2s pause",
    });

    expect(updateRes.success).toBe(true);
    const updatedEx = updateRes.todaysWorkout.exercises[exIndex];
    expect(updatedEx.exerciseName).toBe("Barbell Bench Press - Medium Grip");
    expect(updatedEx.targetSets).toBe(4);
    expect(updatedEx.targetReps).toBe(8);
    expect(updatedEx.targetLoad).toBe(85);
    expect(updatedEx.restSeconds).toBe(120);
    expect(updatedEx.notes).toBe("Heavy working sets with 2s pause");
  });

  it("updates exercise with custom name not in catalog gracefully", async () => {
    const workout = await getTodaysWorkoutAction();
    expect(workout.exercises.length).toBeGreaterThan(0);

    const updateRes = await updateWorkoutExerciseAction({
      exerciseIndex: 0,
      exerciseName: "Custom Athletic Cable Woodchopper",
      targetSets: 3,
      targetReps: 15,
      targetLoad: 25,
      loadUnit: "kg",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.todaysWorkout.exercises[0].exerciseName).toBe(
      "Custom Athletic Cable Woodchopper"
    );
  });
});

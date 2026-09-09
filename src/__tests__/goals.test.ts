import { describe, it, expect, beforeEach } from "vitest";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logDailyMetricAction,
  resetDailyTrackingAction,
  clearAllGoalsAction,
} from "../app/actions";

describe("Athlete Daily Goals & Habits Engine", () => {
  beforeEach(async () => {
    await clearAllGoalsAction();
  });

  it("returns unconfigured / null targets initially with zero prefill", async () => {
    const goals = await getDailyGoalsAction();
    expect(goals.caloriesTarget).toBeNull();
    expect(goals.caloriesNotes).toBeNull();
    expect(goals.proteinMinGrams).toBeNull();
    expect(goals.proteinMaxGrams).toBeNull();
    expect(goals.proteinNotes).toBeNull();
    expect(goals.waterMinLiters).toBeNull();
    expect(goals.waterMaxLiters).toBeNull();
    expect(goals.waterNotes).toBeNull();
    expect(goals.dailyWalkMinMinutes).toBeNull();
    expect(goals.dailyWalkMaxMinutes).toBeNull();
    expect(goals.dailyWalkNotes).toBeNull();
    expect(goals.trainingDaysPerWeek).toBeNull();
    expect(goals.trainingNotes).toBeNull();
    expect(goals.todayCalories).toBe(0);
    expect(goals.todayProtein).toBe(0);
    expect(goals.todayWaterLiters).toBe(0);
    expect(goals.todayWalkMinutes).toBe(0);
    expect(goals.todayTrainingCompleted).toBe(false);
  });

  it("saves custom athlete goals and strategic notes accurately", async () => {
    const res = await saveDailyGoalsAction({
      caloriesTarget: 1900,
      caloriesNotes: "maintains your fat-loss deficit",
      proteinMinGrams: 60,
      proteinMaxGrams: 70,
      proteinNotes: "4 eggs + chicken breast + family staples",
      waterMinLiters: 3.0,
      waterMaxLiters: 3.5,
      waterNotes: "3.0 to 3.5 Liters daily",
      dailyWalkMinMinutes: 20,
      dailyWalkMaxMinutes: 30,
      dailyWalkNotes: "keeps metabolic rate active outside the gym",
      trainingDaysPerWeek: 5,
      trainingNotes:
        "Complete prescribed session, stopping all sets at technical failure (zero swinging, zero knee/back pain)",
    });

    expect(res.success).toBe(true);
    expect(res.goals.caloriesTarget).toBe(1900);
    expect(res.goals.caloriesNotes).toBe("maintains your fat-loss deficit");
    expect(res.goals.proteinMinGrams).toBe(60);
    expect(res.goals.proteinMaxGrams).toBe(70);
    expect(res.goals.proteinNotes).toBe("4 eggs + chicken breast + family staples");
    expect(res.goals.waterMinLiters).toBe(3.0);
    expect(res.goals.waterMaxLiters).toBe(3.5);
    expect(res.goals.dailyWalkMinMinutes).toBe(20);
    expect(res.goals.dailyWalkMaxMinutes).toBe(30);
    expect(res.goals.dailyWalkNotes).toBe("keeps metabolic rate active outside the gym");
    expect(res.goals.trainingDaysPerWeek).toBe(5);
    expect(res.goals.trainingNotes).toContain("stopping all sets at technical failure");
  });

  it("logs and increments today's metrics dynamically", async () => {
    await saveDailyGoalsAction({
      caloriesTarget: 2000,
      proteinMinGrams: 100,
      waterMinLiters: 3.0,
      dailyWalkMinMinutes: 30,
      trainingDaysPerWeek: 4,
    });

    // Add calories (+500, then +250)
    await logDailyMetricAction({ metric: "calories", value: 500, mode: "add" });
    const step1 = await logDailyMetricAction({ metric: "calories", value: 250, mode: "add" });
    expect(step1.goals.todayCalories).toBe(750);

    // Add protein (+30g)
    const step2 = await logDailyMetricAction({ metric: "protein", value: 30, mode: "add" });
    expect(step2.goals.todayProtein).toBe(30);

    // Add water (+0.5L)
    const step3 = await logDailyMetricAction({ metric: "water", value: 0.5, mode: "add" });
    expect(step3.goals.todayWaterLiters).toBe(0.5);

    // Add walk minutes (+15m)
    const step4 = await logDailyMetricAction({ metric: "walk", value: 15, mode: "add" });
    expect(step4.goals.todayWalkMinutes).toBe(15);

    // Toggle workout completed
    const step5 = await logDailyMetricAction({ metric: "training", value: true, mode: "set" });
    expect(step5.goals.todayTrainingCompleted).toBe(true);
  });

  it("resets today's intake numbers while preserving targets and notes", async () => {
    await saveDailyGoalsAction({
      caloriesTarget: 1900,
      caloriesNotes: "fat loss deficit",
      waterMinLiters: 3.0,
    });

    await logDailyMetricAction({ metric: "calories", value: 1200, mode: "add" });
    await logDailyMetricAction({ metric: "water", value: 2.0, mode: "add" });
    await logDailyMetricAction({ metric: "training", value: true, mode: "set" });

    const resetRes = await resetDailyTrackingAction();
    expect(resetRes.success).toBe(true);
    expect(resetRes.goals.todayCalories).toBe(0);
    expect(resetRes.goals.todayWaterLiters).toBe(0);
    expect(resetRes.goals.todayTrainingCompleted).toBe(false);

    // Targets must remain intact
    expect(resetRes.goals.caloriesTarget).toBe(1900);
    expect(resetRes.goals.caloriesNotes).toBe("fat loss deficit");
    expect(resetRes.goals.waterMinLiters).toBe(3.0);
  });

  it("clears all goals completely back to blank unconfigured state", async () => {
    await saveDailyGoalsAction({
      caloriesTarget: 1900,
      proteinMinGrams: 70,
    });

    const clearRes = await clearAllGoalsAction();
    expect(clearRes.success).toBe(true);
    expect(clearRes.goals.caloriesTarget).toBeNull();
    expect(clearRes.goals.proteinMinGrams).toBeNull();
  });
});

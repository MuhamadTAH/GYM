import { describe, it, expect } from "vitest";
import { calculateMacroTargets } from "../lib/nutrition";

describe("Metabolic & Macro Partitioning Engine (/src/lib/nutrition.ts)", () => {
  const baseUser = {
    weightKg: 80,
    heightCm: 180,
    ageYears: 25,
    sex: "male" as const,
    activityLevel: "moderately_active" as const,
  };

  it("should calculate 'cut' macro targets correctly with 2.2g/kg protein and deficit", () => {
    const result = calculateMacroTargets({
      ...baseUser,
      goal: "cut",
    });

    expect(result).toBeDefined();
    if (!result) return;

    // BMR: 1805, TDEE: 2798
    expect(result.bmr).toBe(1805);
    expect(result.tdee).toBe(2798);

    // Cut deficit: min(500, 2798 * 0.2 = 559) = 500
    expect(result.calorieDelta).toBe(-500);
    expect(result.targetCalories).toBe(2298);

    // Protein: 80 * 2.2 = 176g
    expect(result.proteinGrams).toBe(176);
    // Fat: 80 * 0.8 = 64g
    expect(result.fatGrams).toBe(64);

    // Protein calories: 176 * 4 = 704
    // Fat calories: 64 * 9 = 576
    // Remaining calories: 2298 - 1280 = 1018
    // Carbs: 1018 / 4 = 254.5 -> 255g
    expect(result.carbGrams).toBe(255);
  });

  it("should calculate 'bulk' targets correctly with +300 kcal surplus and 2.0g/kg protein", () => {
    const result = calculateMacroTargets({
      ...baseUser,
      goal: "bulk",
    });

    expect(result).toBeDefined();
    if (!result) return;

    expect(result.calorieDelta).toBe(300);
    expect(result.targetCalories).toBe(2798 + 300);

    // Protein: 80 * 2.0 = 160g
    expect(result.proteinGrams).toBe(160);
    // Fat: 80 * 0.9 = 72g
    expect(result.fatGrams).toBe(72);
    expect(result.carbGrams).toBeGreaterThan(300);
  });

  it("should calculate 'maintain' targets correctly with TDEE and 1.8g/kg protein", () => {
    const result = calculateMacroTargets({
      ...baseUser,
      goal: "maintain",
    });

    expect(result).toBeDefined();
    if (!result) return;

    expect(result.calorieDelta).toBe(0);
    expect(result.targetCalories).toBe(result.tdee);

    // Protein: 80 * 1.8 = 144g
    expect(result.proteinGrams).toBe(144);
    // Fat: 80 * 0.8 = 64g
    expect(result.fatGrams).toBe(64);
  });

  it("should respect 20% max deficit cap on low TDEE users", () => {
    const smallUser = {
      weightKg: 50,
      heightCm: 155,
      ageYears: 30,
      sex: "female" as const,
      activityLevel: "sedentary" as const,
      goal: "cut" as const,
    };

    const result = calculateMacroTargets(smallUser);
    expect(result).toBeDefined();
    if (!result) return;

    // Deficit should not exceed 20% of TDEE
    const maxAllowedDeficit = Math.round(result.tdee * 0.2);
    expect(Math.abs(result.calorieDelta)).toBeLessThanOrEqual(maxAllowedDeficit);
  });

  it("should enforce minimum safety calorie floor of 1200 kcal", () => {
    const tinyUser = {
      weightKg: 35,
      heightCm: 140,
      ageYears: 40,
      sex: "female" as const,
      activityLevel: "sedentary" as const,
      goal: "cut" as const,
    };

    const result = calculateMacroTargets(tinyUser);
    expect(result).toBeDefined();
    if (!result) return;

    expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
  });

  it("should return null for invalid inputs", () => {
    expect(
      calculateMacroTargets({
        ...baseUser,
        weightKg: -80,
        goal: "cut",
      })
    ).toBeNull();
  });
});

import {
  calculateMifflinStJeorBMR,
  calculateTDEE,
  type ActivityLevel,
} from "./math";

export type { ActivityLevel };

export type NutritionGoal = "cut" | "bulk" | "maintain";

export interface NutritionCalculatorParams {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female" | "other";
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}

export interface MacroBreakdown {
  bmr: number;
  tdee: number;
  targetCalories: number;
  calorieDelta: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
  proteinCalories: number;
  fatCalories: number;
  carbCalories: number;
  proteinPct: number;
  fatPct: number;
  carbPct: number;
}

/**
 * Calculates deterministic macro partitioning and caloric targets
 */
export function calculateMacroTargets(
  params: NutritionCalculatorParams
): MacroBreakdown | null {
  const { weightKg, heightCm, ageYears, sex, activityLevel, goal } = params;

  if (
    weightKg <= 0 ||
    heightCm <= 0 ||
    ageYears <= 0 ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(ageYears)
  ) {
    return null;
  }

  const bmr = calculateMifflinStJeorBMR({ weightKg, heightCm, ageYears, sex });
  if (!bmr) return null;

  const tdee = calculateTDEE(bmr, activityLevel);
  if (!tdee) return null;

  let targetCalories: number;
  let calorieDelta: number;
  let proteinPerKg: number;
  let fatPerKg: number;

  switch (goal) {
    case "cut": {
      // 500 kcal deficit capped at 20% of TDEE
      const maxDeficit = Math.round(tdee * 0.2);
      calorieDelta = -Math.min(500, maxDeficit);
      targetCalories = tdee + calorieDelta;
      proteinPerKg = 2.2;
      fatPerKg = 0.8;
      break;
    }
    case "bulk": {
      calorieDelta = 300;
      targetCalories = tdee + calorieDelta;
      proteinPerKg = 2.0;
      fatPerKg = 0.9;
      break;
    }
    case "maintain":
    default: {
      calorieDelta = 0;
      targetCalories = tdee;
      proteinPerKg = 1.8;
      fatPerKg = 0.8;
      break;
    }
  }

  // Safety floor
  targetCalories = Math.max(1200, targetCalories);

  // Macro calculations
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const fatGrams = Math.round(weightKg * fatPerKg);

  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;

  const remainingCalories = Math.max(
    0,
    targetCalories - (proteinCalories + fatCalories)
  );
  const carbGrams = Math.round(remainingCalories / 4);
  const carbCalories = carbGrams * 4;

  const totalEffectiveCalories = proteinCalories + fatCalories + carbCalories;

  const proteinPct = Math.round((proteinCalories / totalEffectiveCalories) * 100);
  const fatPct = Math.round((fatCalories / totalEffectiveCalories) * 100);
  const carbPct = Math.round((carbCalories / totalEffectiveCalories) * 100);

  return {
    bmr,
    tdee,
    targetCalories,
    calorieDelta,
    proteinGrams,
    fatGrams,
    carbGrams,
    proteinCalories,
    fatCalories,
    carbCalories,
    proteinPct,
    fatPct,
    carbPct,
  };
}

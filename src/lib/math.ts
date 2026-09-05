import type { PreferredUnit } from "../schemas/fitness";

/**
 * ============================================================================
 * DETERMINISTIC MATH ENGINE
 * LAW: The LLM must NEVER perform arithmetic for 1RMs, calories, or overload.
 * All computations here are strictly deterministic and mathematically bounded.
 * ============================================================================
 */

export interface OneRepMaxResult {
  estimated1RM: number;
  formula: "brzycki" | "wathan";
  cappedAt30Reps: boolean;
}

/**
 * Brzycki 1RM formula:
 * 1RM = weight * (36 / (37 - reps))
 *
 * Strict boundary safety:
 * - reps === 1 returns exact weight.
 * - reps <= 0 or weight <= 0 or invalid inputs return null.
 * - reps > 30 is capped at 30 to prevent physiological distortion & division by zero.
 */
export function calculateBrzycki1RM(
  weight: number,
  reps: number
): number | null {
  if (
    typeof weight !== "number" ||
    typeof reps !== "number" ||
    !Number.isFinite(weight) ||
    !Number.isFinite(reps) ||
    weight <= 0 ||
    reps <= 0
  ) {
    return null;
  }

  // Exact 1-rep load
  if (reps === 1) {
    return Math.round(weight * 10) / 10;
  }

  // Cap reps at 30 to prevent divergence and division by zero (at reps=37)
  const boundedReps = Math.min(reps, 30);
  const raw1RM = weight * (36 / (37 - boundedReps));

  return Math.round(raw1RM * 10) / 10;
}

/**
 * Wathan 1RM formula:
 * 1RM = (100 * weight) / (48.8 + 53.8 * e^(-0.075 * reps))
 *
 * Strict boundary safety:
 * - reps === 1 returns exact weight.
 * - reps <= 0 or weight <= 0 or invalid inputs return null.
 * - reps > 30 is capped at 30.
 */
export function calculateWathan1RM(
  weight: number,
  reps: number
): number | null {
  if (
    typeof weight !== "number" ||
    typeof reps !== "number" ||
    !Number.isFinite(weight) ||
    !Number.isFinite(reps) ||
    weight <= 0 ||
    reps <= 0
  ) {
    return null;
  }

  if (reps === 1) {
    return Math.round(weight * 10) / 10;
  }

  const boundedReps = Math.min(reps, 30);
  const denominator = 48.8 + 53.8 * Math.exp(-0.075 * boundedReps);
  const raw1RM = (100 * weight) / denominator;

  return Math.round(raw1RM * 10) / 10;
}

/**
 * Deterministic BMR (Basal Metabolic Rate) via the Mifflin-St Jeor equation.
 */
export interface BMRParams {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female" | "other";
}

export function calculateMifflinStJeorBMR(params: BMRParams): number | null {
  const { weightKg, heightCm, ageYears, sex } = params;

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

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

  let bmr: number;
  if (sex === "male") {
    bmr = base + 5;
  } else if (sex === "female") {
    bmr = base - 161;
  } else {
    bmr = base - 78; // neutral midpoint
  }

  return Math.round(bmr);
}

/**
 * Deterministic TDEE (Total Daily Energy Expenditure).
 */
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel
): number | null {
  if (bmr <= 0 || !Number.isFinite(bmr)) {
    return null;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Progressive Overload Step-Loading Calculator:
 * Increments strictly by +2.5kg or +5lb when criteria are met:
 * (completedReps >= targetReps AND rpe <= targetRpe)
 */
export interface OverloadEvaluationParams {
  currentLoad: number;
  unit: PreferredUnit;
  completedReps: number;
  targetReps: number;
  loggedRpe: number;
  targetRpe?: number; // default: 8.0
}

export interface OverloadEvaluationResult {
  qualifies: boolean;
  action: "INCREMENT_LOAD" | "MAINTAIN_LOAD" | "DOWN_REGULATE_LOAD";
  loadDelta: number;
  nextPrescribedLoad: number;
  reason: string;
}

export function calculateProgressiveOverload(
  params: OverloadEvaluationParams
): OverloadEvaluationResult {
  const {
    currentLoad,
    unit,
    completedReps,
    targetReps,
    loggedRpe,
    targetRpe = 8.0,
  } = params;

  const step = unit === "kg" ? 2.5 : 5.0;

  // Case 1: Overload Threshold Met
  // Completed all target reps with RPE at or below target
  if (completedReps >= targetReps && loggedRpe <= targetRpe) {
    return {
      qualifies: true,
      action: "INCREMENT_LOAD",
      loadDelta: step,
      nextPrescribedLoad: Math.round((currentLoad + step) * 10) / 10,
      reason: `All ${targetReps} reps achieved at RPE ${loggedRpe} <= ${targetRpe}. Micro-loading +${step}${unit}.`,
    };
  }

  // Case 2: Significant Miss or Excessive Fatigue
  // e.g. missed reps by 2 or more, or RPE hit 10 failure
  if (completedReps <= targetReps - 2 || loggedRpe >= 9.5) {
    const downStep = -step;
    const nextLoad = Math.max(0, Math.round((currentLoad + downStep) * 10) / 10);
    return {
      qualifies: false,
      action: "DOWN_REGULATE_LOAD",
      loadDelta: downStep,
      nextPrescribedLoad: nextLoad,
      reason: `Missed target reps (${completedReps}/${targetReps}) or RPE at limit (${loggedRpe}). Down-regulating -${step}${unit}.`,
    };
  }

  // Case 3: Maintain Load
  return {
    qualifies: false,
    action: "MAINTAIN_LOAD",
    loadDelta: 0,
    nextPrescribedLoad: currentLoad,
    reason: `Reps achieved (${completedReps}/${targetReps}) at RPE ${loggedRpe}. Maintain current load for consolidation.`,
  };
}

/**
 * Volume Load (Tonnage) Calculator
 */
export function calculateTonnage(
  sets: Array<{ loadValue: number; reps: number }>
): number {
  return sets.reduce((sum, set) => {
    if (set.loadValue > 0 && set.reps > 0) {
      return sum + set.loadValue * set.reps;
    }
    return sum;
  }, 0);
}

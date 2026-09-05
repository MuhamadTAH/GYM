import type {
  PreferredUnit,
  MovementPattern,
  BaselineLifts,
  ActiveInjury,
} from "../schemas/fitness";

export type PlannerGoal = "hypertrophy" | "strength" | "recomposition";
export type SplitType = "push_pull_legs" | "upper_lower" | "full_body";

export interface PlannerInput {
  userId: string;
  primaryGoal: PlannerGoal;
  split: SplitType;
  daysPerWeek: number; // 3 to 6
  preferredUnit: PreferredUnit;
  bodyWeightKg: number;
  baselineLifts: BaselineLifts;
  activeInjuries?: ActiveInjury[];
  coldStartActive?: boolean;
}

export interface PlannedExercise {
  exerciseName: string;
  movementPattern: MovementPattern;
  targetLoad: number;
  loadUnit: PreferredUnit;
  targetSets: number;
  targetReps: number;
  targetRpe: number;
  restSeconds: number;
  notes?: string;
}

export interface PlannedWorkoutSession {
  id: string;
  dayIndex: number; // 1 to 28
  weekNumber: number; // 1 to 4
  dayOfWeek: number; // 1 to 7
  sessionName: string;
  sessionType: string;
  isRestDay: boolean;
  exercises: PlannedExercise[];
}

export interface PlannedMesocycle {
  id: string;
  userId: string;
  primaryGoal: PlannerGoal;
  split: SplitType;
  totalWeeks: number;
  daysPerWeek: number;
  coldStartActive: boolean;
  sessions: PlannedWorkoutSession[];
}

interface ExerciseTemplate {
  name: string;
  pattern: MovementPattern;
  liftKey?: keyof BaselineLifts;
  baseReps: { strength: number; hypertrophy: number; recomposition: number };
  baseSets: { strength: number; hypertrophy: number; recomposition: number };
  restSeconds: number;
}

const EXERCISE_CATALOG: Record<string, ExerciseTemplate> = {
  squat: {
    name: "squat",
    pattern: "quad_dominant",
    liftKey: "squat_1rm",
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 4, hypertrophy: 3, recomposition: 3 },
    restSeconds: 180,
  },
  bench_press: {
    name: "bench_press",
    pattern: "horizontal_push",
    liftKey: "bench_press_1rm",
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 4, hypertrophy: 3, recomposition: 3 },
    restSeconds: 150,
  },
  deadlift: {
    name: "deadlift",
    pattern: "hip_hinge",
    liftKey: "deadlift_1rm",
    baseReps: { strength: 4, hypertrophy: 6, recomposition: 5 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 180,
  },
  overhead_press: {
    name: "overhead_press",
    pattern: "vertical_push",
    liftKey: "overhead_press_1rm",
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  },
  barbell_row: {
    name: "barbell_row",
    pattern: "horizontal_pull",
    liftKey: "barbell_row_1rm",
    baseReps: { strength: 5, hypertrophy: 10, recomposition: 8 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  },
  pull_up: {
    name: "pull_up",
    pattern: "vertical_pull",
    liftKey: "pull_up_1rm",
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  },
  box_squat: {
    name: "box_squat",
    pattern: "quad_dominant",
    liftKey: "squat_1rm",
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 150,
  },
  dumbbell_bench_press: {
    name: "dumbbell_bench_press",
    pattern: "horizontal_push",
    liftKey: "bench_press_1rm",
    baseReps: { strength: 6, hypertrophy: 10, recomposition: 8 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  },
  romanian_deadlift: {
    name: "romanian_deadlift",
    pattern: "hip_hinge",
    liftKey: "deadlift_1rm",
    baseReps: { strength: 6, hypertrophy: 10, recomposition: 8 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  },
  neutral_grip_dumbbell_press: {
    name: "neutral_grip_dumbbell_press",
    pattern: "vertical_push",
    liftKey: "overhead_press_1rm",
    baseReps: { strength: 6, hypertrophy: 10, recomposition: 8 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 90,
  },
};

/**
 * Split template definitions
 */
const SPLIT_DAYS: Record<
  SplitType,
  Array<{ name: string; type: string; exercises: string[] }>
> = {
  push_pull_legs: [
    {
      name: "Push Day",
      type: "push",
      exercises: ["bench_press", "overhead_press"],
    },
    {
      name: "Pull Day",
      type: "pull",
      exercises: ["deadlift", "barbell_row", "pull_up"],
    },
    {
      name: "Leg Day",
      type: "legs",
      exercises: ["squat", "romanian_deadlift"],
    },
  ],
  upper_lower: [
    {
      name: "Upper Body",
      type: "upper",
      exercises: ["bench_press", "barbell_row", "overhead_press", "pull_up"],
    },
    {
      name: "Lower Body",
      type: "lower",
      exercises: ["squat", "deadlift"],
    },
  ],
  full_body: [
    {
      name: "Full Body A",
      type: "full_body",
      exercises: ["squat", "bench_press", "barbell_row"],
    },
    {
      name: "Full Body B",
      type: "full_body",
      exercises: ["deadlift", "overhead_press", "pull_up"],
    },
  ],
};

/**
 * Calculates working load from 1RM based on goal and cold start
 */
function calculateTargetLoad(
  oneRepMax: number,
  goal: PlannerGoal,
  coldStart: boolean,
  unit: PreferredUnit
): { load: number; rpe: number } {
  if (oneRepMax <= 0) {
    // If no 1RM is logged, provide safe empty baseline
    return { load: unit === "kg" ? 40 : 95, rpe: 6 };
  }

  let intensity = 0.72;
  let targetRpe = 7.5;

  if (coldStart) {
    // Cold-start acclimatization: capped at RPE 6-7, reduced load
    intensity = 0.62;
    targetRpe = 6.5;
  } else if (goal === "strength") {
    intensity = 0.82;
    targetRpe = 8.5;
  } else if (goal === "hypertrophy") {
    intensity = 0.72;
    targetRpe = 7.5;
  } else {
    // Recomposition
    intensity = 0.75;
    targetRpe = 8.0;
  }

  // Round to nearest 2.5kg or 5lb increment
  const step = unit === "kg" ? 2.5 : 5.0;
  const rawLoad = oneRepMax * intensity;
  const rounded = Math.max(step, Math.round(rawLoad / step) * step);

  return { load: rounded, rpe: targetRpe };
}

/**
 * Checks for contraindications against active injuries and substitutes if needed
 */
function resolveSafeExercise(
  candidateName: string,
  activeInjuries: ActiveInjury[] = []
): ExerciseTemplate {
  const candidate = EXERCISE_CATALOG[candidateName] || {
    name: candidateName,
    pattern: "isolation" as MovementPattern,
    baseReps: { strength: 5, hypertrophy: 8, recomposition: 6 },
    baseSets: { strength: 3, hypertrophy: 3, recomposition: 3 },
    restSeconds: 120,
  };

  if (activeInjuries.length === 0) {
    return candidate;
  }

  // Check if candidate matches any blacklisted movement pattern or name
  for (const injury of activeInjuries) {
    const isBlacklisted = injury.blacklisted_movement_patterns.some(
      (bp) =>
        bp.toLowerCase() === candidate.name.toLowerCase() ||
        bp.toLowerCase() === candidate.pattern.toLowerCase() ||
        candidate.name.toLowerCase().includes(bp.toLowerCase())
    );

    if (isBlacklisted) {
      // Find a safe substitute from the injury's prescribed substitutes
      for (const subName of injury.safe_substitutes) {
        const cleanSubName = subName.toLowerCase().replace(/\s+/g, "_");
        if (EXERCISE_CATALOG[cleanSubName]) {
          return EXERCISE_CATALOG[cleanSubName];
        }
      }
      // Fallback: if squat is blacklisted, try box_squat
      if (candidate.name === "squat" && EXERCISE_CATALOG["box_squat"]) {
        return EXERCISE_CATALOG["box_squat"];
      }
    }
  }

  return candidate;
}

/**
 * Generates a deterministic 4-week structured mesocycle
 */
export function generateDeterministicMesocycle(input: PlannerInput): PlannedMesocycle {
  const {
    userId,
    primaryGoal,
    split,
    daysPerWeek,
    preferredUnit,
    baselineLifts,
    activeInjuries = [],
    coldStartActive = false,
  } = input;

  const totalWeeks = 4;
  const splitTemplates = SPLIT_DAYS[split] || SPLIT_DAYS.upper_lower;
  const boundedDaysPerWeek = Math.min(6, Math.max(3, daysPerWeek));

  const sessions: PlannedWorkoutSession[] = [];
  let templateIndex = 0;

  for (let week = 1; week <= totalWeeks; week++) {
    for (let day = 1; day <= 7; day++) {
      const dayIndex = (week - 1) * 7 + day;
      const isWorkoutDay = day <= boundedDaysPerWeek;

      if (!isWorkoutDay) {
        sessions.push({
          id: crypto.randomUUID(),
          dayIndex,
          weekNumber: week,
          dayOfWeek: day,
          sessionName: "Active Recovery / Rest",
          sessionType: "rest",
          isRestDay: true,
          exercises: [],
        });
        continue;
      }

      // Workout Day
      const currentTemplate = splitTemplates[templateIndex % splitTemplates.length];
      templateIndex++;

      const exercises: PlannedExercise[] = currentTemplate.exercises.map(
        (candidateName) => {
          // Check contraindications and substitute safely
          const resolvedTemplate = resolveSafeExercise(
            candidateName,
            activeInjuries
          );

          // Calculate 1RM working load
          const oneRepMax = resolvedTemplate.liftKey
            ? baselineLifts[resolvedTemplate.liftKey]
            : 0;

          // Progressive week-by-week wave loading (+2.5kg or 5lb each week if week > 1 and not cold start)
          const weekMultiplier =
            !coldStartActive && week > 1 ? 1 + (week - 1) * 0.025 : 1.0;
          const adjusted1RM = oneRepMax * weekMultiplier;

          const { load, rpe } = calculateTargetLoad(
            adjusted1RM,
            primaryGoal,
            coldStartActive,
            preferredUnit
          );

          return {
            exerciseName: resolvedTemplate.name,
            movementPattern: resolvedTemplate.pattern,
            targetLoad: load,
            loadUnit: preferredUnit,
            targetSets: resolvedTemplate.baseSets[primaryGoal] || 3,
            targetReps: resolvedTemplate.baseReps[primaryGoal] || 8,
            targetRpe: rpe,
            restSeconds: resolvedTemplate.restSeconds,
            notes: coldStartActive
              ? "Cold start: Focus on movement quality & RPE cap."
              : `Week ${week} mesocycle progression.`,
          };
        }
      );

      sessions.push({
        id: crypto.randomUUID(),
        dayIndex,
        weekNumber: week,
        dayOfWeek: day,
        sessionName: `${currentTemplate.name} (W${week}D${day})`,
        sessionType: currentTemplate.type,
        isRestDay: false,
        exercises,
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    userId,
    primaryGoal,
    split,
    totalWeeks,
    daysPerWeek: boundedDaysPerWeek,
    coldStartActive,
    sessions,
  };
}

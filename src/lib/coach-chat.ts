import { parseGymShorthand, type ParsedShorthand } from "./parser";
import { resolveArbitration, type ArbitrationResult } from "./arbitration";
import { calculateMacroTargets, type MacroBreakdown, type NutritionGoal } from "./nutrition";
import type { TodaysWorkoutView, UserProfileView } from "@/app/actions";

export interface CoachActionReceipt {
  type: "SET_LOGGED" | "WORKOUT_INFO" | "NUTRITION_INFO" | "SAFETY_ABORT" | "SWAP_ORDER" | "PROFILE_INFO" | "COACH_ADVICE";
  summary: string;
  badgeColor: "emerald" | "amber" | "red" | "indigo" | "zinc";
  data?: any;
}

export interface CoachChatResponse {
  replyText: string;
  actionReceipt?: CoachActionReceipt;
  suggestedAction?: {
    type: "log_set" | "safety_abort" | "swap_session" | "recalculate_mesocycle";
    payload?: any;
  };
}

export interface CoachContext {
  profile: UserProfileView;
  activeWorkout: TodaysWorkoutView;
  recentSets?: Array<{
    exerciseName: string;
    loadValue: number;
    loadUnit: string;
    reps: number;
    loggedRpe?: number | null;
  }>;
}

/**
 * Deterministic AI Coach conversational engine with intent detection and action dispatch
 */
export function generateCoachResponse(
  message: string,
  context: CoachContext
): CoachChatResponse {
  const cleanMsg = message.trim();
  const lower = cleanMsg.toLowerCase();

  // 1. INTENT: Acute Safety / Emergency Hard-Stop
  if (
    lower.includes("abort") ||
    lower.includes("sharp pain") ||
    lower.includes("pain") ||
    lower.includes("hurt") ||
    lower.includes("injured") ||
    lower.includes("emergency stop") ||
    lower.includes("joint pain")
  ) {
    const site = lower.includes("knee")
      ? "knee"
      : lower.includes("shoulder")
      ? "shoulder"
      : lower.includes("back")
      ? "lower_back"
      : "joint";

    return {
      replyText: `🚨 EMERGENCY HARD-STOP TRIGGERED. Cease the movement immediately and safely rack the weight. Load modifier reduced to 0.0 to prevent musculoskeletal trauma. Flagged site: ${site.toUpperCase()}. Do not attempt further heavy loading today.`,
      actionReceipt: {
        type: "SAFETY_ABORT",
        summary: `Layer 0 Hard-Stop: Acute ${site} pain flag`,
        badgeColor: "red",
        data: { site, severity: 10 },
      },
      suggestedAction: {
        type: "safety_abort",
        payload: { reason: `Acute pain detected in chat: ${site}` },
      },
    };
  }

  // 2. INTENT: Natural Greetings & Casual Conversation
  if (
    lower.match(/^(hi|hello|hey|yo|sup|good morning|good evening|howdy|what's up|whats up)\b/) ||
    lower === "hello" ||
    lower === "hi" ||
    lower === "hey"
  ) {
    const w = context.activeWorkout;
    const sessionDetail = w.isRestDay
      ? "Today is a scheduled Rest & Recovery day"
      : `Today we have ${w.sessionName}: ${w.exercises.map((e) => `${e.exerciseName.replace(/_/g, " ")} (${e.targetLoad}${e.loadUnit})`).join(", ")}`;

    return {
      replyText: `Hey ${context.profile.name}! Good to see you. ${sessionDetail}. How are you feeling today, or what would you like to focus on?`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: "Coach Active",
        badgeColor: "emerald",
      },
    };
  }

  // 3. INTENT: Swap Workout Session
  if (lower.includes("swap") || lower.includes("switch session")) {
    const w = context.activeWorkout;
    if (!w.nextSession) {
      return {
        replyText: "There is no upcoming session available in your current block to swap with.",
      };
    }

    return {
      replyText: `Equipment occupied or schedule conflict? Swapping today's '${w.sessionName}' with upcoming '${w.nextSession.sessionName}'. Action initiated.`,
      actionReceipt: {
        type: "SWAP_ORDER",
        summary: `Swapped: ${w.sessionName} ⇄ ${w.nextSession.sessionName}`,
        badgeColor: "amber",
        data: { current: w.sessionName, next: w.nextSession.sessionName },
      },
      suggestedAction: {
        type: "swap_session",
        payload: { currentId: w.sessionId, nextId: w.nextSession.sessionId },
      },
    };
  }

  // 3. INTENT: Workout Status & Prescribed Movements
  if (
    lower.includes("workout") ||
    lower.includes("today") ||
    lower.includes("session") ||
    lower.includes("what to lift") ||
    lower.includes("routine")
  ) {
    const w = context.activeWorkout;
    if (w.isRestDay) {
      return {
        replyText: `Today is a scheduled REST & RECOVERY day (${w.sessionName}). Prioritize hydration, sleep hygiene, and hitting your protein goal of ${Math.round(context.profile.currentWeightValue * 2.2)}g. If you feel 100% primed to train, you can command 'swap session' or skip rest to start the next session.`,
        actionReceipt: {
          type: "WORKOUT_INFO",
          summary: `Active: Scheduled Rest Day`,
          badgeColor: "indigo",
          data: w,
        },
      };
    }

    const exList = w.exercises
      .map(
        (e, idx) =>
          `${idx + 1}. ${e.exerciseName.replace(/_/g, " ").toUpperCase()}: ${e.targetSets} sets x ${e.targetReps} reps @ ${e.targetLoad}${e.loadUnit} (RPE ${e.targetRpe})`
      )
      .join("\n");

    const nextInfo = w.nextSession
      ? `\n\nUpcoming Next: ${w.nextSession.sessionName} (${w.nextSession.exerciseCount} movements).`
      : "";

    return {
      replyText: `Today's session is ${w.sessionName.toUpperCase()} (Week ${w.weekNumber}, Day ${w.dayIndex}):\n\n${exList}${nextInfo}`,
      actionReceipt: {
        type: "WORKOUT_INFO",
        summary: `${w.sessionName} • ${w.exercises.length} movements`,
        badgeColor: "emerald",
        data: w,
      },
    };
  }

  // 3. INTENT: 1RMs & Baseline Strength Lifts
  if (
    lower.includes("1rm") ||
    lower.includes("max") ||
    lower.includes("baseline") ||
    lower.includes("strength") ||
    lower.includes("biometrics") ||
    lower.includes("weight")
  ) {
    const p = context.profile;
    const b = p.baselineLifts;
    const u = p.preferredUnit;

    return {
      replyText: `Athlete Profile: ${p.name} (${p.age}yo ${p.sex}, ${p.heightCm}cm, ${p.currentWeightValue}${u}).\n\nBaseline 1RMs:\n• Squat: ${b.squat_1rm}${u}\n• Bench Press: ${b.bench_press_1rm}${u}\n• Deadlift: ${b.deadlift_1rm}${u}\n• Overhead Press: ${b.overhead_press_1rm}${u}\n• Barbell Row: ${b.barbell_row_1rm}${u}\n• Pull-up: +${b.pull_up_1rm}${u}\n\nAll session loads in your mesocycle are calculated as autoregulated percentages of these baselines.`,
      actionReceipt: {
        type: "PROFILE_INFO",
        summary: `1RMs: S ${b.squat_1rm} | B ${b.bench_press_1rm} | D ${b.deadlift_1rm} ${u}`,
        badgeColor: "indigo",
        data: p,
      },
    };
  }

  // 4. INTENT: Nutrition, Macros & Calorie Targets
  if (
    lower.includes("macro") ||
    lower.includes("nutrition") ||
    lower.includes("calorie") ||
    lower.includes("diet") ||
    lower.includes("cut") ||
    lower.includes("bulk") ||
    lower.includes("tdee") ||
    lower.includes("bmr") ||
    lower.includes("protein")
  ) {
    const p = context.profile;
    const goal: NutritionGoal = lower.includes("bulk") ? "bulk" : lower.includes("cut") ? "cut" : "maintain";

    const weightKg =
      p.preferredUnit === "lb"
        ? Math.round(p.currentWeightValue * 0.453592 * 10) / 10
        : p.currentWeightValue;

    const macros = calculateMacroTargets({
      weightKg,
      heightCm: p.heightCm,
      ageYears: p.age,
      sex: p.sex,
      activityLevel: "moderately_active",
      goal,
    });

    if (macros) {
      return {
        replyText: `Daily Nutrition Plan for ${goal.toUpperCase()} (${p.name}):\n\n• Target Energy: ${macros.targetCalories} kcal (BMR: ${macros.bmr}, TDEE: ${macros.tdee} kcal)\n• Protein: ${macros.proteinGrams}g (${macros.proteinPct}%)\n• Carbohydrates: ${macros.carbGrams}g (${macros.carbPct}%)\n• Fats: ${macros.fatGrams}g (${macros.fatPct}%)\n\nMaintain high protein intake spaced evenly across 4 meals to preserve lean contractile mass during progression.`,
        actionReceipt: {
          type: "NUTRITION_INFO",
          summary: `${goal.toUpperCase()}: ${macros.targetCalories} kcal • ${macros.proteinGrams}g P`,
          badgeColor: "amber",
          data: macros,
        },
      };
    }
  }


  // 6. INTENT: Shorthand Set Logging
  const strippedForLog = cleanMsg.replace(/^log\s+|^record\s+|^set\s+/i, "").trim();
  const parsed = parseGymShorthand(strippedForLog, context.profile.preferredUnit);

  if (parsed.success) {
    const p = parsed;
    const repsSummary = p.reps_per_set.length > 1 ? `${p.total_sets}x${p.reps_per_set.join(",")}` : `${p.reps_per_set[0] || 5}`;
    const coachDirective = `${p.exercise_name.replace(/_/g, " ")}: ${p.load_value}${p.load_unit} x ${repsSummary} @ RPE ${p.rpe || 8}. Drive floor away; maintain bar path. Rest 3m.`;

    return {
      replyText: `Logged set: ${p.exercise_name.replace(/_/g, " ").toUpperCase()} — ${p.load_value}${p.load_unit} x ${repsSummary} (RPE ${p.rpe ?? "unspecified"}). ${coachDirective}`,
      actionReceipt: {
        type: "SET_LOGGED",
        summary: `${p.exercise_name.replace(/_/g, " ")}: ${p.load_value}${p.load_unit} x ${repsSummary}`,
        badgeColor: "emerald",
        data: p,
      },
      suggestedAction: {
        type: "log_set",
        payload: { rawInput: strippedForLog },
      },
    };
  }

  // 7. DEFAULT: Contextual Strength & Conditioning Guidance
  const w = context.activeWorkout;
  const currentExercises = w.exercises.map((e) => `${e.exerciseName.replace(/_/g, " ")} (${e.targetLoad}${e.loadUnit})`).join(", ");

  return {
    replyText: `Got it, ${context.profile.name}. Regarding your training on ${w.sessionName}: our targets today are ${currentExercises}. Focus on clean bar path and explosive concentric intent. If you want to check your set targets, swap an exercise, calculate nutrition, or log a working set, just let me know!`,
    actionReceipt: {
      type: "COACH_ADVICE",
      summary: `Guidance: ${w.sessionName}`,
      badgeColor: "zinc",
    },
  };
}

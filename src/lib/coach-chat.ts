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

  // 3. INTENT: Shorthand Set Logging (e.g., 'bench 100kg 3x5 rpe8', 'dl 150 3x6')
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

  // 4. INTENT: Swap Workout Session
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

  // 4. INTENT: Specific Exercise Guidance (Deadlift, Squat, Bench, Row, Pullup)
  if (lower.includes("deadlift") || lower.includes("dl")) {
    const w = context.activeWorkout;
    const dlEx = w.exercises.find((e) => e.exerciseName.includes("deadlift"));
    const targetInfo = dlEx
      ? `${dlEx.targetSets} working sets of ${dlEx.targetReps} reps at ${dlEx.targetLoad}${dlEx.loadUnit} @ RPE ${dlEx.targetRpe}`
      : "3 sets of 6 reps at 150kg @ RPE 7.5";

    return {
      replyText: `Deadlift Strategy for today (${w.sessionName}):\n\n• Prescribed Target: ${targetInfo}.\n• Setup Cues: Stand hip-width, wedge your hips into position, pull the slack out of the barbell until it clicks against the plates, lock your lats tight ('squeeze oranges in your armpits'), and drive the floor away through mid-foot.\n• Autoregulation: If warmup at 130kg feels heavy (RPE > 8), we can downregulate today's top sets to 142.5kg. How is your lower back feeling?`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: `Deadlift: ${targetInfo}`,
        badgeColor: "emerald",
      },
    };
  }

  if (lower.includes("squat") || lower.includes("back squat")) {
    return {
      replyText: `Squat Technique & Prescriptions:\n\n• Baseline 1RM: ${context.profile.baselineLifts.squat_1rm}${context.profile.preferredUnit}.\n• Execution Cues: Create 360° intra-abdominal pressure into your belt. Break hips and knees simultaneously. Maintain three-point foot contact (big toe, pinky toe, heel) and accelerate aggressively out of the hole.`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: `Squat Baselines & Cues`,
        badgeColor: "emerald",
      },
    };
  }

  if (lower.includes("bench") || lower.includes("press")) {
    return {
      replyText: `Bench Press Strategy:\n\n• Baseline 1RM: ${context.profile.baselineLifts.bench_press_1rm}${context.profile.preferredUnit}.\n• Setup Cues: Retract and depress scapulae onto the bench, plant feet firmly for leg drive, control the eccentric to the lower sternum, and drive back up toward your eyes.`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: `Bench Press Form Cues`,
        badgeColor: "emerald",
      },
    };
  }

  // 5. INTENT: Workout Status & Prescribed Movements
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


  // 7. INTENT: Fatigue, Soreness & Autoregulation
  if (
    lower.includes("tired") ||
    lower.includes("fatigue") ||
    lower.includes("exhausted") ||
    lower.includes("sore") ||
    lower.includes("weak") ||
    lower.includes("heavy") ||
    lower.includes("bad sleep") ||
    lower.includes("low energy")
  ) {
    return {
      replyText: `Got it. Autoregulation in action:\n\n• When systemic fatigue or sleep debt is high, don't grind through failure. Reduce today's working loads by 7.5% - 10% (e.g. drop Deadlifts from 150kg to ~137.5kg) or shave off the final set.\n• Focus strictly on movement crispness and bar speed at RPE 6-7.\n• Would you like me to adjust today's load modifier to 0.90 (10% deload)?`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: `Autoregulation: Fatigue Adjustment`,
        badgeColor: "amber",
      },
    };
  }

  // 8. INTENT: Mesocycle, Progression & Block Periodization
  if (
    lower.includes("progression") ||
    lower.includes("mesocycle") ||
    lower.includes("block") ||
    lower.includes("periodization") ||
    lower.includes("overload") ||
    lower.includes("plan")
  ) {
    const w = context.activeWorkout;
    return {
      replyText: `4-Week Mesocycle Blueprint:\n\n• Week 1 (Current): Accumulation & Calibration — Establishing baseline volume at moderate RPE (7.0 - 8.0).\n• Week 2: Intensification — +2.5% to 5% load increase or +1 rep per set.\n• Week 3: Peak Volume/Intensity — Target PR sets @ RPE 8.5 - 9.0.\n• Week 4: Deload & Supercompensation — 50% volume reduction to dissipate accumulated neural fatigue before the next block.`,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: `Week 1 Accumulation Phase`,
        badgeColor: "indigo",
      },
    };
  }

  // 10. DEFAULT: Contextual Strength & Conditioning Guidance
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

import { db } from "@/db";
import { athleteDailyGoals, userProfiles, type WeeklySplitDay } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getExerciseGuide } from "./exercises-data";

export interface BriefingExercise {
  name: string;
  normalizedName: string;
  targetMuscle: string;
  sets: number;
  reps: string;
  targetLoadText: string;
  keyCues: string[];
  animationUrl?: string;
  thumbnailUrl?: string;
}

export interface DailyBriefingPayload {
  dateFormatted: string;
  dayOfWeek: string;
  isTrainingDay: boolean;
  statusBadge: string;
  headline: string;
  subheadline: string;
  workoutPlan?: {
    sessionName: string;
    focus: string;
    exercises: BriefingExercise[];
  };
  recoveryPlan?: {
    focus: string;
    recommendedActivities: string[];
  };
  dailyTargets: {
    caloriesKcal: number;
    caloriesDescription: string;
    proteinGrams: string;
    proteinDescription: string;
    waterLiters: string;
    waterDescription: string;
    walkMinutes: string;
    walkDescription: string;
    trainingStandard: string;
  };
  coachMotivationalNote: string;
  generatedAt: string;
}

const DEFAULT_MOVEMENTS_MAP: Record<string, string[]> = {
  push: ["bench_press", "overhead_press", "dumbbell_bench_press", "dumbbell_lateral_raise", "cable_pushdown"],
  pull: ["barbell_row", "pull_up", "cable_pushdown", "dumbbell_lateral_raise", "romanian_deadlift"],
  legs: ["squat", "romanian_deadlift", "box_squat", "dumbbell_lateral_raise", "cable_pushdown"],
  upper: ["bench_press", "barbell_row", "overhead_press", "dumbbell_lateral_raise", "cable_pushdown"],
  lower: ["squat", "deadlift", "romanian_deadlift", "box_squat", "cable_pushdown"],
};

/**
 * Computes today's structured morning briefing payload based on the athlete's
 * active weekly split schedule, goals, and 1RM baselines.
 */
export async function getDailyMorningBriefing(
  now: Date = new Date(),
  userId?: string
): Promise<DailyBriefingPayload> {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[now.getDay()];

  const dateFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Query user profile & goals
  const dbProfile = userId
    ? await db.query.userProfiles.findFirst({ where: eq(userProfiles.id, userId) })
    : await db.query.userProfiles.findFirst();

  const profile = dbProfile ?? {
    id: "default_user",
    name: "Athlete",
    preferredUnit: "kg" as const,
    baselineLifts: {
      squat_1rm: 140,
      bench_press_1rm: 100,
      deadlift_1rm: 180,
      overhead_press_1rm: 60,
      barbell_row_1rm: 85,
      pull_up_1rm: 25,
    },
  };

  const goals = await db.query.athleteDailyGoals.findFirst({
    where: eq(athleteDailyGoals.userId, profile.id),
  });

  // Determine split day from user's configured weekly schedule
  let currentSplitDay: WeeklySplitDay | undefined;
  if (goals?.weeklySplitSchedule && Array.isArray(goals.weeklySplitSchedule)) {
    currentSplitDay = goals.weeklySplitSchedule.find(
      (s) => s.day.toLowerCase() === dayOfWeek.toLowerCase()
    );
  }

  // Fallback 5-day schedule if athlete hasn't configured split schedule yet
  if (!currentSplitDay) {
    const defaultWeeklyMap: Record<string, WeeklySplitDay> = {
      Monday: { day: "Monday", title: "Upper Body A", focus: "Chest Press & Horizontal Pull Heavy", isRest: false },
      Tuesday: { day: "Tuesday", title: "Lower Body A", focus: "Squat Depth & Quad Overload", isRest: false },
      Wednesday: { day: "Wednesday", title: "Active Recovery", focus: "20-30m walk & joint restoration", isRest: true },
      Thursday: { day: "Thursday", title: "Upper Body B", focus: "Chest & Back Width + Lateral Delts", isRest: false },
      Friday: { day: "Friday", title: "Lower Body B", focus: "Posterior Chain (Deadlift & Hamstrings)", isRest: false },
      Saturday: { day: "Saturday", title: "Arms & Core", focus: "Deltoid, Arm Hypertrophy & Work Capacity", isRest: false },
      Sunday: { day: "Sunday", title: "Full Rest", focus: "Glycogen restoration & tissue recovery", isRest: true },
    };
    currentSplitDay = defaultWeeklyMap[dayOfWeek] || {
      day: dayOfWeek,
      title: "Active Training Session",
      focus: "Double progression compound lifts",
      isRest: false,
    };
  }

  const isTrainingDay = !currentSplitDay.isRest;

  // Build target nutrition & habits
  const caloriesKcal = goals?.caloriesTarget ?? 1900;
  const proteinGrams =
    goals?.proteinMinGrams && goals?.proteinMaxGrams
      ? `${goals.proteinMinGrams}-${goals.proteinMaxGrams}g`
      : "60-75g";
  const waterLiters =
    goals?.waterMinLiters && goals?.waterMaxLiters
      ? `${Number(goals.waterMinLiters)}-${Number(goals.waterMaxLiters)}L`
      : "3-3.5L";
  const walkMinutes =
    goals?.dailyWalkMinMinutes && goals?.dailyWalkMaxMinutes
      ? `${goals.dailyWalkMinMinutes}-${goals.dailyWalkMaxMinutes} min`
      : "20-30 min";

  // Build workout movements if training day
  let workoutPlan: DailyBriefingPayload["workoutPlan"] | undefined;
  let recoveryPlan: DailyBriefingPayload["recoveryPlan"] | undefined;

  if (isTrainingDay) {
    const titleLower = currentSplitDay.title.toLowerCase();
    let exerciseKeys: string[] = DEFAULT_MOVEMENTS_MAP.upper;

    if (titleLower.includes("push")) exerciseKeys = DEFAULT_MOVEMENTS_MAP.push;
    else if (titleLower.includes("pull")) exerciseKeys = DEFAULT_MOVEMENTS_MAP.pull;
    else if (titleLower.includes("leg") || titleLower.includes("lower")) {
      exerciseKeys = DEFAULT_MOVEMENTS_MAP.legs;
    } else if (titleLower.includes("upper")) {
      exerciseKeys = DEFAULT_MOVEMENTS_MAP.upper;
    }

    const unit = profile.preferredUnit || "kg";
    const baseline = profile.baselineLifts || {
      squat_1rm: 140,
      bench_press_1rm: 100,
      deadlift_1rm: 180,
      overhead_press_1rm: 60,
      barbell_row_1rm: 85,
    };

    const exercises: BriefingExercise[] = exerciseKeys.map((key) => {
      const guide = getExerciseGuide(key);
      let loadVal = 50;
      if (key === "bench_press" || key === "dumbbell_bench_press") {
        loadVal = Math.round((baseline.bench_press_1rm || 100) * 0.725);
      } else if (key === "squat" || key === "box_squat") {
        loadVal = Math.round((baseline.squat_1rm || 140) * 0.725);
      } else if (key === "deadlift" || key === "romanian_deadlift") {
        loadVal = Math.round((baseline.deadlift_1rm || 180) * 0.725);
      } else if (key === "overhead_press" || key === "neutral_grip_dumbbell_press") {
        loadVal = Math.round((baseline.overhead_press_1rm || 60) * 0.725);
      } else if (key === "barbell_row") {
        loadVal = Math.round((baseline.barbell_row_1rm || 85) * 0.725);
      } else if (key === "dumbbell_lateral_raise") {
        loadVal = unit === "kg" ? 12.5 : 25;
      } else if (key === "cable_pushdown") {
        loadVal = unit === "kg" ? 27.5 : 60;
      } else if (key === "pull_up") {
        loadVal = 0;
      }

      const loadText = loadVal > 0 ? `${loadVal}${unit}` : "Bodyweight";

      return {
        name: guide.name,
        normalizedName: guide.normalizedName,
        targetMuscle: guide.targetMuscle,
        sets: 3,
        reps: "10-12 reps",
        targetLoadText: loadText,
        keyCues: guide.coachingCues.slice(0, 2),
        animationUrl: guide.animationUrl,
        thumbnailUrl: guide.thumbnailUrl,
      };
    });

    workoutPlan = {
      sessionName: currentSplitDay.title,
      focus: currentSplitDay.focus,
      exercises,
    };
  } else {
    recoveryPlan = {
      focus: currentSplitDay.focus,
      recommendedActivities: [
        "Brisk 20-30 minute metabolic walk to preserve NEAT and circulation.",
        "Full cellular hydration (minimum 3.0 Liters) to restore joint synovial fluid.",
        "Prioritize 60-75g protein to support muscle protein synthesis on off-days.",
        "Gentle hip flexor, thoracic spine, and hamstring mobility stretches.",
      ],
    };
  }

  const headline = isTrainingDay
    ? `${dayOfWeek} — ${currentSplitDay.title}: ${currentSplitDay.focus}`
    : `${dayOfWeek} — Scheduled Rest & Recovery: ${walkMinutes} walk`;

  const subheadline = isTrainingDay
    ? "Prescribed 5 movements. Target 10-12 reps with double progression, stopping all sets at technical failure."
    : "Active tissue recovery day. Hit your metabolic walk and hydration targets.";

  const coachMotivationalNote = isTrainingDay
    ? "Lock in 2-second eccentric descent on all working sets. Zero knee or lower-back pain permitted."
    : "Recovery is when muscle tissue adapts and supercompensates. Stay hydrated and hit your walk.";

  return {
    dateFormatted,
    dayOfWeek,
    isTrainingDay,
    statusBadge: currentSplitDay.title.toUpperCase(),
    headline,
    subheadline,
    workoutPlan,
    recoveryPlan,
    dailyTargets: {
      caloriesKcal,
      caloriesDescription: "Fat-loss deficit maintaining lean muscular mass.",
      proteinGrams,
      proteinDescription: "4 eggs morning + 50-70g chicken breast dinner + family staples.",
      waterLiters,
      waterDescription: "Joint lubrication, recovery, and cellular hydration.",
      walkMinutes,
      walkDescription: "Brisk walking to sustain metabolic rate outside the gym.",
      trainingStandard: "Double progression (10-12 clean reps; stop at technical failure).",
    },
    coachMotivationalNote,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Dispatches the morning briefing to an external webhook or Telegram bot
 */
export async function dispatchDailyMorningBriefing(
  payload: DailyBriefingPayload,
  options?: { webhookUrl?: string; telegramToken?: string; telegramChatId?: string }
): Promise<{ dispatched: boolean; message: string; destination?: string }> {
  const webhookUrl = options?.webhookUrl || process.env.BRIEFING_WEBHOOK_URL;
  const telegramToken = options?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = options?.telegramChatId || process.env.TELEGRAM_CHAT_ID;

  let dispatched = false;
  let destination = "none";

  // Dispatch via Webhook if configured
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        dispatched = true;
        destination = `webhook:${webhookUrl}`;
      }
    } catch (err) {
      console.error("[Briefing] Webhook dispatch error:", err);
    }
  }

  // Dispatch via Telegram if configured
  if (telegramToken && telegramChatId) {
    try {
      const exercisesText = payload.workoutPlan
        ? payload.workoutPlan.exercises
            .map((e, idx) => `${idx + 1}. *${e.name}*: ${e.sets}×${e.reps} @ ${e.targetLoadText}`)
            .join("\n")
        : "Scheduled Rest & Recovery Day";

      const messageText = `☀️ *GYM MORNING BRIEFING*\n${payload.headline}\n\n*Workout Plan:*\n${exercisesText}\n\n*Daily Targets:*\n• Calories: ~${payload.dailyTargets.caloriesKcal} kcal\n• Protein: ${payload.dailyTargets.proteinGrams}\n• Water: ${payload.dailyTargets.waterLiters}\n• Walk: ${payload.dailyTargets.walkMinutes}\n\n_${payload.coachMotivationalNote}_`;

      const tgRes = await fetch(
        `https://api.telegram.org/bot${telegramToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: messageText,
            parse_mode: "Markdown",
          }),
        }
      );
      if (tgRes.ok) {
        dispatched = true;
        destination = destination === "none" ? "telegram" : `${destination},telegram`;
      }
    } catch (err) {
      console.error("[Briefing] Telegram dispatch error:", err);
    }
  }

  return {
    dispatched,
    destination,
    message: dispatched
      ? `Morning briefing successfully dispatched to ${destination}.`
      : "Briefing payload ready (no active external webhook configured).",
  };
}

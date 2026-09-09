"use server";

import { db } from "@/db";
import {
  userProfiles,
  workoutSessions,
  exerciseSets,
  coachMessages,
  athleteDailyGoals,
  type AthleteDailyGoalsRow,
} from "@/db/schema";
import { eq, desc, asc, and, ne, gte } from "drizzle-orm";
import { parseGymShorthand, type ParsedShorthand } from "@/lib/parser";
import { resolveArbitration, type ArbitrationResult } from "@/lib/arbitration";
import { calculateBrzycki1RM, calculateProgressiveOverload } from "@/lib/math";
import {
  generateExecutionDirective,
  type ExecutionDirective,
  type CoachGeneratorInput,
} from "@/lib/coach";
import {
  generateDeterministicMesocycle,
  type PlannerGoal,
  type SplitType,
  type PlannedExercise,
} from "@/lib/planner";
import {
  calculateMacroTargets,
  type NutritionGoal,
  type MacroBreakdown,
} from "@/lib/nutrition";
import type { BaselineLifts, ActiveInjury, PreferredUnit } from "@/schemas/fitness";

export interface LoggedSetResponse {
  success: boolean;
  message: string;
  parsed?: ParsedShorthand;
  arbitration?: ArbitrationResult;
  oneRepMax?: number | null;
  savedSetsCount?: number;
  activeSessionId?: string;
  exerciseName?: string;
  nextRecommendedLoad?: number;
  coachDirective?: ExecutionDirective;
}

/**
 * Ensures a default demo user and active session exist in gym.db
 */
export async function getOrCreateActiveSession(): Promise<{
  userId: string;
  sessionId: string;
  preferredUnit: "kg" | "lb";
  sessionName: string;
}> {
  // Check for existing user
  const existingUsers = await db.select().from(userProfiles).limit(1);

  let userId: string;
  let preferredUnit: "kg" | "lb" = "kg";

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    preferredUnit = existingUsers[0].preferredUnit;
  } else {
    userId = crypto.randomUUID();
    await db.insert(userProfiles).values({
      id: userId,
      name: "Athlete",
      email: "athlete@gym.local",
      age: 0,
      sex: "male",
      heightCm: 0,
      preferredUnit: "kg",
      currentWeightValue: 0,
      currentWeightUnit: "kg",
      sevenDayWeightMedian: 0,
      coldStartActive: true,
      coldStartDaysRemaining: 14,
      trainingAge: "novice",
      rawWeightHistory: [],
      baselineLifts: {
        squat_1rm: 0,
        bench_press_1rm: 0,
        deadlift_1rm: 0,
        overhead_press_1rm: 0,
        barbell_row_1rm: 0,
        pull_up_1rm: 0,
      },
      activeInjuries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Check for existing in_progress session
  const activeSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "in_progress")
      )
    )
    .orderBy(asc(workoutSessions.startedAt))
    .limit(1);

  if (activeSessions.length > 0) {
    return {
      userId,
      sessionId: activeSessions[0].id,
      preferredUnit,
      sessionName: activeSessions[0].sessionName,
    };
  }

  // Check for earliest planned workout session (activate it)
  const plannedSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "planned"),
        ne(workoutSessions.sessionType, "rest")
      )
    )
    .orderBy(asc(workoutSessions.startedAt))
    .limit(1);

  if (plannedSessions.length > 0) {
    await db
      .update(workoutSessions)
      .set({ status: "in_progress" })
      .where(eq(workoutSessions.id, plannedSessions[0].id));

    return {
      userId,
      sessionId: plannedSessions[0].id,
      preferredUnit,
      sessionName: plannedSessions[0].sessionName,
    };
  }

  // Create new fallback active session
  const newSessionId = crypto.randomUUID();
  await db.insert(workoutSessions).values({
    id: newSessionId,
    userId,
    sessionName: "Active Gym Floor Workout",
    sessionType: "custom",
    status: "in_progress",
    startedAt: new Date().toISOString(),
    elapsedMinutes: 0,
    arbitrationHardStop: false,
    arbitrationDecision: "MAINTAIN",
    resolvedLoadModifier: 1.0,
    resolvedVolumeModifier: 1.0,
    activeDownRegulations: [],
    userOverrideActive: false,
  });

  return {
    userId,
    sessionId: newSessionId,
    preferredUnit,
    sessionName: "Active Gym Floor Workout",
  };
}

/**
 * Server Action to submit shorthand gym telemetry
 * NOTE: Progressive overload is NOT compounded per set here.
 * Overload calculation occurs once upon session completion.
 */
export async function submitShorthandSetAction(
  rawInput: string,
  userOverrideActive: boolean = false
): Promise<LoggedSetResponse> {
  try {
    const sessionContext = await getOrCreateActiveSession();
    const { sessionId, preferredUnit } = sessionContext;

    // 1. Parse the shorthand string
    const parsed = parseGymShorthand(rawInput, preferredUnit);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error_message || "Failed to parse gym shorthand.",
        parsed,
      };
    }

    // 2. Evaluate Layer 0 Arbitration
    const arbitration = resolveArbitration({
      has_acute_pain: !!parsed.pain_telemetry?.has_pain,
      pain_severity: parsed.pain_telemetry?.severity ?? 0,
      pain_sensation: parsed.pain_telemetry?.sensation ?? "none",
      pain_site: parsed.pain_telemetry?.site ?? "",
      proposed_overload_qualified: false,
      user_override_active: userOverrideActive,
    });

    // 3. Update Session with Arbitration Decision
    await db
      .update(workoutSessions)
      .set({
        arbitrationHardStop: arbitration.hard_stop_active,
        arbitrationDecision: arbitration.arbitration_decision,
        resolvedLoadModifier: arbitration.resolved_load_modifier,
        resolvedVolumeModifier: arbitration.resolved_volume_modifier,
        activeDownRegulations: arbitration.active_down_regulations,
        userOverrideActive,
      })
      .where(eq(workoutSessions.id, sessionId));

    // 4. Query current set count for this exercise
    const previousSets = await db
      .select()
      .from(exerciseSets)
      .where(eq(exerciseSets.sessionId, sessionId))
      .orderBy(desc(exerciseSets.setNumber));

    const currentMaxSetNumber = previousSets.length > 0 ? previousSets[0].setNumber : 0;

    // 5. Persist each parsed set to SQLite
    const exerciseId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    for (let i = 0; i < parsed.sets.length; i++) {
      const setEntry = parsed.sets[i];
      await db.insert(exerciseSets).values({
        id: crypto.randomUUID(),
        sessionId,
        exerciseId,
        exerciseName: parsed.exercise_name,
        movementPattern: parsed.movement_pattern,
        setNumber: currentMaxSetNumber + i + 1,
        setType: "working",
        loadValue: setEntry.load_value,
        loadUnit: setEntry.load_unit,
        reps: setEntry.reps,
        targetRpe: 8.0,
        loggedRpe: parsed.rpe,
        rir: parsed.rir,
        hasAcutePain: !!parsed.pain_telemetry?.has_pain,
        painSite: parsed.pain_telemetry?.site,
        painSeverity: parsed.pain_telemetry?.severity,
        painSensation: parsed.pain_telemetry?.sensation,
        userOverrideActive,
        completedAt: nowIso,
      });
    }

    // 6. Calculate 1RM for feedback
    const firstRep = parsed.reps_per_set[0] || 1;
    const e1RM = calculateBrzycki1RM(parsed.load_value, firstRep);

    // 7. Generate Sub-30-Word Coaching Directive
    const coachDirective = await generateExecutionDirective({
      exercise_name: parsed.exercise_name,
      movement_pattern: parsed.movement_pattern,
      current_load: parsed.load_value,
      load_unit: parsed.load_unit,
      target_reps: parsed.reps_per_set[0] || 5,
      target_rpe: parsed.rpe || 8.0,
      rest_seconds: 180,
      arbitration,
    });

    return {
      success: true,
      message: arbitration.hard_stop_active
        ? `HARD STOP: Acute pain flagged on ${parsed.exercise_name}. Cease immediately.`
        : `Logged ${parsed.sets.length} set(s) of ${parsed.exercise_name} @ ${parsed.load_value}${parsed.load_unit}.`,
      parsed,
      arbitration,
      oneRepMax: e1RM,
      savedSetsCount: parsed.sets.length,
      activeSessionId: sessionId,
      exerciseName: parsed.exercise_name,
      coachDirective,
    };
  } catch (error) {
    console.error("Error submitting shorthand set:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

/**
 * Trigger immediate emergency Hard Stop via button
 */
export async function triggerManualHardStopAction(reason: string): Promise<ArbitrationResult> {
  const sessionContext = await getOrCreateActiveSession();
  const { sessionId } = sessionContext;

  const result = resolveArbitration({
    has_acute_pain: true,
    pain_severity: 10,
    pain_sensation: "sharp",
    pain_site: reason || "Manual Safety Trigger",
  });

  await db
    .update(workoutSessions)
    .set({
      arbitrationHardStop: true,
      arbitrationDecision: "HARD_STOP",
      resolvedLoadModifier: 0.0,
      resolvedVolumeModifier: 0.0,
      activeDownRegulations: result.active_down_regulations,
    })
    .where(eq(workoutSessions.id, sessionId));

  return result;
}

/**
 * Fetch recent sets for current session
 */
export async function fetchRecentSetsAction() {
  const sessionContext = await getOrCreateActiveSession();
  const { sessionId } = sessionContext;

  const sets = await db
    .select()
    .from(exerciseSets)
    .where(eq(exerciseSets.sessionId, sessionId))
    .orderBy(desc(exerciseSets.setNumber))
    .limit(10);

  return sets;
}

/**
 * Generate sub-30-word coaching directive for an exercise
 */
export async function generateCoachDirectiveAction(
  input: CoachGeneratorInput
): Promise<ExecutionDirective> {
  return generateExecutionDirective(input);
}

export interface NextSessionView {
  sessionId: string;
  sessionName: string;
  sessionType: string;
  isRestDay: boolean;
  exerciseCount: number;
}

export interface TodaysWorkoutView {
  sessionId: string;
  sessionName: string;
  sessionType: string;
  status: "planned" | "in_progress" | "completed" | "aborted";
  isRestDay: boolean;
  exercises: PlannedExercise[];
  weekNumber: number;
  dayIndex: number;
  nextSession?: NextSessionView;
}

/**
 * Generates a 4-week block and seeds sessions into workout_sessions
 */
export async function generateNewMesocycleAction(params?: {
  primaryGoal?: PlannerGoal;
  split?: SplitType;
  daysPerWeek?: number;
}) {
  const sessionContext = await getOrCreateActiveSession();
  const { userId, preferredUnit } = sessionContext;

  const users = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  if (users.length === 0) {
    throw new Error("User profile not found");
  }

  const user = users[0];
  const goal: PlannerGoal = params?.primaryGoal || "hypertrophy";
  const split: SplitType = params?.split || "push_pull_legs";
  const days = params?.daysPerWeek || 4;

  const mesocycle = generateDeterministicMesocycle({
    userId,
    primaryGoal: goal,
    split,
    daysPerWeek: days,
    preferredUnit,
    bodyWeightKg: user.currentWeightValue,
    baselineLifts: user.baselineLifts,
    activeInjuries: user.activeInjuries,
    coldStartActive: user.coldStartActive,
  });

  // Clean up any existing uncompleted sessions for a clean 4-week slate
  await db
    .delete(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        ne(workoutSessions.status, "completed")
      )
    );

  // Seed sessions into gym.db
  const baseTime = Date.now();
  for (let i = 0; i < mesocycle.sessions.length; i++) {
    const s = mesocycle.sessions[i];
    await db.insert(workoutSessions).values({
      id: s.id,
      userId,
      sessionName: s.sessionName,
      sessionType: s.sessionType,
      status: i === 0 && !s.isRestDay ? "in_progress" : "planned",
      startedAt: new Date(baseTime + (s.dayIndex - 1) * 86400000).toISOString(),
      elapsedMinutes: 0,
      arbitrationHardStop: false,
      arbitrationDecision: "MAINTAIN",
      resolvedLoadModifier: 1.0,
      resolvedVolumeModifier: 1.0,
      activeDownRegulations: [],
      userOverrideActive: false,
      sessionNotes: JSON.stringify(s.exercises),
    });
  }

  return {
    success: true,
    mesocycleId: mesocycle.id,
    totalSessions: mesocycle.sessions.length,
    workoutSessionsCount: mesocycle.sessions.filter((s) => !s.isRestDay).length,
  };
}

/**
 * Skip setup and immediately start training with standard adaptive baselines
 */
export async function quickStartWorkoutAction(): Promise<{
  success: boolean;
  message: string;
  todaysWorkout: TodaysWorkoutView;
}> {
  const existingUsers = await db.select().from(userProfiles).limit(1);
  let userId: string;
  if (existingUsers.length === 0) {
    const sessionContext = await getOrCreateActiveSession();
    userId = sessionContext.userId;
  } else {
    userId = existingUsers[0].id;
    if (existingUsers[0].currentWeightValue === 0) {
      await db
        .update(userProfiles)
        .set({
          currentWeightValue: 75,
          currentWeightUnit: "kg",
          heightCm: 175,
          age: 26,
          coldStartActive: false,
          coldStartDaysRemaining: 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userProfiles.id, userId));
    }
  }

  await generateNewMesocycleAction({
    primaryGoal: "hypertrophy",
    split: "push_pull_legs",
    daysPerWeek: 4,
  });

  const todaysWorkout = await getTodaysWorkoutAction();

  return {
    success: true,
    message: "Workout loaded! You are actively in training.",
    todaysWorkout,
  };
}

/**
 * Fetches the next uncompleted workout in sequence (ordered by startedAt ASC)
 * Never looks at calendar day; avoids the Missed-Day Glitch.
 */
export async function getTodaysWorkoutAction(): Promise<TodaysWorkoutView> {
  const existingUsers = await db.select().from(userProfiles).limit(1);
  if (existingUsers.length === 0) {
    return {
      sessionId: "",
      sessionName: "No Active Plan",
      sessionType: "custom",
      status: "planned",
      isRestDay: false,
      exercises: [],
      weekNumber: 1,
      dayIndex: 1,
    };
  }
  const userId = existingUsers[0].id;

  // Query uncompleted sessions in sequence order (startedAt ASC)
  let uncompleted = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        ne(workoutSessions.status, "completed"),
        ne(workoutSessions.status, "aborted")
      )
    )
    .orderBy(asc(workoutSessions.startedAt));

  // If no uncompleted sessions exist, do not auto-generate mock mesocycle!
  if (uncompleted.length === 0) {
    return {
      sessionId: "",
      sessionName: "No Active Plan",
      sessionType: "custom",
      status: "planned",
      isRestDay: false,
      exercises: [],
      weekNumber: 1,
      dayIndex: 1,
    };
  }

  const currentSession = uncompleted[0];

  // If session is planned and is a workout, transition to in_progress
  if (currentSession.status === "planned" && currentSession.sessionType !== "rest") {
    await db
      .update(workoutSessions)
      .set({ status: "in_progress" })
      .where(eq(workoutSessions.id, currentSession.id));
    currentSession.status = "in_progress";
  }

  let exercises: PlannedExercise[] = [];
  if (currentSession.sessionNotes) {
    try {
      exercises = JSON.parse(currentSession.sessionNotes);
    } catch {
      exercises = [];
    }
  }

  // Next session in sequence (if available)
  let nextSession: NextSessionView | undefined;
  if (uncompleted.length > 1) {
    const next = uncompleted[1];
    let nextExCount = 0;
    try {
      if (next.sessionNotes) {
        nextExCount = JSON.parse(next.sessionNotes).length;
      }
    } catch {
      nextExCount = 0;
    }
    nextSession = {
      sessionId: next.id,
      sessionName: next.sessionName,
      sessionType: next.sessionType,
      isRestDay: next.sessionType === "rest",
      exerciseCount: nextExCount,
    };
  }

  const totalSessions = 28;
  const currentSequence = totalSessions - uncompleted.length + 1;
  const weekNumber = Math.max(1, Math.min(4, Math.ceil(currentSequence / 7)));
  const dayIndex = ((currentSequence - 1) % 7) + 1;

  return {
    sessionId: currentSession.id,
    sessionName: currentSession.sessionName,
    sessionType: currentSession.sessionType,
    status: currentSession.status as TodaysWorkoutView["status"],
    isRestDay: currentSession.sessionType === "rest",
    exercises,
    weekNumber,
    dayIndex,
    nextSession,
  };
}

/**
 * Swaps session order between active session and next session (Day-Swapping Flexibility)
 */
export async function swapSessionOrderAction(
  currentSessionId: string,
  nextSessionId: string
): Promise<{ success: boolean; message: string }> {
  const current = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, currentSessionId))
    .limit(1);

  const next = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, nextSessionId))
    .limit(1);

  if (current.length === 0 || next.length === 0) {
    return { success: false, message: "Could not find sessions to swap." };
  }

  const currentStartedAt = current[0].startedAt;
  const nextStartedAt = next[0].startedAt;

  // Swap startedAt timestamps so sequence order changes
  await db
    .update(workoutSessions)
    .set({
      startedAt: nextStartedAt,
      status: "planned",
    })
    .where(eq(workoutSessions.id, currentSessionId));

  await db
    .update(workoutSessions)
    .set({
      startedAt: currentStartedAt,
      status: next[0].sessionType === "rest" ? "planned" : "in_progress",
    })
    .where(eq(workoutSessions.id, nextSessionId));

  return {
    success: true,
    message: `Swapped order: "${next[0].sessionName}" is now today's session!`,
  };
}

/**
 * Marks a scheduled rest day completed and returns the next session
 */
export async function skipRestDayAction(
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  await db
    .update(workoutSessions)
    .set({ status: "completed" })
    .where(eq(workoutSessions.id, sessionId));

  return {
    success: true,
    message: "Rest day marked complete. Next workout session loaded!",
  };
}

export interface AutoregulationAdjustment {
  exerciseName: string;
  action: "INCREMENT_LOAD" | "MAINTAIN_LOAD" | "DOWN_REGULATE_LOAD";
  loadDelta: number;
  newTarget: number;
  avgRpe: number;
  reason: string;
}

/**
 * Completes a workout session and applies Progressive Overload ONCE across future sessions
 * Aggregates all completed working sets for each exercise in the session.
 */
export async function completeWorkoutSessionAction(sessionId: string): Promise<{
  success: boolean;
  message: string;
  sessionId: string;
  adjustmentsMade: AutoregulationAdjustment[];
}> {
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    return {
      success: false,
      message: "Session not found.",
      sessionId,
      adjustmentsMade: [],
    };
  }

  const session = sessions[0];
  const plannedExercises: PlannedExercise[] = session.sessionNotes
    ? JSON.parse(session.sessionNotes)
    : [];

  const loggedSets = await db
    .select()
    .from(exerciseSets)
    .where(eq(exerciseSets.sessionId, sessionId))
    .orderBy(asc(exerciseSets.setNumber));

  const adjustmentsMade: AutoregulationAdjustment[] = [];

  // Group logged working sets by normalized exercise name
  const setsByExercise = new Map<string, typeof loggedSets>();
  for (const set of loggedSets) {
    if (set.setType !== "working") continue;
    const normName = set.exerciseName.toLowerCase().replace(/[\s_-]+/g, "_");
    const existing = setsByExercise.get(normName) || [];
    existing.push(set);
    setsByExercise.set(normName, existing);
  }

  // Evaluate overload for each planned exercise performed
  for (const ex of plannedExercises) {
    const normName = ex.exerciseName.toLowerCase().replace(/[\s_-]+/g, "_");
    const workingSets = setsByExercise.get(normName);

    if (!workingSets || workingSets.length === 0) {
      continue;
    }

    const targetReps = ex.targetReps;
    const targetRpe = ex.targetRpe || 8.0;

    // Check if reps were achieved across all sets
    const allRepsAchieved = workingSets.every((s) => s.reps >= targetReps);

    // Compute average logged RPE across sets where RPE was provided
    const rpeSets = workingSets.filter((s) => typeof s.loggedRpe === "number");
    const avgRpe =
      rpeSets.length > 0
        ? rpeSets.reduce((acc, s) => acc + (s.loggedRpe ?? targetRpe), 0) / rpeSets.length
        : targetRpe;

    // Run deterministic progressive overload calculation
    const overload = calculateProgressiveOverload({
      currentLoad: ex.targetLoad,
      unit: ex.loadUnit,
      completedReps: allRepsAchieved
        ? targetReps
        : Math.min(...workingSets.map((s) => s.reps)),
      targetReps,
      loggedRpe: avgRpe,
      targetRpe,
    });

    if (overload.loadDelta !== 0) {
      // Find all future planned sessions for this user
      const futureSessions = await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, session.userId),
            eq(workoutSessions.status, "planned")
          )
        );

      for (const fSession of futureSessions) {
        if (!fSession.sessionNotes) continue;
        try {
          const fExercises: PlannedExercise[] = JSON.parse(fSession.sessionNotes);
          let changed = false;
          for (const fEx of fExercises) {
            if (fEx.exerciseName.toLowerCase().replace(/[\s_-]+/g, "_") === normName) {
              fEx.targetLoad = Math.max(
                0,
                Math.round((fEx.targetLoad + overload.loadDelta) * 10) / 10
              );
              changed = true;
            }
          }
          if (changed) {
            await db
              .update(workoutSessions)
              .set({ sessionNotes: JSON.stringify(fExercises) })
              .where(eq(workoutSessions.id, fSession.id));
          }
        } catch {
          // ignore corrupted notes
        }
      }

      adjustmentsMade.push({
        exerciseName: ex.exerciseName,
        action: overload.action,
        loadDelta: overload.loadDelta,
        newTarget: overload.nextPrescribedLoad,
        avgRpe: Math.round(avgRpe * 10) / 10,
        reason: overload.reason,
      });
    }
  }

  // Mark current session as completed
  await db
    .update(workoutSessions)
    .set({
      status: "completed",
    })
    .where(eq(workoutSessions.id, sessionId));

  const summary =
    adjustmentsMade.length > 0
      ? `Workout completed! Autoregulation adjusted ${adjustmentsMade.length} exercise(s) for future sessions.`
      : "Workout completed successfully!";

  return {
    success: true,
    message: summary,
    sessionId,
    adjustmentsMade,
  };
}

export interface UserProfileView {
  id: string;
  name: string;
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  preferredUnit: "kg" | "lb";
  currentWeightValue: number;
  trainingAge: string;
  coldStartActive: boolean;
  baselineLifts: BaselineLifts;
  activeInjuries: ActiveInjury[];
  isUnconfigured: boolean;
}

/**
 * Fetches user profile for the modal/settings
 */
export async function getUserProfileAction(): Promise<UserProfileView> {
  const sessionContext = await getOrCreateActiveSession();
  const { userId } = sessionContext;

  const users = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (users.length === 0) {
    throw new Error("User profile not found");
  }

  const u = users[0];
  const isUnconfigured =
    u.baselineLifts.squat_1rm === 0 &&
    u.baselineLifts.bench_press_1rm === 0 &&
    u.currentWeightValue === 0;

  return {
    id: u.id,
    name: u.name,
    age: u.age,
    sex: u.sex as "male" | "female" | "other",
    heightCm: u.heightCm,
    preferredUnit: u.preferredUnit,
    currentWeightValue: u.currentWeightValue,
    trainingAge: u.trainingAge,
    coldStartActive: u.coldStartActive,
    baselineLifts: u.baselineLifts,
    activeInjuries: u.activeInjuries,
    isUnconfigured,
  };
}

export interface SaveUserProfileInput {
  name: string;
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  preferredUnit: "kg" | "lb";
  currentWeightValue: number;
  trainingAge?: string;
  baselineLifts: BaselineLifts;
  activeInjuries?: ActiveInjury[];
  regenerateMesocycle?: boolean;
  primaryGoal?: PlannerGoal;
  split?: SplitType;
  daysPerWeek?: number;
}

/**
 * Saves user profile and optionally regenerates mesocycle block
 */
export async function saveUserProfileAction(input: SaveUserProfileInput) {
  const sessionContext = await getOrCreateActiveSession();
  const { userId } = sessionContext;

  const nowIso = new Date().toISOString();

  await db
    .update(userProfiles)
    .set({
      name: input.name,
      age: input.age,
      sex: input.sex,
      heightCm: input.heightCm,
      preferredUnit: input.preferredUnit,
      currentWeightValue: input.currentWeightValue,
      currentWeightUnit: input.preferredUnit,
      sevenDayWeightMedian: input.currentWeightValue,
      trainingAge: input.trainingAge || "intermediate",
      coldStartActive: false,
      coldStartDaysRemaining: 0,
      baselineLifts: input.baselineLifts,
      activeInjuries: input.activeInjuries || [],
      updatedAt: nowIso,
    })
    .where(eq(userProfiles.id, userId));

  if (input.regenerateMesocycle) {
    await generateNewMesocycleAction({
      primaryGoal: input.primaryGoal || "hypertrophy",
      split: input.split || "push_pull_legs",
      daysPerWeek: input.daysPerWeek || 4,
    });
  }

  return {
    success: true,
    message: "Profile and baseline 1RMs updated successfully.",
  };
}

/**
 * Computes live BMR, TDEE, and macro breakdown for user profile
 */
export async function getNutritionOverviewAction(goal: NutritionGoal = "maintain"): Promise<{
  success: boolean;
  nutrition: MacroBreakdown | null;
  userName: string;
  weightKg: number;
  heightCm: number;
  preferredUnit: "kg" | "lb";
}> {
  const users = await db.select().from(userProfiles).limit(1);
  if (users.length === 0) {
    return {
      success: true,
      nutrition: null,
      userName: "Athlete",
      weightKg: 0,
      heightCm: 0,
      preferredUnit: "kg",
    };
  }

  const user = users[0];
  const weightKg =
    user.preferredUnit === "lb"
      ? Math.round(user.currentWeightValue * 0.453592 * 10) / 10
      : user.currentWeightValue;

  if (weightKg <= 0 || user.heightCm <= 0 || user.age <= 0) {
    return {
      success: true,
      nutrition: null,
      userName: user.name,
      weightKg: 0,
      heightCm: user.heightCm,
      preferredUnit: user.preferredUnit,
    };
  }

  const nutrition = calculateMacroTargets({
    weightKg,
    heightCm: user.heightCm,
    ageYears: user.age,
    sex: user.sex as "male" | "female" | "other",
    activityLevel: "moderately_active",
    goal,
  });

  return {
    success: true,
    nutrition,
    userName: user.name,
    weightKg,
    heightCm: user.heightCm,
    preferredUnit: user.preferredUnit,
  };
}

import { generateCoachResponse, type CoachChatResponse, type CoachActionReceipt } from "@/lib/coach-chat";

export interface CoachActionResult {
  replyText: string;
  actionReceipt?: CoachActionReceipt;
  executedAction?: {
    type: string;
    success: boolean;
    result?: any;
  };
  currentWorkout: TodaysWorkoutView;
}

/**
 * Handles conversational queries and executes database mutations from chat
 */
export async function sendCoachMessageAction(
  userMessage: string,
  autoExecute: boolean = true
): Promise<CoachActionResult> {
  const profile = await getUserProfileAction();
  const activeWorkout = await getTodaysWorkoutAction();
  const recentSets = await fetchRecentSetsAction();

  const coachResponse = generateCoachResponse(userMessage, {
    profile,
    activeWorkout,
    recentSets: recentSets.map((s) => ({
      exerciseName: s.exerciseName,
      loadValue: s.loadValue,
      loadUnit: s.loadUnit,
      reps: s.reps,
      loggedRpe: s.loggedRpe,
    })),
  });

  let executedAction: { type: string; success: boolean; result?: any } | undefined;

  if (autoExecute && coachResponse.suggestedAction) {
    const { type, payload } = coachResponse.suggestedAction;

    if (type === "log_set" && payload?.rawInput) {
      const logRes = await submitShorthandSetAction(payload.rawInput);
      executedAction = { type: "log_set", success: logRes.success, result: logRes };
    } else if (type === "safety_abort") {
      const abortRes = await triggerManualHardStopAction(payload?.reason || "Chat safety trigger");
      executedAction = { type: "safety_abort", success: true, result: abortRes };
    } else if (type === "swap_session" && payload?.currentId && payload?.nextId) {
      const swapRes = await swapSessionOrderAction(payload.currentId, payload.nextId);
      executedAction = { type: "swap_session", success: swapRes.success, result: swapRes };
    } else if (type === "quick_start_workout") {
      const startRes = await quickStartWorkoutAction();
      executedAction = { type: "quick_start_workout", success: startRes.success, result: startRes };
    }
  }

  // Get refreshed state after potential mutations
  const updatedWorkout = await getTodaysWorkoutAction();

  return {
    replyText: coachResponse.replyText,
    actionReceipt: coachResponse.actionReceipt,
    executedAction,
    currentWorkout: updatedWorkout,
  };
}

/**
 * Submit user message to the live MCP queue for the AI to answer
 */
export async function submitUserChatMessageAction(content: string): Promise<{
  id: string;
  success: boolean;
  content: string;
  status: "pending";
}> {
  const sessionContext = await getOrCreateActiveSession();
  const { userId } = sessionContext;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Enqueue athlete message in SQLite coach_messages with status 'pending' for MCP
  await db.insert(coachMessages).values({
    id,
    userId,
    content: content.trim(),
    status: "pending",
    replyContent: null,
    actionReceipt: null,
    createdAt: now,
    repliedAt: null,
  });

  return {
    id,
    success: true,
    content: content.trim(),
    status: "pending",
  };
}

/**
 * Check if a chat message has been answered by the AI
 */
export async function getChatMessageStatusAction(messageId: string): Promise<{
  id: string;
  status: "pending" | "processing" | "replied";
  content: string;
  replyContent?: string | null;
  actionReceipt?: any;
  createdAt: string;
  repliedAt?: string | null;
}> {
  const msgs = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.id, messageId))
    .limit(1);

  if (msgs.length === 0) {
    throw new Error("Message not found");
  }

  const m = msgs[0];
  return {
    id: m.id,
    status: m.status as any,
    content: m.content,
    replyContent: m.replyContent,
    actionReceipt: m.actionReceipt,
    createdAt: m.createdAt,
    repliedAt: m.repliedAt,
  };
}

/**
 * Fetch recent chat history from the persistent message queue
 */
export async function getChatHistoryAction(): Promise<Array<{
  id: string;
  content: string;
  status: string;
  replyContent?: string | null;
  actionReceipt?: any;
  createdAt: string;
  repliedAt?: string | null;
}>> {
  const sessionContext = await getOrCreateActiveSession();
  const { userId } = sessionContext;

  const msgs = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.userId, userId))
    .orderBy(asc(coachMessages.createdAt))
    .limit(50);

  return msgs;
}

/**
 * Reply to an athlete's message in the queue (invoked by the AI agent via MCP or bridge)
 */
export async function postChatReplyAction(
  messageId: string,
  replyText: string,
  actionReceipt?: any
): Promise<{ success: boolean; messageId: string }> {
  const now = new Date().toISOString();

  await db
    .update(coachMessages)
    .set({
      status: "replied",
      replyContent: replyText,
      actionReceipt: actionReceipt || null,
      repliedAt: now,
    })
    .where(eq(coachMessages.id, messageId));

  return { success: true, messageId };
}

/* =========================================================================
   ATHLETE DAILY GOALS & HABITS ENGINE
   ========================================================================= */

export interface DailyGoalsData {
  id?: string;
  userId: string;
  caloriesTarget: number | null;
  caloriesNotes: string | null;
  proteinMinGrams: number | null;
  proteinMaxGrams: number | null;
  proteinNotes: string | null;
  waterMinLiters: number | null;
  waterMaxLiters: number | null;
  waterNotes: string | null;
  dailyWalkMinMinutes: number | null;
  dailyWalkMaxMinutes: number | null;
  dailyWalkNotes: string | null;
  trainingDaysPerWeek: number | null;
  trainingNotes: string | null;
  todayCalories: number;
  todayProtein: number;
  todayWaterLiters: number;
  todayWalkMinutes: number;
  todayTrainingCompleted: boolean;
  weeklyWorkoutsCompleted: number;
  updatedAt?: string;
}

export interface SaveDailyGoalsInput {
  caloriesTarget?: number | null;
  caloriesNotes?: string | null;
  proteinMinGrams?: number | null;
  proteinMaxGrams?: number | null;
  proteinNotes?: string | null;
  waterMinLiters?: number | null;
  waterMaxLiters?: number | null;
  waterNotes?: string | null;
  dailyWalkMinMinutes?: number | null;
  dailyWalkMaxMinutes?: number | null;
  dailyWalkNotes?: string | null;
  trainingDaysPerWeek?: number | null;
  trainingNotes?: string | null;
}

/**
 * Retrieve the athlete's current custom daily goals and today's tracking status.
 * Starts completely un-prefilled (all targets null) if not previously configured.
 */
export async function getDailyGoalsAction(): Promise<DailyGoalsData> {
  const sessionData = await getOrCreateActiveSession();
  const userId = sessionData.userId;

  // Count workouts completed in the last 7 days for adherence calculation
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const completedSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        gte(workoutSessions.startedAt, oneWeekAgo)
      )
    );

  const existing = await db
    .select()
    .from(athleteDailyGoals)
    .where(eq(athleteDailyGoals.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    return {
      userId,
      caloriesTarget: null,
      caloriesNotes: null,
      proteinMinGrams: null,
      proteinMaxGrams: null,
      proteinNotes: null,
      waterMinLiters: null,
      waterMaxLiters: null,
      waterNotes: null,
      dailyWalkMinMinutes: null,
      dailyWalkMaxMinutes: null,
      dailyWalkNotes: null,
      trainingDaysPerWeek: null,
      trainingNotes: null,
      todayCalories: 0,
      todayProtein: 0,
      todayWaterLiters: 0,
      todayWalkMinutes: 0,
      todayTrainingCompleted: false,
      weeklyWorkoutsCompleted: completedSessions.length,
    };
  }

  const row = existing[0];
  return {
    id: row.id,
    userId: row.userId,
    caloriesTarget: row.caloriesTarget,
    caloriesNotes: row.caloriesNotes,
    proteinMinGrams: row.proteinMinGrams,
    proteinMaxGrams: row.proteinMaxGrams,
    proteinNotes: row.proteinNotes,
    waterMinLiters: row.waterMinLiters,
    waterMaxLiters: row.waterMaxLiters,
    waterNotes: row.waterNotes,
    dailyWalkMinMinutes: row.dailyWalkMinMinutes,
    dailyWalkMaxMinutes: row.dailyWalkMaxMinutes,
    dailyWalkNotes: row.dailyWalkNotes,
    trainingDaysPerWeek: row.trainingDaysPerWeek,
    trainingNotes: row.trainingNotes,
    todayCalories: row.todayCalories ?? 0,
    todayProtein: row.todayProtein ?? 0,
    todayWaterLiters: row.todayWaterLiters ?? 0,
    todayWalkMinutes: row.todayWalkMinutes ?? 0,
    todayTrainingCompleted: Boolean(row.todayTrainingCompleted),
    weeklyWorkoutsCompleted: completedSessions.length,
    updatedAt: row.updatedAt,
  };
}

/**
 * Save or update the athlete's custom goals & strategy notes.
 */
export async function saveDailyGoalsAction(
  input: SaveDailyGoalsInput
): Promise<{ success: boolean; goals: DailyGoalsData }> {
  const sessionData = await getOrCreateActiveSession();
  const userId = sessionData.userId;
  const now = new Date().toISOString();

  const parseNumOrNull = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  const parseStrOrNull = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length > 0 ? s : null;
  };

  const dataToSave = {
    caloriesTarget: parseNumOrNull(input.caloriesTarget),
    caloriesNotes: parseStrOrNull(input.caloriesNotes),
    proteinMinGrams: parseNumOrNull(input.proteinMinGrams),
    proteinMaxGrams: parseNumOrNull(input.proteinMaxGrams),
    proteinNotes: parseStrOrNull(input.proteinNotes),
    waterMinLiters: parseNumOrNull(input.waterMinLiters),
    waterMaxLiters: parseNumOrNull(input.waterMaxLiters),
    waterNotes: parseStrOrNull(input.waterNotes),
    dailyWalkMinMinutes: parseNumOrNull(input.dailyWalkMinMinutes),
    dailyWalkMaxMinutes: parseNumOrNull(input.dailyWalkMaxMinutes),
    dailyWalkNotes: parseStrOrNull(input.dailyWalkNotes),
    trainingDaysPerWeek: parseNumOrNull(input.trainingDaysPerWeek),
    trainingNotes: parseStrOrNull(input.trainingNotes),
    updatedAt: now,
  };

  const existing = await db
    .select()
    .from(athleteDailyGoals)
    .where(eq(athleteDailyGoals.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(athleteDailyGoals)
      .set(dataToSave)
      .where(eq(athleteDailyGoals.id, existing[0].id));
  } else {
    await db.insert(athleteDailyGoals).values({
      id: crypto.randomUUID(),
      userId,
      ...dataToSave,
      todayCalories: 0,
      todayProtein: 0,
      todayWaterLiters: 0,
      todayWalkMinutes: 0,
      todayTrainingCompleted: false,
    });
  }

  const updatedGoals = await getDailyGoalsAction();
  return { success: true, goals: updatedGoals };
}

/**
 * Log or increment today's tracked metrics against the configured goals.
 */
export async function logDailyMetricAction(input: {
  metric: "calories" | "protein" | "water" | "walk" | "training";
  value: number | boolean;
  mode?: "add" | "set";
}): Promise<{ success: boolean; goals: DailyGoalsData }> {
  const sessionData = await getOrCreateActiveSession();
  const userId = sessionData.userId;
  const now = new Date().toISOString();

  let existing = await db
    .select()
    .from(athleteDailyGoals)
    .where(eq(athleteDailyGoals.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    // Create initial row with blank targets
    const newId = crypto.randomUUID();
    await db.insert(athleteDailyGoals).values({
      id: newId,
      userId,
      todayCalories: 0,
      todayProtein: 0,
      todayWaterLiters: 0,
      todayWalkMinutes: 0,
      todayTrainingCompleted: false,
      updatedAt: now,
    });
    existing = await db
      .select()
      .from(athleteDailyGoals)
      .where(eq(athleteDailyGoals.id, newId))
      .limit(1);
  }

  const current = existing[0];
  const mode = input.mode ?? "add";

  const updates: Partial<AthleteDailyGoalsRow> = {
    updatedAt: now,
  };

  switch (input.metric) {
    case "calories": {
      const num = Number(input.value) || 0;
      updates.todayCalories = mode === "add" ? Math.max(0, (current.todayCalories ?? 0) + num) : Math.max(0, num);
      break;
    }
    case "protein": {
      const num = Number(input.value) || 0;
      updates.todayProtein = mode === "add" ? Math.max(0, (current.todayProtein ?? 0) + num) : Math.max(0, num);
      break;
    }
    case "water": {
      const num = Number(input.value) || 0;
      updates.todayWaterLiters =
        mode === "add"
          ? Math.max(0, Math.round(((current.todayWaterLiters ?? 0) + num) * 100) / 100)
          : Math.max(0, Math.round(num * 100) / 100);
      break;
    }
    case "walk": {
      const num = Number(input.value) || 0;
      updates.todayWalkMinutes = mode === "add" ? Math.max(0, (current.todayWalkMinutes ?? 0) + num) : Math.max(0, num);
      break;
    }
    case "training": {
      updates.todayTrainingCompleted = Boolean(input.value);
      break;
    }
  }

  await db
    .update(athleteDailyGoals)
    .set(updates)
    .where(eq(athleteDailyGoals.id, current.id));

  const updatedGoals = await getDailyGoalsAction();
  return { success: true, goals: updatedGoals };
}

/**
 * Reset today's tracking numbers to zero without altering targets.
 */
export async function resetDailyTrackingAction(): Promise<{ success: boolean; goals: DailyGoalsData }> {
  const sessionData = await getOrCreateActiveSession();
  const userId = sessionData.userId;
  const now = new Date().toISOString();

  await db
    .update(athleteDailyGoals)
    .set({
      todayCalories: 0,
      todayProtein: 0,
      todayWaterLiters: 0,
      todayWalkMinutes: 0,
      todayTrainingCompleted: false,
      updatedAt: now,
    })
    .where(eq(athleteDailyGoals.userId, userId));

  const updatedGoals = await getDailyGoalsAction();
  return { success: true, goals: updatedGoals };
}

/**
 * Clear all goals and tracking back to a completely blank, unconfigured state.
 */
export async function clearAllGoalsAction(): Promise<{ success: boolean; goals: DailyGoalsData }> {
  const sessionData = await getOrCreateActiveSession();
  const userId = sessionData.userId;

  await db
    .delete(athleteDailyGoals)
    .where(eq(athleteDailyGoals.userId, userId));

  const updatedGoals = await getDailyGoalsAction();
  return { success: true, goals: updatedGoals };
}



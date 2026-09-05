"use server";

import { db } from "@/db";
import { userProfiles, workoutSessions, exerciseSets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseGymShorthand, type ParsedShorthand } from "@/lib/parser";
import { resolveArbitration, type ArbitrationResult } from "@/lib/arbitration";
import { calculateBrzycki1RM } from "@/lib/math";
import {
  generateExecutionDirective,
  type ExecutionDirective,
  type CoachGeneratorInput,
} from "@/lib/coach";

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
      age: 26,
      sex: "male",
      heightCm: 178,
      preferredUnit: "kg",
      currentWeightValue: 82.0,
      currentWeightUnit: "kg",
      sevenDayWeightMedian: 82.0,
      coldStartActive: false,
      coldStartDaysRemaining: 0,
      trainingAge: "intermediate",
      rawWeightHistory: [],
      baselineLifts: {
        squat_1rm: 140,
        bench_press_1rm: 100,
        deadlift_1rm: 180,
        overhead_press_1rm: 65,
        barbell_row_1rm: 85,
        pull_up_1rm: 30,
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
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  if (activeSessions.length > 0 && activeSessions[0].status === "in_progress") {
    return {
      userId,
      sessionId: activeSessions[0].id,
      preferredUnit,
      sessionName: activeSessions[0].sessionName,
    };
  }

  // Create new active session
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

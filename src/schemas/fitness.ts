import { z } from "zod";

/**
 * ============================================================================
 * THE MASTER JSON STATE SCHEMA (10-LAYER SPECIFICATION CANVAS)
 * ============================================================================
 * Architecture:
 * Layer 0: Safety & Arbitration (Hard Stop / Pain / Abort) - P0 Non-negotiable
 * Layer 1: Biometric Baseline & User Profile
 * Layer 2: Macro-Cycle & Periodization Goals
 * Layer 3: Daily Readiness & Down-Regulator
 * Layer 4: Active Session Telemetry & Metadata
 * Layer 5: Exercise & Set Execution Log
 * Layer 6: Gym-Floor Shorthand Parser Telemetry
 * Layer 7: Contextual Floor Constraints & Equipment
 * Layer 8: Deterministic Math & Progressive Overload Engine
 * Layer 9: Sub-30-Word Execution Mode Coaching Directive
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// LAYER 0: Safety & Arbitration (Hard Stop / Pain / Abort)
// Priority: Hard Stop ≻ Down-Regulator ≻ Context ≻ Overload
// ---------------------------------------------------------------------------
export const PainSensationEnum = z.enum([
  "none",
  "dull",
  "tightness",
  "burning",
  "pinching",
  "sharp",
  "shooting",
  "popping",
  "tearing",
]);
export type PainSensation = z.infer<typeof PainSensationEnum>;

export const ArbitrationDecisionEnum = z.enum([
  "HARD_STOP",
  "DOWN_REGULATE",
  "CONTEXT_ADAPT",
  "OVERLOAD",
  "MAINTAIN",
]);
export type ArbitrationDecision = z.infer<typeof ArbitrationDecisionEnum>;

export const Layer0SafetySchema = z.object({
  hasAcutePain: z.boolean().default(false),
  painSite: z.string().trim().optional(),
  painSeverity: z.number().int().min(0).max(10).default(0), // 0-10 scale
  painSensation: PainSensationEnum.default("none"),
  jointCompromised: z.boolean().default(false),
  structuralFailure: z.boolean().default(false),
  dizzinessOrFaintness: z.boolean().default(false),
  arbitrationDecision: ArbitrationDecisionEnum.default("MAINTAIN"),
  abortReason: z.string().optional(),
  requiresImmediateCooldown: z.boolean().default(false),
});
export type Layer0Safety = z.infer<typeof Layer0SafetySchema>;

// ---------------------------------------------------------------------------
// LAYER 1: Biometric Baseline & User Profile
// ---------------------------------------------------------------------------
export const BiologicalSexEnum = z.enum(["male", "female", "other"]);
export const TrainingAgeEnum = z.enum(["novice", "intermediate", "advanced", "elite"]);

export const BaselineLiftsSchema = z.object({
  squat1RM: z.number().nonnegative().default(0),
  benchPress1RM: z.number().nonnegative().default(0),
  deadlift1RM: z.number().nonnegative().default(0),
  overheadPress1RM: z.number().nonnegative().default(0),
  barbellRow1RM: z.number().nonnegative().default(0),
  pullUp1RM: z.number().nonnegative().default(0),
});
export type BaselineLifts = z.infer<typeof BaselineLiftsSchema>;

export const Layer1UserProfileSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  age: z.number().int().positive().max(120),
  sex: BiologicalSexEnum,
  bodyWeightKg: z.number().positive().max(500),
  heightCm: z.number().positive().max(300),
  bodyFatPercentage: z.number().min(3).max(70).optional(),
  trainingAge: TrainingAgeEnum.default("intermediate"),
  baselineLifts: BaselineLiftsSchema.default({
    squat1RM: 0,
    benchPress1RM: 0,
    deadlift1RM: 0,
    overheadPress1RM: 0,
    barbellRow1RM: 0,
    pullUp1RM: 0,
  }),
  injuryHistoryNotes: z.array(z.string()).default([]),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Layer1UserProfile = z.infer<typeof Layer1UserProfileSchema>;

// ---------------------------------------------------------------------------
// LAYER 2: Macro-Cycle & Periodization Goals
// ---------------------------------------------------------------------------
export const TrainingGoalEnum = z.enum([
  "hypertrophy",
  "maximum_strength",
  "powerlifting_peaking",
  "fat_loss_preservation",
  "body_recomposition",
  "work_capacity",
]);
export const MesocyclePhaseEnum = z.enum([
  "accumulation",
  "intensification",
  "realization_peak",
  "deload",
  "active_recovery",
]);

export const Layer2PeriodizationSchema = z.object({
  primaryGoal: TrainingGoalEnum.default("hypertrophy"),
  currentMesocyclePhase: MesocyclePhaseEnum.default("accumulation"),
  mesocycleWeek: z.number().int().min(1).max(16).default(1),
  totalMesocycleWeeks: z.number().int().min(1).max(16).default(6),
  targetWeeklyFrequency: z.number().int().min(1).max(7).default(4),
  targetRpeRange: z.tuple([z.number().min(5).max(10), z.number().min(5).max(10)]).default([7, 9]),
  deloadScheduled: z.boolean().default(false),
});
export type Layer2Periodization = z.infer<typeof Layer2PeriodizationSchema>;

// ---------------------------------------------------------------------------
// LAYER 3: Daily Readiness & Down-Regulator
// ---------------------------------------------------------------------------
export const SorenessMapSchema = z.record(
  z.string(),
  z.number().int().min(0).max(10)
);

export const Layer3ReadinessSchema = z.object({
  sleepHours: z.number().min(0).max(24).default(7.5),
  sleepQualityScore: z.number().int().min(1).max(10).default(7),
  cnsFatigueScore: z.number().int().min(1).max(10).default(3), // 1=fresh, 10=exhausted
  systemicSorenessScore: z.number().int().min(1).max(10).default(3),
  stressRating: z.number().int().min(1).max(10).default(4),
  nutritionHydrationScore: z.number().int().min(1).max(10).default(8),
  sorenessByMuscleGroup: SorenessMapSchema.default({}),
  readinessMultiplier: z.number().min(0.5).max(1.15).default(1.0), // Computed: downscales load if fatigued
  downRegulateActive: z.boolean().default(false),
  downRegulateReason: z.string().optional(),
});
export type Layer3Readiness = z.infer<typeof Layer3ReadinessSchema>;

// ---------------------------------------------------------------------------
// LAYER 4: Active Session Telemetry & Metadata
// ---------------------------------------------------------------------------
export const SessionTypeEnum = z.enum([
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "conditioning",
  "custom",
]);
export const SessionStatusEnum = z.enum([
  "planned",
  "in_progress",
  "completed",
  "aborted",
]);

export const Layer4SessionMetaSchema = z.object({
  sessionId: z.string().uuid().default(() => crypto.randomUUID()),
  userId: z.string().uuid(),
  sessionName: z.string().min(1).max(100).default("Gym Session"),
  sessionType: SessionTypeEnum.default("custom"),
  status: SessionStatusEnum.default("in_progress"),
  startedAt: z.string().datetime().default(() => new Date().toISOString()),
  endedAt: z.string().datetime().optional(),
  elapsedMinutes: z.number().nonnegative().default(0),
  sessionNotes: z.string().optional(),
});
export type Layer4SessionMeta = z.infer<typeof Layer4SessionMetaSchema>;

// ---------------------------------------------------------------------------
// LAYER 5: Exercise & Set Execution Log
// ---------------------------------------------------------------------------
export const MovementPatternEnum = z.enum([
  "horizontal_push",
  "horizontal_pull",
  "vertical_push",
  "vertical_pull",
  "quad_dominant",
  "hip_hinge",
  "isolation",
  "carry_core",
]);
export const SetTypeEnum = z.enum([
  "warmup",
  "working",
  "drop_set",
  "myo_rep",
  "amrap",
  "cooldown",
]);

export const ExecutedSetSchema = z.object({
  setId: z.string().uuid().default(() => crypto.randomUUID()),
  setIndex: z.number().int().nonnegative(),
  setType: SetTypeEnum.default("working"),
  weightKg: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  targetReps: z.number().int().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().min(0).max(10).optional(), // Reps In Reserve
  tempo: z.string().regex(/^[0-9xX]-[0-9xX]-[0-9xX]-[0-9xX]$/).optional(), // e.g. "3-0-1-0"
  restSeconds: z.number().int().nonnegative().default(90),
  completedAt: z.string().datetime().default(() => new Date().toISOString()),
  setNotes: z.string().optional(),
});
export type ExecutedSet = z.infer<typeof ExecutedSetSchema>;

export const LoggedExerciseSchema = z.object({
  exerciseId: z.string().uuid().default(() => crypto.randomUUID()),
  exerciseName: z.string().min(1),
  movementPattern: MovementPatternEnum.default("isolation"),
  equipmentType: z.string().default("barbell"),
  orderIndex: z.number().int().nonnegative(),
  sets: z.array(ExecutedSetSchema).default([]),
});
export type LoggedExercise = z.infer<typeof LoggedExerciseSchema>;

export const Layer5ExecutionSchema = z.object({
  exercises: z.array(LoggedExerciseSchema).default([]),
  totalSetsCompleted: z.number().int().nonnegative().default(0),
  totalRepsCompleted: z.number().int().nonnegative().default(0),
  totalTonnageKg: z.number().nonnegative().default(0),
});
export type Layer5Execution = z.infer<typeof Layer5ExecutionSchema>;

// ---------------------------------------------------------------------------
// LAYER 6: Gym-Floor Shorthand Parser Telemetry
// ---------------------------------------------------------------------------
export const ParserStatusEnum = z.enum(["success", "ambiguous", "failed"]);

export const ParsedTokenSetSchema = z.object({
  exerciseToken: z.string().min(1),
  weightToken: z.number().nonnegative(),
  setsToken: z.number().int().positive(),
  repsToken: z.number().int().positive(),
  rpeToken: z.number().min(1).max(10).optional(),
  painToken: z
    .object({
      site: z.string(),
      sensation: PainSensationEnum,
      severity: z.number().int().min(1).max(10),
    })
    .optional(),
});
export type ParsedTokenSet = z.infer<typeof ParsedTokenSetSchema>;

export const Layer6ShorthandSchema = z.object({
  rawInput: z.string().trim().min(1),
  parserStatus: ParserStatusEnum.default("success"),
  parsedData: ParsedTokenSetSchema.optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  unparsedRemaining: z.string().optional(),
  errorMessage: z.string().optional(),
});
export type Layer6Shorthand = z.infer<typeof Layer6ShorthandSchema>;

// ---------------------------------------------------------------------------
// LAYER 7: Contextual Floor Constraints & Equipment
// ---------------------------------------------------------------------------
export const EquipmentStatusEnum = z.enum(["available", "occupied", "out_of_order"]);

export const Layer7ContextSchema = z.object({
  timeRemainingMinutes: z.number().int().nonnegative().default(45),
  isTimeConstrained: z.boolean().default(false), // e.g. < 20 mins remaining
  equipmentStatus: EquipmentStatusEnum.default("available"),
  equipmentSwapCandidate: z.string().optional(),
  gymCongestionLevel: z.enum(["empty", "moderate", "packed"]).default("moderate"),
  allowSupersets: z.boolean().default(false),
});
export type Layer7Context = z.infer<typeof Layer7ContextSchema>;

// ---------------------------------------------------------------------------
// LAYER 8: Deterministic Math & Progressive Overload Engine
// LAW: The LLM must NEVER perform arithmetic for 1RMs, calories, or overload.
// Always use deterministic algorithms in /lib/math.ts.
// ---------------------------------------------------------------------------
export const OverloadActionEnum = z.enum([
  "INCREMENT_LOAD",
  "INCREMENT_REPS",
  "MAINTAIN_LOAD",
  "DOWN_REGULATE_LOAD",
  "DELOAD",
  "ABORT_SAFETY",
]);

export const Layer8MathOverloadSchema = z.object({
  estimated1RMBrzycki: z.number().nonnegative().default(0),
  volumeLoadTonnage: z.number().nonnegative().default(0),
  estimatedCaloriesBurned: z.number().nonnegative().default(0),
  qualifiesForOverload: z.boolean().default(false),
  recommendedAction: OverloadActionEnum.default("MAINTAIN_LOAD"),
  recommendedLoadDeltaKg: z.number().default(0), // e.g. +2.5 or -10.0
  recommendedRepsDelta: z.number().int().default(0),
  arbitrationOverrideApplied: z.boolean().default(false), // true if Layer 0 stopped overload
});
export type Layer8MathOverload = z.infer<typeof Layer8MathOverloadSchema>;

// ---------------------------------------------------------------------------
// LAYER 9: Sub-30-Word Execution Mode Coaching Directive
// ---------------------------------------------------------------------------
export const DirectiveUrgencyEnum = z.enum(["CRITICAL", "ADAPT", "EXECUTE", "INFO"]);

export const Layer9ExecutionCoachSchema = z.object({
  urgency: DirectiveUrgencyEnum.default("EXECUTE"),
  directiveText: z
    .string()
    .min(1)
    .refine(
      (val) => {
        const wordCount = val.trim().split(/\s+/).filter(Boolean).length;
        return wordCount <= 30;
      },
      {
        message: "Execution coach directive MUST strictly contain 30 words or fewer for real-time gym floor consumption.",
      }
    ),
  wordCount: z.number().int().min(1).max(30),
  audioCuePrompt: z.string().optional(),
  cueCategory: z.enum(["safety", "load_adjustment", "technique", "rest", "swap"]).default("technique"),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type Layer9ExecutionCoach = z.infer<typeof Layer9ExecutionCoachSchema>;

// ============================================================================
// MASTER COMPOSITE STATE SCHEMA (THE COMPLETE 10-LAYER CANVAS)
// ============================================================================
export const MasterFitnessStateSchema = z.object({
  layer0_safety: Layer0SafetySchema,
  layer1_userProfile: Layer1UserProfileSchema,
  layer2_periodization: Layer2PeriodizationSchema,
  layer3_readiness: Layer3ReadinessSchema,
  layer4_sessionMeta: Layer4SessionMetaSchema,
  layer5_execution: Layer5ExecutionSchema,
  layer6_shorthand: Layer6ShorthandSchema.optional(),
  layer7_context: Layer7ContextSchema,
  layer8_mathOverload: Layer8MathOverloadSchema,
  layer9_coachDirective: Layer9ExecutionCoachSchema.optional(),
  schemaVersion: z.literal("1.0.0").default("1.0.0"),
  lastStateSync: z.string().datetime().default(() => new Date().toISOString()),
});
export type MasterFitnessState = z.infer<typeof MasterFitnessStateSchema>;

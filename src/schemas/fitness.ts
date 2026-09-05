import { z } from "zod";

/**
 * ============================================================================
 * THE MASTER JSON STATE SCHEMA CANVAS (10-LAYER PHYSIOLOGICAL & SAFETY CORE)
 * ============================================================================
 * Priority Arbitration Order:
 * Hard Stop ≻ Down-Regulator ≻ Context ≻ Overload
 *
 * Layers:
 * Layer 0: Safety & Arbitration (Hard Stop / Pain / Load & Volume Modifiers)
 * Layer 1: Biometric Baseline & Profile (Unit Disambiguation & Baseline Safety)
 * Layer 2: Periodization & Structured Contraindication Engine
 * Layer 3: Daily Readiness & Recovery
 * Layer 4: Active Session Telemetry & Human Override
 * Layer 5: Exercise & Set Execution Log (Set-Level Human Override)
 * Layer 6: Gym-Floor Shorthand Parser Telemetry
 * Layer 7: Contextual Floor Constraints & Equipment Availability
 * Layer 8: Deterministic Math, Overload & Physiological Fusion (HRV / MARI)
 * Layer 9: Sub-30-Word Execution Mode Coaching Directives
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// LAYER 0: Safety & Arbitration (Hard Stop / Pain / Down-Regulation Modifiers)
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

export const DownRegulationActionEnum = z.enum([
  "reduce_load",
  "reduce_sets",
  "substitute_exercise",
  "mandatory_rest",
]);
export type DownRegulationAction = z.infer<typeof DownRegulationActionEnum>;

export const ActiveDownRegulationSchema = z.object({
  source_layer: z.number().int().min(0).max(9),
  factor: z.string().min(1),
  recommended_action: DownRegulationActionEnum,
  magnitude_pct: z.number().min(0).max(100), // e.g. 15 for 15% reduction
});
export type ActiveDownRegulation = z.infer<typeof ActiveDownRegulationSchema>;

export const Layer0SafetySchema = z.object({
  // Hard-Stop Safeguards
  hard_stop_active: z.boolean().default(false),
  has_acute_pain: z.boolean().default(false),
  pain_site: z.string().trim().optional(),
  pain_severity: z.number().int().min(0).max(10).default(0), // 0-10 scale
  pain_sensation: PainSensationEnum.default("none"),
  joint_compromised: z.boolean().default(false),
  structural_failure: z.boolean().default(false),
  dizziness_or_faintness: z.boolean().default(false),
  abort_reason: z.string().optional(),
  requires_immediate_cooldown: z.boolean().default(false),

  // Arbitration & Modifiers
  arbitration_decision: ArbitrationDecisionEnum.default("MAINTAIN"),
  resolved_load_modifier: z.number().min(0).max(2.0).default(1.0),
  resolved_volume_modifier: z.number().min(0).max(2.0).default(1.0),
  active_down_regulations: z.array(ActiveDownRegulationSchema).default([]),
});
export type Layer0Safety = z.infer<typeof Layer0SafetySchema>;

// ---------------------------------------------------------------------------
// LAYER 1: Biometric Baseline & Profile (Unit Disambiguation & Baseline Safety)
// ---------------------------------------------------------------------------
export const PreferredUnitEnum = z.enum(["kg", "lb"]);
export type PreferredUnit = z.infer<typeof PreferredUnitEnum>;

export const RawWeightEntrySchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number().positive().max(1000),
  unit: PreferredUnitEnum,
  is_outlier: z.boolean().default(false),
});
export type RawWeightEntry = z.infer<typeof RawWeightEntrySchema>;

export const BaselineLiftsSchema = z.object({
  squat_1rm: z.number().nonnegative().default(0),
  bench_press_1rm: z.number().nonnegative().default(0),
  deadlift_1rm: z.number().nonnegative().default(0),
  overhead_press_1rm: z.number().nonnegative().default(0),
  barbell_row_1rm: z.number().nonnegative().default(0),
  pull_up_1rm: z.number().nonnegative().default(0),
});
export type BaselineLifts = z.infer<typeof BaselineLiftsSchema>;

export const Layer1UserProfileSchema = z.object({
  user_id: z.string().uuid().default(() => crypto.randomUUID()),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  age: z.number().int().positive().max(120),
  sex: z.enum(["male", "female", "other"]),
  height_cm: z.number().positive().max(300),
  preferred_unit: PreferredUnitEnum.default("kg"),
  current_weight: z.object({
    value: z.number().positive().max(1000),
    unit: PreferredUnitEnum,
  }),
  seven_day_weight_median: z.number().positive().max(1000),
  raw_weight_history: z.array(RawWeightEntrySchema).default([]),
  cold_start_active: z.boolean().default(true),
  cold_start_days_remaining: z.number().int().min(0).max(14).default(14),
  body_fat_percentage: z.number().min(3).max(70).optional(),
  training_age: z.enum(["novice", "intermediate", "advanced", "elite"]).default("intermediate"),
  baseline_lifts: BaselineLiftsSchema.default({
    squat_1rm: 0,
    bench_press_1rm: 0,
    deadlift_1rm: 0,
    overhead_press_1rm: 0,
    barbell_row_1rm: 0,
    pull_up_1rm: 0,
  }),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
});
export type Layer1UserProfile = z.infer<typeof Layer1UserProfileSchema>;

// ---------------------------------------------------------------------------
// LAYER 2: Periodization & Structured Contraindication Engine
// ---------------------------------------------------------------------------
export const InjurySeverityEnum = z.enum(["mild_doms", "tendon_strain", "joint_pain_acute"]);
export type InjurySeverity = z.infer<typeof InjurySeverityEnum>;

export const ActiveInjurySchema = z.object({
  anatomical_site: z.string().min(1),
  severity: InjurySeverityEnum,
  blacklisted_movement_patterns: z.array(z.string()).default([]),
  safe_substitutes: z.array(z.string()).default([]),
});
export type ActiveInjury = z.infer<typeof ActiveInjurySchema>;

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
  primary_goal: TrainingGoalEnum.default("hypertrophy"),
  current_mesocycle_phase: MesocyclePhaseEnum.default("accumulation"),
  mesocycle_week: z.number().int().min(1).max(16).default(1),
  total_mesocycle_weeks: z.number().int().min(1).max(16).default(6),
  target_weekly_frequency: z.number().int().min(1).max(7).default(4),
  target_rpe_range: z.tuple([z.number().min(5).max(10), z.number().min(5).max(10)]).default([7, 9]),
  deload_scheduled: z.boolean().default(false),
  active_injuries: z.array(ActiveInjurySchema).default([]),
});
export type Layer2Periodization = z.infer<typeof Layer2PeriodizationSchema>;

// ---------------------------------------------------------------------------
// LAYER 3: Daily Readiness & Recovery
// ---------------------------------------------------------------------------
export const SorenessMapSchema = z.record(
  z.string(),
  z.number().int().min(0).max(10)
);

export const Layer3ReadinessSchema = z.object({
  sleep_hours: z.number().min(0).max(24).default(7.5),
  sleep_quality_score: z.number().int().min(1).max(10).default(7),
  cns_fatigue_score: z.number().int().min(1).max(10).default(3), // 1=fresh, 10=exhausted
  systemic_soreness_score: z.number().int().min(1).max(10).default(3),
  stress_rating: z.number().int().min(1).max(10).default(4),
  nutrition_hydration_score: z.number().int().min(1).max(10).default(8),
  soreness_by_muscle_group: SorenessMapSchema.default({}),
  readiness_multiplier: z.number().min(0.5).max(1.15).default(1.0),
  down_regulate_active: z.boolean().default(false),
  down_regulate_reason: z.string().optional(),
});
export type Layer3Readiness = z.infer<typeof Layer3ReadinessSchema>;

// ---------------------------------------------------------------------------
// LAYER 4: Active Session Telemetry & Human Override
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
  session_id: z.string().uuid().default(() => crypto.randomUUID()),
  user_id: z.string().uuid(),
  session_name: z.string().min(1).max(100).default("Gym Session"),
  session_type: SessionTypeEnum.default("custom"),
  status: SessionStatusEnum.default("in_progress"),
  started_at: z.string().datetime().default(() => new Date().toISOString()),
  ended_at: z.string().datetime().optional(),
  elapsed_minutes: z.number().nonnegative().default(0),
  // Human Override Mandate: permanently overrides algorithmic prescriptions
  user_override_active: z.boolean().default(false),
  user_override_reason: z.string().optional(),
  session_notes: z.string().optional(),
});
export type Layer4SessionMeta = z.infer<typeof Layer4SessionMetaSchema>;

// ---------------------------------------------------------------------------
// LAYER 5: Exercise & Set Execution Log (Set-Level Human Override)
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
  set_id: z.string().uuid().default(() => crypto.randomUUID()),
  set_index: z.number().int().nonnegative(),
  set_type: SetTypeEnum.default("working"),
  load_value: z.number().nonnegative(),
  load_unit: PreferredUnitEnum.default("kg"),
  reps: z.number().int().nonnegative(),
  target_reps: z.number().int().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().min(0).max(10).optional(),
  tempo: z.string().regex(/^[0-9xX]-[0-9xX]-[0-9xX]-[0-9xX]$/).optional(),
  rest_seconds: z.number().int().nonnegative().default(90),
  completed_at: z.string().datetime().default(() => new Date().toISOString()),
  // Human Override on Individual Set
  user_override_active: z.boolean().default(false),
  user_override_notes: z.string().optional(),
  set_notes: z.string().optional(),
});
export type ExecutedSet = z.infer<typeof ExecutedSetSchema>;

export const LoggedExerciseSchema = z.object({
  exercise_id: z.string().uuid().default(() => crypto.randomUUID()),
  exercise_name: z.string().min(1),
  movement_pattern: MovementPatternEnum.default("isolation"),
  equipment_type: z.string().default("barbell"),
  order_index: z.number().int().nonnegative(),
  sets: z.array(ExecutedSetSchema).default([]),
});
export type LoggedExercise = z.infer<typeof LoggedExerciseSchema>;

export const Layer5ExecutionSchema = z.object({
  exercises: z.array(LoggedExerciseSchema).default([]),
  total_sets_completed: z.number().int().nonnegative().default(0),
  total_reps_completed: z.number().int().nonnegative().default(0),
  total_tonnage_kg: z.number().nonnegative().default(0),
});
export type Layer5Execution = z.infer<typeof Layer5ExecutionSchema>;

// ---------------------------------------------------------------------------
// LAYER 6: Gym-Floor Shorthand Parser Telemetry
// ---------------------------------------------------------------------------
export const ParserStatusEnum = z.enum(["success", "ambiguous", "failed"]);

export const ParsedTokenSetSchema = z.object({
  exercise_token: z.string().min(1),
  weight_token: z.number().nonnegative(),
  unit_token: PreferredUnitEnum.default("kg"),
  sets_token: z.number().int().positive(),
  reps_token: z.number().int().positive(),
  rpe_token: z.number().min(1).max(10).optional(),
  pain_token: z
    .object({
      site: z.string(),
      sensation: PainSensationEnum,
      severity: z.number().int().min(1).max(10),
    })
    .optional(),
});
export type ParsedTokenSet = z.infer<typeof ParsedTokenSetSchema>;

export const Layer6ShorthandSchema = z.object({
  raw_input: z.string().trim().min(1),
  parser_status: ParserStatusEnum.default("success"),
  parsed_data: ParsedTokenSetSchema.optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  unparsed_remaining: z.string().optional(),
  error_message: z.string().optional(),
});
export type Layer6Shorthand = z.infer<typeof Layer6ShorthandSchema>;

// ---------------------------------------------------------------------------
// LAYER 7: Contextual Floor Constraints & Equipment
// ---------------------------------------------------------------------------
export const EquipmentStatusEnum = z.enum(["available", "occupied", "out_of_order"]);

export const Layer7ContextSchema = z.object({
  time_remaining_minutes: z.number().int().nonnegative().default(45),
  is_time_constrained: z.boolean().default(false),
  equipment_status: EquipmentStatusEnum.default("available"),
  equipment_swap_candidate: z.string().optional(),
  gym_congestion_level: z.enum(["empty", "moderate", "packed"]).default("moderate"),
  allow_supersets: z.boolean().default(false),
});
export type Layer7Context = z.infer<typeof Layer7ContextSchema>;

// ---------------------------------------------------------------------------
// LAYER 8: Deterministic Math, Overload & Real Telemetry Fusion (HRV / MARI)
// LAW: The LLM must NEVER perform arithmetic for 1RMs, calories, or overload.
// Always use deterministic algorithms in /src/lib/math.ts.
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
  // Deterministic Math Outputs
  estimated_1rm_brzycki: z.number().nonnegative().default(0),
  volume_load_tonnage: z.number().nonnegative().default(0),
  estimated_calories_burned: z.number().nonnegative().default(0),
  qualifies_for_overload: z.boolean().default(false),
  recommended_action: OverloadActionEnum.default("MAINTAIN_LOAD"),
  recommended_load_delta_kg: z.number().default(0),
  recommended_reps_delta: z.number().int().default(0),
  arbitration_override_applied: z.boolean().default(false),

  // Real Telemetry & Fusion Fields
  hrv_rmssd_today: z.number().nullable().default(null),
  hrv_seven_day_baseline: z.number().nullable().default(null),
  hrv_z_score: z.number().nullable().default(null),
  sleep_efficiency_pct: z.number().nullable().default(null),
  composite_mari_score: z.number().nullable().default(null),
});
export type Layer8MathOverload = z.infer<typeof Layer8MathOverloadSchema>;

// ---------------------------------------------------------------------------
// LAYER 9: Sub-30-Word Execution Mode Coaching Directives
// ---------------------------------------------------------------------------
export const DirectiveUrgencyEnum = z.enum(["CRITICAL", "ADAPT", "EXECUTE", "INFO"]);

export const Layer9ExecutionCoachSchema = z.object({
  urgency: DirectiveUrgencyEnum.default("EXECUTE"),
  directive_text: z
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
  word_count: z.number().int().min(1).max(30),
  audio_cue_prompt: z.string().optional(),
  cue_category: z.enum(["safety", "load_adjustment", "technique", "rest", "swap"]).default("technique"),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type Layer9ExecutionCoach = z.infer<typeof Layer9ExecutionCoachSchema>;

// ============================================================================
// MASTER COMPOSITE STATE SCHEMA (THE COMPLETE 10-LAYER CANVAS)
// ============================================================================
export const MasterFitnessStateSchema = z.object({
  layer0_safety: Layer0SafetySchema,
  layer1_user_profile: Layer1UserProfileSchema,
  layer2_periodization: Layer2PeriodizationSchema,
  layer3_readiness: Layer3ReadinessSchema,
  layer4_session_meta: Layer4SessionMetaSchema,
  layer5_execution: Layer5ExecutionSchema,
  layer6_shorthand: Layer6ShorthandSchema.optional(),
  layer7_context: Layer7ContextSchema,
  layer8_math_fusion: Layer8MathOverloadSchema,
  layer9_coach_directive: Layer9ExecutionCoachSchema.optional(),
  schema_version: z.literal("1.0.0").default("1.0.0"),
  last_state_sync: z.string().datetime().default(() => new Date().toISOString()),
});
export type MasterFitnessState = z.infer<typeof MasterFitnessStateSchema>;

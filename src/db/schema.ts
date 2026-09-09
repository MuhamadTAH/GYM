import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type {
  PreferredUnit,
  RawWeightEntry,
  BaselineLifts,
  ActiveInjury,
  ActiveDownRegulation,
  ArbitrationDecision,
  PainSensation,
} from "../schemas/fitness";

/**
 * CORE RELATIONAL TABLE: user_profiles
 */
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  age: integer("age").notNull(),
  sex: text("sex", { enum: ["male", "female", "other"] }).notNull(),
  heightCm: real("height_cm").notNull(),
  preferredUnit: text("preferred_unit", { enum: ["kg", "lb"] })
    .$type<PreferredUnit>()
    .notNull()
    .default("kg"),
  currentWeightValue: real("current_weight_value").notNull(),
  currentWeightUnit: text("current_weight_unit", { enum: ["kg", "lb"] })
    .$type<PreferredUnit>()
    .notNull()
    .default("kg"),
  sevenDayWeightMedian: real("seven_day_weight_median").notNull(),
  coldStartActive: integer("cold_start_active", { mode: "boolean" })
    .notNull()
    .default(true),
  coldStartDaysRemaining: integer("cold_start_days_remaining")
    .notNull()
    .default(14),
  bodyFatPercentage: real("body_fat_percentage"),
  trainingAge: text("training_age").notNull().default("intermediate"),

  // Typed JSON sub-arrays
  rawWeightHistory: text("raw_weight_history", { mode: "json" })
    .$type<RawWeightEntry[]>()
    .notNull()
    .default([]),
  baselineLifts: text("baseline_lifts", { mode: "json" })
    .$type<BaselineLifts>()
    .notNull(),
  activeInjuries: text("active_injuries", { mode: "json" })
    .$type<ActiveInjury[]>()
    .notNull()
    .default([]),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * CORE RELATIONAL TABLE: workout_sessions
 */
export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  sessionName: text("session_name").notNull(),
  sessionType: text("session_type").notNull().default("custom"),
  status: text("status", {
    enum: ["planned", "in_progress", "completed", "aborted"],
  })
    .notNull()
    .default("in_progress"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  elapsedMinutes: real("elapsed_minutes").notNull().default(0),

  // Layer 0 Arbitration state
  arbitrationHardStop: integer("arbitration_hard_stop", { mode: "boolean" })
    .notNull()
    .default(false),
  arbitrationDecision: text("arbitration_decision")
    .$type<ArbitrationDecision>()
    .notNull()
    .default("MAINTAIN"),
  resolvedLoadModifier: real("resolved_load_modifier").notNull().default(1.0),
  resolvedVolumeModifier: real("resolved_volume_modifier")
    .notNull()
    .default(1.0),
  activeDownRegulations: text("active_down_regulations", { mode: "json" })
    .$type<ActiveDownRegulation[]>()
    .notNull()
    .default([]),

  // Human Override Mandate
  userOverrideActive: integer("user_override_active", { mode: "boolean" })
    .notNull()
    .default(false),
  userOverrideReason: text("user_override_reason"),
  sessionNotes: text("session_notes"),
});

/**
 * CORE RELATIONAL TABLE: exercise_sets
 */
export const exerciseSets = sqliteTable("exercise_sets", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  movementPattern: text("movement_pattern").notNull().default("isolation"),
  setNumber: integer("set_number").notNull(),
  setType: text("set_type").notNull().default("working"),
  loadValue: real("load_value").notNull(),
  loadUnit: text("load_unit", { enum: ["kg", "lb"] })
    .$type<PreferredUnit>()
    .notNull()
    .default("kg"),
  reps: integer("reps").notNull(),
  targetReps: integer("target_reps"),
  targetRpe: real("target_rpe"),
  loggedRpe: real("logged_rpe"),
  rir: real("rir"),
  tempo: text("tempo"),
  restSeconds: integer("rest_seconds").notNull().default(90),

  // Pain / Telemetry
  hasAcutePain: integer("has_acute_pain", { mode: "boolean" })
    .notNull()
    .default(false),
  painSite: text("pain_site"),
  painSeverity: integer("pain_severity").default(0),
  painSensation: text("pain_sensation").$type<PainSensation>().default("none"),

  // Human Override Mandate
  userOverrideActive: integer("user_override_active", { mode: "boolean" })
    .notNull()
    .default(false),
  userOverrideNotes: text("user_override_notes"),

  completedAt: text("completed_at").notNull(),
});

export type UserProfileRow = typeof userProfiles.$inferSelect;
export type InsertUserProfileRow = typeof userProfiles.$inferInsert;

export type WorkoutSessionRow = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSessionRow = typeof workoutSessions.$inferInsert;

export type ExerciseSetRow = typeof exerciseSets.$inferSelect;
export type InsertExerciseSetRow = typeof exerciseSets.$inferInsert;

/**
 * CORE RELATIONAL TABLE: coach_messages (Live Agent Bridge)
 */
export const coachMessages = sqliteTable("coach_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: text("status", { enum: ["pending", "processing", "replied"] })
    .notNull()
    .default("pending"),
  replyContent: text("reply_content"),
  actionReceipt: text("action_receipt", { mode: "json" }),
  createdAt: text("created_at").notNull(),
  repliedAt: text("replied_at"),
});

export type CoachMessageRow = typeof coachMessages.$inferSelect;
export type InsertCoachMessageRow = typeof coachMessages.$inferInsert;

/**
 * CORE RELATIONAL TABLE: athlete_daily_goals (Custom User Daily Targets & Check-ins)
 */
export const athleteDailyGoals = sqliteTable("athlete_daily_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),

  // Calories Target (nullable - starts empty)
  caloriesTarget: real("calories_target"),
  caloriesNotes: text("calories_notes"),

  // Protein Target (nullable - starts empty)
  proteinMinGrams: real("protein_min_grams"),
  proteinMaxGrams: real("protein_max_grams"),
  proteinNotes: text("protein_notes"),

  // Water Intake Target (nullable - starts empty)
  waterMinLiters: real("water_min_liters"),
  waterMaxLiters: real("water_max_liters"),
  waterNotes: text("water_notes"),

  // Daily Walk Target (nullable - starts empty)
  dailyWalkMinMinutes: real("daily_walk_min_minutes"),
  dailyWalkMaxMinutes: real("daily_walk_max_minutes"),
  dailyWalkNotes: text("daily_walk_notes"),

  // Training Adherence Target (nullable - starts empty)
  trainingDaysPerWeek: integer("training_days_per_week"),
  trainingNotes: text("training_notes"),

  // Live Today's Logged Metrics (starts at 0)
  todayCalories: real("today_calories").notNull().default(0),
  todayProtein: real("today_protein").notNull().default(0),
  todayWaterLiters: real("today_water_liters").notNull().default(0),
  todayWalkMinutes: real("today_walk_minutes").notNull().default(0),
  todayTrainingCompleted: integer("today_training_completed", { mode: "boolean" })
    .notNull()
    .default(false),

  updatedAt: text("updated_at").notNull(),
});

export type AthleteDailyGoalsRow = typeof athleteDailyGoals.$inferSelect;
export type InsertAthleteDailyGoalsRow = typeof athleteDailyGoals.$inferInsert;


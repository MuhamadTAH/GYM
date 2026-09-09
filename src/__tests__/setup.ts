import { createClient } from "@libsql/client";

const testDbUrl = process.env.DATABASE_URL || "file:test.db";
const client = createClient({ url: testDbUrl });

const ddl = `
CREATE TABLE IF NOT EXISTS user_profiles (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	email text,
	age integer NOT NULL,
	sex text NOT NULL,
	height_cm real NOT NULL,
	preferred_unit text DEFAULT 'kg' NOT NULL,
	current_weight_value real NOT NULL,
	current_weight_unit text DEFAULT 'kg' NOT NULL,
	seven_day_weight_median real NOT NULL,
	cold_start_active integer DEFAULT true NOT NULL,
	cold_start_days_remaining integer DEFAULT 14 NOT NULL,
	body_fat_percentage real,
	training_age text DEFAULT 'intermediate' NOT NULL,
	raw_weight_history text DEFAULT '[]' NOT NULL,
	baseline_lifts text NOT NULL,
	active_injuries text DEFAULT '[]' NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_sessions (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	session_name text NOT NULL,
	session_type text DEFAULT 'custom' NOT NULL,
	status text DEFAULT 'in_progress' NOT NULL,
	started_at text NOT NULL,
	ended_at text,
	elapsed_minutes real DEFAULT 0 NOT NULL,
	arbitration_hard_stop integer DEFAULT false NOT NULL,
	arbitration_decision text DEFAULT 'MAINTAIN' NOT NULL,
	resolved_load_modifier real DEFAULT 1 NOT NULL,
	resolved_volume_modifier real DEFAULT 1 NOT NULL,
	active_down_regulations text DEFAULT '[]' NOT NULL,
	user_override_active integer DEFAULT false NOT NULL,
	user_override_reason text,
	session_notes text,
	FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS exercise_sets (
	id text PRIMARY KEY NOT NULL,
	session_id text NOT NULL,
	exercise_id text NOT NULL,
	exercise_name text NOT NULL,
	movement_pattern text DEFAULT 'isolation' NOT NULL,
	set_number integer NOT NULL,
	set_type text DEFAULT 'working' NOT NULL,
	load_value real NOT NULL,
	load_unit text DEFAULT 'kg' NOT NULL,
	reps integer NOT NULL,
	target_reps integer,
	target_rpe real,
	logged_rpe real,
	rir real,
	tempo text,
	rest_seconds integer DEFAULT 90 NOT NULL,
	has_acute_pain integer DEFAULT false NOT NULL,
	pain_site text,
	pain_severity integer DEFAULT 0,
	pain_sensation text DEFAULT 'none',
	user_override_active integer DEFAULT false NOT NULL,
	user_override_notes text,
	completed_at text NOT NULL,
	FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS coach_messages (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	content text NOT NULL,
	status text DEFAULT 'pending' NOT NULL,
	reply_content text,
	action_receipt text,
	created_at text NOT NULL,
	replied_at text,
	FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS athlete_daily_goals (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	calories_target real,
	calories_notes text,
	protein_min_grams real,
	protein_max_grams real,
	protein_notes text,
	water_min_liters real,
	water_max_liters real,
	water_notes text,
	daily_walk_min_minutes real,
	daily_walk_max_minutes real,
	daily_walk_notes text,
	training_days_per_week integer,
	training_notes text,
	weekly_workouts_target integer,
	weekly_walk_minutes_target integer,
	weekly_calorie_deficit_target integer,
	weekly_focus_notes text,
	weekly_split_schedule text,
	monthly_mesocycle_name text,
	monthly_primary_goal text,
	monthly_weight_loss_target_kg real,
	monthly_total_workouts_target integer,
	monthly_focus_notes text,
	monthly_phases text,
	today_calories real DEFAULT 0 NOT NULL,
	today_protein real DEFAULT 0 NOT NULL,
	today_water_liters real DEFAULT 0 NOT NULL,
	today_walk_minutes real DEFAULT 0 NOT NULL,
	today_training_completed integer DEFAULT false NOT NULL,
	today_logged_items text,
	updated_at text NOT NULL,
	FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON UPDATE no action ON DELETE cascade
);
`;

await client.executeMultiple(ddl);

import { describe, it, expect } from "vitest";
import {
  MasterFitnessStateSchema,
  Layer0SafetySchema,
  Layer1UserProfileSchema,
  Layer2PeriodizationSchema,
  Layer4SessionMetaSchema,
  ExecutedSetSchema,
  Layer8MathOverloadSchema,
  Layer9ExecutionCoachSchema,
} from "../schemas/fitness";

describe("True 10-Layer Master Schema Canvas & Physiological Safeguards", () => {
  it("should validate a complete master fitness state matching the exact architectural specification", () => {
    const validMasterPayload = {
      layer0_safety: {
        hard_stop_active: false,
        has_acute_pain: false,
        pain_severity: 0,
        pain_sensation: "none",
        joint_compromised: false,
        structural_failure: false,
        dizziness_or_faintness: false,
        requires_immediate_cooldown: false,
        arbitration_decision: "DOWN_REGULATE",
        resolved_load_modifier: 0.9,
        resolved_volume_modifier: 0.85,
        active_down_regulations: [
          {
            source_layer: 3,
            factor: "Elevated CNS fatigue (score: 8/10) following back-to-back heavy sessions",
            recommended_action: "reduce_load",
            magnitude_pct: 10,
          },
        ],
      },
      layer1_user_profile: {
        user_id: crypto.randomUUID(),
        name: "Muhamad",
        age: 28,
        sex: "male",
        height_cm: 180,
        preferred_unit: "kg",
        current_weight: {
          value: 84.2,
          unit: "kg",
        },
        seven_day_weight_median: 84.0,
        raw_weight_history: [
          {
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            value: 83.9,
            unit: "kg",
            is_outlier: false,
          },
          {
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            value: 84.1,
            unit: "kg",
            is_outlier: false,
          },
          {
            timestamp: new Date().toISOString(),
            value: 84.2,
            unit: "kg",
            is_outlier: false,
          },
        ],
        cold_start_active: false,
        cold_start_days_remaining: 0,
        body_fat_percentage: 14.5,
        training_age: "advanced",
        baseline_lifts: {
          squat_1rm: 160,
          bench_press_1rm: 120,
          deadlift_1rm: 200,
          overhead_press_1rm: 80,
          barbell_row_1rm: 110,
          pull_up_1rm: 40,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      layer2_periodization: {
        primary_goal: "hypertrophy",
        current_mesocycle_phase: "accumulation",
        mesocycle_week: 3,
        total_mesocycle_weeks: 6,
        target_weekly_frequency: 4,
        target_rpe_range: [7, 9],
        deload_scheduled: false,
        active_injuries: [
          {
            anatomical_site: "Left Patellar Tendon",
            severity: "tendon_strain",
            blacklisted_movement_patterns: ["deep_knee_flexion_quad_dominant", "heavy_front_squat"],
            safe_substitutes: ["box_squat_vertical_shin", "romanian_deadlift"],
          },
        ],
      },
      layer3_readiness: {
        sleep_hours: 6.2,
        sleep_quality_score: 5,
        cns_fatigue_score: 8,
        systemic_soreness_score: 6,
        stress_rating: 6,
        nutrition_hydration_score: 7,
        soreness_by_muscle_group: { hamstrings: 7, lower_back: 6 },
        readiness_multiplier: 0.88,
        down_regulate_active: true,
        down_regulate_reason: "High CNS fatigue + poor sleep quality",
      },
      layer4_session_meta: {
        session_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        session_name: "Lower Body Accumulation",
        session_type: "lower",
        status: "in_progress",
        started_at: new Date().toISOString(),
        elapsed_minutes: 32,
        user_override_active: false,
      },
      layer5_execution: {
        exercises: [
          {
            exercise_id: crypto.randomUUID(),
            exercise_name: "Safety Bar Box Squat",
            movementPattern: "quad_dominant",
            equipment_type: "safety_squat_bar",
            order_index: 0,
            sets: [
              {
                set_id: crypto.randomUUID(),
                set_index: 0,
                set_type: "working",
                load_value: 125,
                load_unit: "kg",
                reps: 6,
                target_reps: 6,
                rpe: 7.5,
                rir: 2,
                tempo: "3-1-1-0",
                rest_seconds: 150,
                completed_at: new Date().toISOString(),
                user_override_active: false,
              },
            ],
          },
        ],
        total_sets_completed: 1,
        total_reps_completed: 6,
        total_tonnage_kg: 750,
      },
      layer7_context: {
        time_remaining_minutes: 35,
        is_time_constrained: false,
        equipment_status: "available",
        gym_congestion_level: "moderate",
        allow_supersets: false,
      },
      layer8_math_fusion: {
        estimated_1rm_brzycki: 145.1,
        volume_load_tonnage: 750,
        estimated_calories_burned: 110,
        qualifies_for_overload: false,
        recommended_action: "DOWN_REGULATE_LOAD",
        recommended_load_delta_kg: -12.5,
        recommended_reps_delta: 0,
        arbitration_override_applied: true,
        hrv_rmssd_today: 42.5,
        hrv_seven_day_baseline: 58.0,
        hrv_z_score: -1.85,
        sleep_efficiency_pct: 78.4,
        composite_mari_score: 54.2,
      },
      layer9_coach_directive: {
        urgency: "ADAPT",
        directive_text: "Fatigue high. Drop load 12.5kg on next set. Maintain vertical shins. Rest 2.5 minutes.",
        word_count: 15,
        cue_category: "load_adjustment",
        timestamp: new Date().toISOString(),
      },
      schema_version: "1.0.0",
      last_state_sync: new Date().toISOString(),
    };

    const result = MasterFitnessStateSchema.safeParse(validMasterPayload);
    if (!result.success) {
      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("should validate Layer 0 arbitration state with modifiers and down-regulations", () => {
    const l0Payload = {
      hard_stop_active: false,
      has_acute_pain: false,
      pain_severity: 2,
      pain_sensation: "dull",
      joint_compromised: false,
      structural_failure: false,
      dizziness_or_faintness: false,
      arbitration_decision: "DOWN_REGULATE",
      resolved_load_modifier: 0.85,
      resolved_volume_modifier: 0.8,
      active_down_regulations: [
        {
          source_layer: 8,
          factor: "HRV z-score depressed (-2.1) + sleep efficiency < 75%",
          recommended_action: "reduce_load",
          magnitude_pct: 15,
        },
      ],
    };

    const parsed = Layer0SafetySchema.safeParse(l0Payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resolved_load_modifier).toBe(0.85);
      expect(parsed.data.resolved_volume_modifier).toBe(0.8);
      expect(parsed.data.active_down_regulations[0].recommended_action).toBe("reduce_load");
      expect(parsed.data.active_down_regulations[0].magnitude_pct).toBe(15);
    }
  });

  it("should validate Layer 1 unit disambiguation, weight history, and cold-start baseline", () => {
    const l1Payload = {
      user_id: crypto.randomUUID(),
      name: "Atlas",
      age: 30,
      sex: "male",
      height_cm: 182,
      preferred_unit: "lb",
      current_weight: {
        value: 195.5,
        unit: "lb",
      },
      seven_day_weight_median: 194.8,
      raw_weight_history: [
        {
          timestamp: new Date().toISOString(),
          value: 195.5,
          unit: "lb",
          is_outlier: false,
        },
      ],
      cold_start_active: true,
      cold_start_days_remaining: 10,
      training_age: "novice",
      baseline_lifts: {
        squat_1rm: 225,
        bench_press_1rm: 185,
        deadlift_1rm: 315,
        overhead_press_1rm: 115,
        barbell_row_1rm: 155,
        pull_up_1rm: 0,
      },
    };

    const parsed = Layer1UserProfileSchema.safeParse(l1Payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.preferred_unit).toBe("lb");
      expect(parsed.data.cold_start_active).toBe(true);
      expect(parsed.data.cold_start_days_remaining).toBe(10);
      expect(parsed.data.seven_day_weight_median).toBe(194.8);
    }
  });

  it("should validate Layer 2 structured contraindication engine", () => {
    const l2Payload = {
      primary_goal: "maximum_strength",
      current_mesocycle_phase: "intensification",
      mesocycle_week: 4,
      total_mesocycle_weeks: 8,
      target_weekly_frequency: 5,
      target_rpe_range: [8, 9.5],
      deload_scheduled: false,
      active_injuries: [
        {
          anatomical_site: "Right AC Joint",
          severity: "joint_pain_acute",
          blacklisted_movement_patterns: ["overhead_press", "wide_grip_bench"],
          safe_substitutes: ["neutral_grip_dumbbell_press", "landmine_press"],
        },
      ],
    };

    const parsed = Layer2PeriodizationSchema.safeParse(l2Payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.active_injuries.length).toBe(1);
      expect(parsed.data.active_injuries[0].severity).toBe("joint_pain_acute");
      expect(parsed.data.active_injuries[0].blacklisted_movement_patterns).toContain("overhead_press");
      expect(parsed.data.active_injuries[0].safe_substitutes).toContain("landmine_press");
    }
  });

  it("should validate Layer 8 physiological telemetry fusion fields", () => {
    const l8Payload = {
      estimated_1rm_brzycki: 150,
      volume_load_tonnage: 3000,
      estimated_calories_burned: 280,
      qualifies_for_overload: true,
      recommended_action: "INCREMENT_LOAD",
      recommended_load_delta_kg: 2.5,
      recommended_reps_delta: 0,
      arbitration_override_applied: false,
      hrv_rmssd_today: 65.4,
      hrv_seven_day_baseline: 62.0,
      hrv_z_score: 0.55,
      sleep_efficiency_pct: 91.2,
      composite_mari_score: 88.0,
    };

    const parsed = Layer8MathOverloadSchema.safeParse(l8Payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.hrv_rmssd_today).toBe(65.4);
      expect(parsed.data.hrv_z_score).toBe(0.55);
      expect(parsed.data.sleep_efficiency_pct).toBe(91.2);
      expect(parsed.data.composite_mari_score).toBe(88.0);
    }
  });

  it("should support nullable physiological telemetry fields when sensor is not worn", () => {
    const l8NullPayload = {
      estimated_1rm_brzycki: 100,
      volume_load_tonnage: 1000,
      estimated_calories_burned: 90,
      qualifies_for_overload: false,
      recommended_action: "MAINTAIN_LOAD",
      recommended_load_delta_kg: 0,
      recommended_reps_delta: 0,
      arbitration_override_applied: false,
      hrv_rmssd_today: null,
      hrv_seven_day_baseline: null,
      hrv_z_score: null,
      sleep_efficiency_pct: null,
      composite_mari_score: null,
    };

    const parsed = Layer8MathOverloadSchema.safeParse(l8NullPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.hrv_rmssd_today).toBeNull();
      expect(parsed.data.composite_mari_score).toBeNull();
    }
  });

  it("should enforce the Human Override Mandate on session and set levels", () => {
    const session = Layer4SessionMetaSchema.safeParse({
      session_id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      user_override_active: true,
      user_override_reason: "Athlete feels strong despite low HRV score; proceeding with planned weights",
    });
    expect(session.success).toBe(true);
    if (session.success) {
      expect(session.data.user_override_active).toBe(true);
      expect(session.data.user_override_reason).toBeDefined();
    }

    const set = ExecutedSetSchema.safeParse({
      set_id: crypto.randomUUID(),
      set_index: 1,
      load_value: 100,
      load_unit: "kg",
      reps: 5,
      user_override_active: true,
      user_override_notes: "Ignored deload cue; completed prescribed 5 reps clean",
    });
    expect(set.success).toBe(true);
    if (set.success) {
      expect(set.data.user_override_active).toBe(true);
    }
  });

  it("should strictly enforce sub-30-word limit on execution coach directives", () => {
    const validCoach = Layer9ExecutionCoachSchema.safeParse({
      urgency: "CRITICAL",
      directive_text: "Hard stop. Acute shoulder pain flagged. Abort bench press immediately. Do not test joint.",
      word_count: 14,
      cue_category: "safety",
    });
    expect(validCoach.success).toBe(true);

    const verboseCoach = Layer9ExecutionCoachSchema.safeParse({
      urgency: "EXECUTE",
      directive_text:
        "You did very well on that set of bench press! Today we are looking to push progressive overload by adding five pounds to the bar, but please make sure you keep your shoulder blades fully pinched together and maintain proper arch in your lumbar spine as you touch the chest.",
      word_count: 47,
      cue_category: "technique",
    });
    expect(verboseCoach.success).toBe(false);
  });
});

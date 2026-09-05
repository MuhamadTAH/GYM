import type {
  ArbitrationDecision,
  ActiveDownRegulation,
  PainSensation,
} from "../schemas/fitness";

/**
 * ============================================================================
 * LAYER 0 ARBITRATION RESOLUTION ENGINE
 * PRIORITY ORDER: Hard Stop ≻ Down-Regulator ≻ Context ≻ Overload
 * ============================================================================
 */

export interface ArbitrationInputs {
  // P0: Health / Safety Flags
  has_acute_pain: boolean;
  pain_severity?: number; // 0-10
  pain_sensation?: PainSensation;
  pain_site?: string;
  joint_compromised?: boolean;
  structural_failure?: boolean;
  dizziness_or_faintness?: boolean;

  // P1: Physiological Readiness & Telemetry
  cns_fatigue_score?: number; // 1-10
  systemic_soreness_score?: number; // 1-10
  readiness_multiplier?: number; // e.g. 0.85
  hrv_z_score?: number | null; // e.g. -1.8
  sleep_efficiency_pct?: number | null; // e.g. 68%

  // P2: Contextual Constraints
  is_time_constrained?: boolean;
  time_remaining_minutes?: number;
  equipment_occupied?: boolean;

  // P3: Proposed Overload (from Layer 8 / previous set)
  proposed_overload_qualified?: boolean;
  proposed_load_delta_kg?: number;

  // Human Override
  user_override_active?: boolean;
  user_override_reason?: string;
}

export interface ArbitrationResult {
  hard_stop_active: boolean;
  arbitration_decision: ArbitrationDecision;
  resolved_load_modifier: number; // 0.0 to 1.1
  resolved_volume_modifier: number; // 0.0 to 1.0
  active_down_regulations: ActiveDownRegulation[];
  abort_reason?: string;
  action_summary: string;
  overload_permitted: boolean;
}

const ACUTE_SENSATIONS: PainSensation[] = [
  "sharp",
  "popping",
  "shooting",
  "tearing",
];

/**
 * Executes Layer 0 Arbitration following the non-negotiable priority order:
 * Hard Stop ≻ Down-Regulator ≻ Context ≻ Overload
 */
export function resolveArbitration(inputs: ArbitrationInputs): ArbitrationResult {
  const {
    has_acute_pain,
    pain_severity = 0,
    pain_sensation = "none",
    pain_site = "unspecified",
    joint_compromised = false,
    structural_failure = false,
    dizziness_or_faintness = false,
    cns_fatigue_score = 3,
    systemic_soreness_score = 3,
    readiness_multiplier = 1.0,
    hrv_z_score = null,
    sleep_efficiency_pct = null,
    is_time_constrained = false,
    time_remaining_minutes = 45,
    equipment_occupied = false,
    proposed_overload_qualified = false,
    user_override_active = false,
    user_override_reason,
  } = inputs;

  // -------------------------------------------------------------------------
  // PRIORITY 0: HARD STOP (Immediate Abort - Non-Negotiable)
  // An acute pain flag or structural hazard forces an immediate abort
  // regardless of ANY overload or progression prescription.
  // -------------------------------------------------------------------------
  const isSeverePain = has_acute_pain && (pain_severity >= 7 || ACUTE_SENSATIONS.includes(pain_sensation));
  const isStructuralHazard = joint_compromised || structural_failure || dizziness_or_faintness;

  if (isSeverePain || isStructuralHazard) {
    let reason = "Immediate safety abort:";
    if (joint_compromised) reason += " Joint integrity compromised.";
    if (structural_failure) reason += " Structural/movement failure detected.";
    if (dizziness_or_faintness) reason += " Dizziness or systemic faintness flagged.";
    if (isSeverePain) {
      reason += ` Acute ${pain_sensation} pain at ${pain_site} (severity ${pain_severity}/10).`;
    }

    return {
      hard_stop_active: true,
      arbitration_decision: "HARD_STOP",
      resolved_load_modifier: 0.0,
      resolved_volume_modifier: 0.0,
      active_down_regulations: [
        {
          source_layer: 0,
          factor: reason,
          recommended_action: "mandatory_rest",
          magnitude_pct: 100,
        },
      ],
      abort_reason: reason,
      action_summary: "HARD STOP: Cease exercise immediately. Mandatory safety cooldown.",
      overload_permitted: false,
    };
  }

  // -------------------------------------------------------------------------
  // PRIORITY 1: DOWN-REGULATOR (Load / Volume Reduction)
  // -------------------------------------------------------------------------
  const downRegulations: ActiveDownRegulation[] = [];
  let loadModifier = 1.0;
  let volumeModifier = 1.0;

  // Moderate Pain (non-acute, e.g. tendon irritation or dull pain)
  if (has_acute_pain && pain_severity >= 4) {
    downRegulations.push({
      source_layer: 0,
      factor: `Moderate pain (${pain_sensation}) at ${pain_site} (severity ${pain_severity}/10)`,
      recommended_action: "reduce_load",
      magnitude_pct: 20,
    });
    loadModifier *= 0.8;
  }

  // High CNS Fatigue or high systemic soreness
  if (cns_fatigue_score >= 7 || systemic_soreness_score >= 7) {
    downRegulations.push({
      source_layer: 3,
      factor: `Elevated fatigue/soreness (CNS: ${cns_fatigue_score}/10, Soreness: ${systemic_soreness_score}/10)`,
      recommended_action: "reduce_sets",
      magnitude_pct: 15,
    });
    volumeModifier *= 0.85;
    loadModifier *= 0.95;
  }

  // Physiological Telemetry Drops (HRV z-score / Sleep efficiency)
  if (hrv_z_score !== null && hrv_z_score <= -1.5) {
    downRegulations.push({
      source_layer: 8,
      factor: `Depressed autonomic recovery (HRV z-score: ${hrv_z_score.toFixed(2)})`,
      recommended_action: "reduce_load",
      magnitude_pct: 10,
    });
    loadModifier *= 0.9;
  }

  if (sleep_efficiency_pct !== null && sleep_efficiency_pct < 70) {
    downRegulations.push({
      source_layer: 8,
      factor: `Low sleep efficiency (${sleep_efficiency_pct.toFixed(1)}%)`,
      recommended_action: "reduce_sets",
      magnitude_pct: 10,
    });
    volumeModifier *= 0.9;
  }

  // Down-regulation multiplier from readiness check
  if (readiness_multiplier < 0.9) {
    loadModifier *= readiness_multiplier;
  }

  if (downRegulations.length > 0) {
    // If human override is active, log it but respect user choice
    if (user_override_active) {
      return {
        hard_stop_active: false,
        arbitration_decision: "MAINTAIN",
        resolved_load_modifier: 1.0,
        resolved_volume_modifier: 1.0,
        active_down_regulations: downRegulations,
        action_summary: `Human override active (${user_override_reason ?? "User confirmed ready"}). Down-regulation suppressed.`,
        overload_permitted: true,
      };
    }

    return {
      hard_stop_active: false,
      arbitration_decision: "DOWN_REGULATE",
      resolved_load_modifier: Math.round(loadModifier * 100) / 100,
      resolved_volume_modifier: Math.round(volumeModifier * 100) / 100,
      active_down_regulations: downRegulations,
      action_summary: `Down-regulated: Load reduced by ${Math.round((1 - loadModifier) * 100)}%, volume reduced by ${Math.round((1 - volumeModifier) * 100)}%.`,
      overload_permitted: false,
    };
  }

  // -------------------------------------------------------------------------
  // PRIORITY 2: CONTEXTUAL ADAPTATION (Time Crunch / Equipment)
  // -------------------------------------------------------------------------
  if (is_time_constrained || time_remaining_minutes < 20 || equipment_occupied) {
    let contextSummary = "Contextual adjustment:";
    if (is_time_constrained || time_remaining_minutes < 20) {
      contextSummary += ` Time remaining (${time_remaining_minutes}m). Volume condensed.`;
      volumeModifier = 0.75;
    }
    if (equipment_occupied) {
      contextSummary += " Equipment occupied. Substitute exercise advised.";
    }

    return {
      hard_stop_active: false,
      arbitration_decision: "CONTEXT_ADAPT",
      resolved_load_modifier: 1.0,
      resolved_volume_modifier: volumeModifier,
      active_down_regulations: [],
      action_summary: contextSummary,
      overload_permitted: !equipment_occupied,
    };
  }

  // -------------------------------------------------------------------------
  // PRIORITY 3: PROGRESSIVE OVERLOAD
  // Only reached when Hard Stop, Down-Regulator, and Context are all CLEAR.
  // -------------------------------------------------------------------------
  if (proposed_overload_qualified) {
    return {
      hard_stop_active: false,
      arbitration_decision: "OVERLOAD",
      resolved_load_modifier: 1.0,
      resolved_volume_modifier: 1.0,
      active_down_regulations: [],
      action_summary: "All constraints clear. Progressive overload approved.",
      overload_permitted: true,
    };
  }

  // Default: Maintain baseline
  return {
    hard_stop_active: false,
    arbitration_decision: "MAINTAIN",
    resolved_load_modifier: 1.0,
    resolved_volume_modifier: 1.0,
    active_down_regulations: [],
    action_summary: "State nominal. Maintain prescribed training load.",
    overload_permitted: false,
  };
}

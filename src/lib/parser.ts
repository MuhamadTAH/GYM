import type { PreferredUnit, PainSensation, MovementPattern } from "../schemas/fitness";
import { resolveArbitration, type ArbitrationResult } from "./arbitration";

/**
 * ============================================================================
 * RESILIENT GYM FLOOR SHORTHAND PARSER
 * ============================================================================
 * Handles diverse gym notations without throwing:
 * - "bench 100kg 3x5 rpe8"
 * - "sq 140 5,5,5 @ 8.5"
 * - "deadlift 225lb 1x5 rir 2"
 * - "ohp 60 3x8"
 * - "squat 100 1x1 pain:knee sharp 8"
 * ============================================================================
 */

export interface ParsedSetEntry {
  set_index: number;
  reps: number;
  load_value: number;
  load_unit: PreferredUnit;
}

export interface ParsedPainTelemetry {
  has_pain: boolean;
  site: string;
  sensation: PainSensation;
  severity: number;
}

export interface ParsedShorthand {
  success: boolean;
  exercise_name: string;
  movement_pattern: MovementPattern;
  load_value: number;
  load_unit: PreferredUnit;
  sets: ParsedSetEntry[];
  total_sets: number;
  reps_per_set: number[];
  rpe?: number;
  rir?: number;
  pain_telemetry?: ParsedPainTelemetry;
  arbitration_hard_stop: boolean;
  arbitration_result?: ArbitrationResult;
  error_message?: string;
  raw_input: string;
}

interface AliasMapping {
  canonicalName: string;
  pattern: MovementPattern;
}

const EXERCISE_ALIASES: Record<string, AliasMapping> = {
  // Squat variants
  sq: { canonicalName: "squat", pattern: "quad_dominant" },
  squat: { canonicalName: "squat", pattern: "quad_dominant" },
  squats: { canonicalName: "squat", pattern: "quad_dominant" },
  bs: { canonicalName: "back_squat", pattern: "quad_dominant" },
  backsquat: { canonicalName: "back_squat", pattern: "quad_dominant" },
  frontsquat: { canonicalName: "front_squat", pattern: "quad_dominant" },
  fs: { canonicalName: "front_squat", pattern: "quad_dominant" },

  // Bench press variants
  bp: { canonicalName: "bench_press", pattern: "horizontal_push" },
  bench: { canonicalName: "bench_press", pattern: "horizontal_push" },
  benchpress: { canonicalName: "bench_press", pattern: "horizontal_push" },
  incline_bench: { canonicalName: "incline_bench_press", pattern: "horizontal_push" },
  db_bench: { canonicalName: "dumbbell_bench_press", pattern: "horizontal_push" },

  // Deadlift variants
  dl: { canonicalName: "deadlift", pattern: "hip_hinge" },
  deadlift: { canonicalName: "deadlift", pattern: "hip_hinge" },
  deadlifts: { canonicalName: "deadlift", pattern: "hip_hinge" },
  rdl: { canonicalName: "romanian_deadlift", pattern: "hip_hinge" },
  sumo: { canonicalName: "sumo_deadlift", pattern: "hip_hinge" },

  // Overhead press variants
  ohp: { canonicalName: "overhead_press", pattern: "vertical_push" },
  press: { canonicalName: "overhead_press", pattern: "vertical_push" },
  shoulder_press: { canonicalName: "overhead_press", pattern: "vertical_push" },
  military_press: { canonicalName: "overhead_press", pattern: "vertical_push" },

  // Row variants
  row: { canonicalName: "barbell_row", pattern: "horizontal_pull" },
  rows: { canonicalName: "barbell_row", pattern: "horizontal_pull" },
  bb_row: { canonicalName: "barbell_row", pattern: "horizontal_pull" },
  barbell_row: { canonicalName: "barbell_row", pattern: "horizontal_pull" },

  // Pull-up variants
  pullup: { canonicalName: "pull_up", pattern: "vertical_pull" },
  pullups: { canonicalName: "pull_up", pattern: "vertical_pull" },
  pull_up: { canonicalName: "pull_up", pattern: "vertical_pull" },
  chin: { canonicalName: "chin_up", pattern: "vertical_pull" },
  chins: { canonicalName: "chin_up", pattern: "vertical_pull" },
  chinup: { canonicalName: "chin_up", pattern: "vertical_pull" },
};

const VALID_SENSATIONS: PainSensation[] = [
  "none",
  "dull",
  "tightness",
  "burning",
  "pinching",
  "sharp",
  "shooting",
  "popping",
  "tearing",
];

export function parseGymShorthand(
  rawInput: string,
  defaultUnit: PreferredUnit = "kg"
): ParsedShorthand {
  const trimmed = (rawInput || "").trim();

  if (!trimmed) {
    return {
      success: false,
      exercise_name: "",
      movement_pattern: "isolation",
      load_value: 0,
      load_unit: defaultUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: "Input string is empty.",
      raw_input: rawInput,
    };
  }

  let remaining = trimmed;

  // 1. Extract Pain Telemetry (e.g. "pain:knee sharp 8" or "pain:shoulder:sharp:8")
  let painTelemetry: ParsedPainTelemetry | undefined;
  const painRegex = /pain:\s*([a-zA-Z_]+)(?:[\s:]+([a-zA-Z_]+))?(?:[\s:]+(\d{1,2}))?/i;
  const painMatch = remaining.match(painRegex);

  if (painMatch) {
    const site = (painMatch[1] || "unspecified").toLowerCase().replace(/_/g, " ");
    let sensation: PainSensation = "dull";
    let severity = 5;

    const rawSensation = (painMatch[2] || "").toLowerCase();
    if (VALID_SENSATIONS.includes(rawSensation as PainSensation)) {
      sensation = rawSensation as PainSensation;
    } else if (rawSensation && !isNaN(Number(rawSensation))) {
      severity = Math.min(10, Math.max(0, parseInt(rawSensation, 10)));
    }

    if (painMatch[3]) {
      severity = Math.min(10, Math.max(0, parseInt(painMatch[3], 10)));
    }

    painTelemetry = {
      has_pain: sensation !== "none" && severity > 0,
      site,
      sensation,
      severity,
    };

    // Remove pain clause from remaining text
    remaining = remaining.replace(painMatch[0], "").trim();
  }

  // 2. Extract RPE / RIR (e.g. "rpe8.5", "rpe 8", "@ 8.5", "@8", "rir 2", "rir2")
  let rpe: number | undefined;
  let rir: number | undefined;

  const rpeRegex = /(?:rpe|@)\s*([0-9]+(?:\.[0-9]+)?)/i;
  const rpeMatch = remaining.match(rpeRegex);
  if (rpeMatch) {
    const val = parseFloat(rpeMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      rpe = val;
    }
    remaining = remaining.replace(rpeMatch[0], "").trim();
  }

  const rirRegex = /rir\s*([0-9]+(?:\.[0-9]+)?)/i;
  const rirMatch = remaining.match(rirRegex);
  if (rirMatch) {
    const val = parseFloat(rirMatch[1]);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      rir = val;
      if (rpe === undefined) {
        rpe = Math.max(1, 10 - val);
      }
    }
    remaining = remaining.replace(rirMatch[0], "").trim();
  }

  // 3. Extract Exercise Identifier (First token / phrase)
  const tokens = remaining.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return {
      success: false,
      exercise_name: "",
      movement_pattern: "isolation",
      load_value: 0,
      load_unit: defaultUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: "Could not identify exercise name.",
      raw_input: rawInput,
    };
  }

  // Check 2-word exercise names first (e.g. "bench press", "back squat")
  let exerciseKey = "";
  let aliasData: AliasMapping | undefined;
  let tokenCursor = 0;

  if (tokens.length >= 2) {
    const twoWordCandidate = `${tokens[0]}_${tokens[1]}`.toLowerCase();
    if (EXERCISE_ALIASES[twoWordCandidate]) {
      exerciseKey = twoWordCandidate;
      aliasData = EXERCISE_ALIASES[twoWordCandidate];
      tokenCursor = 2;
    }
  }

  if (!aliasData && tokens.length >= 1) {
    const oneWordCandidate = tokens[0].toLowerCase();
    if (EXERCISE_ALIASES[oneWordCandidate]) {
      exerciseKey = oneWordCandidate;
      aliasData = EXERCISE_ALIASES[oneWordCandidate];
      tokenCursor = 1;
    } else {
      // Fallback: accept custom exercise token as is
      exerciseKey = oneWordCandidate;
      aliasData = {
        canonicalName: oneWordCandidate,
        pattern: "isolation",
      };
      tokenCursor = 1;
    }
  }

  if (!aliasData) {
    return {
      success: false,
      exercise_name: "",
      movement_pattern: "isolation",
      load_value: 0,
      load_unit: defaultUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: "Failed to resolve exercise name.",
      raw_input: rawInput,
    };
  }

  // 4. Extract Load & Unit
  // Next token is expected to be load, e.g. "100kg", "100", "225lb", "140.5"
  if (tokenCursor >= tokens.length) {
    return {
      success: false,
      exercise_name: aliasData.canonicalName,
      movement_pattern: aliasData.pattern,
      load_value: 0,
      load_unit: defaultUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: "Missing load value.",
      raw_input: rawInput,
    };
  }

  const loadToken = tokens[tokenCursor];
  tokenCursor++;

  const loadRegex = /^([0-9]+(?:\.[0-9]+)?)\s*(kg|lbs?|lb)?$/i;
  const loadMatch = loadToken.match(loadRegex);

  let loadValue = 0;
  let loadUnit: PreferredUnit = defaultUnit;

  if (loadMatch) {
    loadValue = parseFloat(loadMatch[1]);
    if (loadMatch[2]) {
      const unitStr = loadMatch[2].toLowerCase();
      loadUnit = unitStr.startsWith("lb") ? "lb" : "kg";
    }
  } else {
    return {
      success: false,
      exercise_name: aliasData.canonicalName,
      movement_pattern: aliasData.pattern,
      load_value: 0,
      load_unit: defaultUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: `Invalid load format: "${loadToken}". Expected number with optional unit (e.g. 100, 100kg, 225lb).`,
      raw_input: rawInput,
    };
  }

  // 5. Extract Reps & Sets
  // Next token can be: "3x5", "5,5,5", "5/5/5", "8", etc.
  if (tokenCursor >= tokens.length) {
    return {
      success: false,
      exercise_name: aliasData.canonicalName,
      movement_pattern: aliasData.pattern,
      load_value: loadValue,
      load_unit: loadUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: "Missing set/rep scheme (e.g. 3x5, 5,5,5).",
      raw_input: rawInput,
    };
  }

  const repSchemeToken = tokens.slice(tokenCursor).join(" ");
  const repsPerSet: number[] = [];

  // Format A: "3x5" or "3 x 5"
  const setXRepMatch = repSchemeToken.match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (setXRepMatch) {
    const numSets = parseInt(setXRepMatch[1], 10);
    const reps = parseInt(setXRepMatch[2], 10);
    for (let i = 0; i < numSets; i++) {
      repsPerSet.push(reps);
    }
  } else {
    // Format B: comma or slash separated list "5,5,5" or "5/5/5"
    const listReps = repSchemeToken
      .split(/[,/ ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /^\d+$/.test(s))
      .map((s) => parseInt(s, 10));

    if (listReps.length > 0) {
      repsPerSet.push(...listReps);
    }
  }

  if (repsPerSet.length === 0) {
    return {
      success: false,
      exercise_name: aliasData.canonicalName,
      movement_pattern: aliasData.pattern,
      load_value: loadValue,
      load_unit: loadUnit,
      sets: [],
      total_sets: 0,
      reps_per_set: [],
      arbitration_hard_stop: false,
      error_message: `Could not parse rep scheme from "${repSchemeToken}".`,
      raw_input: rawInput,
    };
  }

  const sets: ParsedSetEntry[] = repsPerSet.map((reps, idx) => ({
    set_index: idx + 1,
    reps,
    load_value: loadValue,
    load_unit: loadUnit,
  }));

  // 6. Layer 0 Arbitration Wiring
  let arbitrationResult: ArbitrationResult | undefined;
  let arbitrationHardStop = false;

  if (painTelemetry) {
    arbitrationResult = resolveArbitration({
      has_acute_pain: painTelemetry.has_pain,
      pain_severity: painTelemetry.severity,
      pain_sensation: painTelemetry.sensation,
      pain_site: painTelemetry.site,
      proposed_overload_qualified: false,
    });
    arbitrationHardStop = arbitrationResult.hard_stop_active;
  }

  return {
    success: true,
    exercise_name: aliasData.canonicalName,
    movement_pattern: aliasData.pattern,
    load_value: loadValue,
    load_unit: loadUnit,
    sets,
    total_sets: sets.length,
    reps_per_set: repsPerSet,
    rpe,
    rir,
    pain_telemetry: painTelemetry,
    arbitration_hard_stop: arbitrationHardStop,
    arbitration_result: arbitrationResult,
    raw_input: rawInput,
  };
}

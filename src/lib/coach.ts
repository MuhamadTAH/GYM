import { z } from "zod";
import type { PreferredUnit, MovementPattern } from "../schemas/fitness";
import type { ArbitrationResult } from "./arbitration";

/**
 * ============================================================================
 * SUB-30-WORD EXECUTION MODE COACH DIRECTIVE GENERATOR
 * ============================================================================
 * Zero pleasantries. Raw command format. Strictly <= 30 words.
 * Includes strict 1500ms timeout and deterministic mechanical fallback.
 * ============================================================================
 */

export const ExecutionDirectiveSchema = z.object({
  urgency: z.enum(["CRITICAL", "ADAPT", "EXECUTE", "INFO"]).default("EXECUTE"),
  directive_text: z
    .string()
    .min(1)
    .refine(
      (val) => {
        const words = val.trim().split(/\s+/).filter(Boolean);
        return words.length <= 30;
      },
      {
        message: "Execution coach directive MUST strictly contain 30 words or fewer.",
      }
    ),
  word_count: z.number().int().min(1).max(30),
  audio_cue_text: z.string(),
  cue_category: z.enum(["safety", "load_adjustment", "technique", "rest", "swap"]).default("technique"),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
export type ExecutionDirective = z.infer<typeof ExecutionDirectiveSchema>;

export interface CoachGeneratorInput {
  exercise_name: string;
  movement_pattern?: MovementPattern;
  current_load: number;
  load_unit: PreferredUnit;
  target_reps: number;
  target_rpe?: number;
  rest_seconds?: number;
  arbitration?: ArbitrationResult;
  last_set_feedback?: string;
}

const PRIMARY_MECHANICAL_CUES: Record<string, string> = {
  squat: "Brace 360° at top; drive floor away.",
  back_squat: "Brace 360° at top; drive floor away.",
  front_squat: "Chest proud, elbows high, stay vertical.",
  bench_press: "Pack lats, pull bar to chest, drive through heels.",
  deadlift: "Lock lats, push floor away through midfoot, finish tall.",
  romanian_deadlift: "Hinge hips back, feel hamstring tension, flat back.",
  overhead_press: "Squeeze glutes, press overhead in straight bar path.",
  barbell_row: "Hinge 45°, pull elbows to hips, control eccentric.",
  pull_up: "Depress scapulae, drive elbows down to ribs.",
  chin_up: "Depress scapulae, drive elbows down to ribs.",
};

const DEFAULT_MECHANICAL_CUE = "Maintain tight core brace, control eccentric, drive smooth.";

/**
 * Deterministic offline fallback cue generator.
 * Format: "[Exercise]: [Load + Rep Target] | [Primary Mechanical Cue] | [Rest Target]"
 */
export function generateDeterministicCue(input: CoachGeneratorInput): ExecutionDirective {
  const {
    exercise_name,
    current_load,
    load_unit,
    target_reps,
    target_rpe = 8,
    rest_seconds = 180,
    arbitration,
  } = input;

  const normalizedExercise = exercise_name.toLowerCase().replace(/\s+/g, "_");
  const restMinutes = Math.max(1, Math.round(rest_seconds / 60));

  // P0 Hard Stop: Immediate Intercept
  if (arbitration && arbitration.hard_stop_active) {
    const hardStopText = "HALT EXERCISE IMMEDIATELY. Unrack safely. Do not continue this movement.";
    const words = hardStopText.split(/\s+/).filter(Boolean);
    return {
      urgency: "CRITICAL",
      directive_text: hardStopText,
      word_count: words.length,
      audio_cue_text: hardStopText,
      cue_category: "safety",
      timestamp: new Date().toISOString(),
    };
  }

  // P1 Down-Regulator: Load/Volume Reduction Cue
  if (arbitration && arbitration.arbitration_decision === "DOWN_REGULATE") {
    const reducedLoad = Math.max(
      0,
      Math.round(current_load * arbitration.resolved_load_modifier * 10) / 10
    );
    const cue = `Down-regulate load to ${reducedLoad}${load_unit} x ${target_reps}. Maintain strict form. Rest ${restMinutes}m.`;
    const words = cue.split(/\s+/).filter(Boolean);
    return {
      urgency: "ADAPT",
      directive_text: cue,
      word_count: words.length,
      audio_cue_text: cue,
      cue_category: "load_adjustment",
      timestamp: new Date().toISOString(),
    };
  }

  // P2/P3 Standard Execution Cue
  const mechanicalCue = PRIMARY_MECHANICAL_CUES[normalizedExercise] || DEFAULT_MECHANICAL_CUE;
  const formattedExercise =
    normalizedExercise.charAt(0).toUpperCase() +
    normalizedExercise.slice(1).replace(/_/g, " ");

  const directiveText = `${formattedExercise}: ${current_load}${load_unit} x ${target_reps} @ RPE ${target_rpe}. ${mechanicalCue} Rest ${restMinutes}m.`;
  const words = directiveText.split(/\s+/).filter(Boolean);

  return {
    urgency: "EXECUTE",
    directive_text: directiveText,
    word_count: words.length,
    audio_cue_text: directiveText,
    cue_category: "technique",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Programmatic Word Count Leash:
 * Post-processes output to strictly clamp to <= 30 words.
 */
export function clampTo30Words(rawText: string, fallbackText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return fallbackText;
  }

  const words = rawText.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 30) {
    return rawText.trim();
  }

  // Attempt sentence-aware truncation
  const sentenceMatches = rawText.match(/[^.!?]+[.!?]+/g);
  if (sentenceMatches && sentenceMatches.length > 0) {
    let accumulated = "";
    for (const sentence of sentenceMatches) {
      const candidate = (accumulated + " " + sentence).trim();
      const candidateWords = candidate.split(/\s+/).filter(Boolean);
      if (candidateWords.length <= 30) {
        accumulated = candidate;
      } else {
        break;
      }
    }
    if (accumulated.length > 0) {
      return accumulated;
    }
  }

  // Fallback: clamp words directly
  const clamped = words.slice(0, 28).join(" ") + ".";
  const clampedCount = clamped.split(/\s+/).filter(Boolean).length;
  if (clampedCount <= 30) {
    return clamped;
  }

  return fallbackText;
}

/**
 * Generates an execution mode coach directive with timeout protection and fallback.
 */
export async function generateExecutionDirective(
  input: CoachGeneratorInput
): Promise<ExecutionDirective> {
  // P0 Hard Safety Intercept before any network call
  if (input.arbitration && input.arbitration.hard_stop_active) {
    return generateDeterministicCue(input);
  }

  const fallback = generateDeterministicCue(input);

  // Check if external LLM API is configured
  const apiUrl = process.env.FAST_COACH_API_URL;
  const apiKey = process.env.FAST_COACH_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiUrl && !apiKey) {
    return fallback;
  }

  // Strict 1500ms timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const prompt = `You are a real-time gym floor coach. Athlete is performing ${input.exercise_name} at ${input.current_load}${input.load_unit} for ${input.target_reps} reps.
Give an immediate coaching command. STRICT RULES: Under 25 words. No greetings. No pleasantries. Focus on one biomechanical cue and rest time.`;

    let generatedText = "";

    if (apiUrl) {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ prompt, max_tokens: 40 }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        generatedText = data.text || data.directive || "";
      }
    }

    clearTimeout(timeoutId);

    if (!generatedText) {
      return fallback;
    }

    // Programmatic word count clamp
    const clampedText = clampTo30Words(generatedText, fallback.directive_text);
    const wordCount = clampedText.split(/\s+/).filter(Boolean).length;

    const validated = ExecutionDirectiveSchema.safeParse({
      urgency: fallback.urgency,
      directive_text: clampedText,
      word_count: wordCount,
      audio_cue_text: clampedText,
      cue_category: fallback.cue_category,
      timestamp: new Date().toISOString(),
    });

    if (validated.success) {
      return validated.data;
    }

    return fallback;
  } catch (error) {
    // Timeout or network error -> instantly return deterministic fallback
    clearTimeout(timeoutId);
    return fallback;
  }
}

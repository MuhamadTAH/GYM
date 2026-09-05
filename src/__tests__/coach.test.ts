import { describe, it, expect } from "vitest";
import {
  generateDeterministicCue,
  clampTo30Words,
  generateExecutionDirective,
  ExecutionDirectiveSchema,
} from "../lib/coach";
import { resolveArbitration } from "../lib/arbitration";

describe("Sub-30-Word Execution Mode Coach Generator (/src/lib/coach.ts)", () => {
  it("Case 1: acute pain triggers immediate emergency stop directive", () => {
    const arbitration = resolveArbitration({
      has_acute_pain: true,
      pain_severity: 8,
      pain_sensation: "sharp",
      pain_site: "Shoulder",
    });

    const directive = generateDeterministicCue({
      exercise_name: "bench_press",
      current_load: 100,
      load_unit: "kg",
      target_reps: 5,
      arbitration,
    });

    expect(directive.urgency).toBe("CRITICAL");
    expect(directive.directive_text).toBe(
      "HALT EXERCISE IMMEDIATELY. Unrack safely. Do not continue this movement."
    );
    expect(directive.word_count).toBe(10);
    expect(directive.word_count).toBeLessThanOrEqual(30);

    const validated = ExecutionDirectiveSchema.safeParse(directive);
    expect(validated.success).toBe(true);
  });

  it("Case 2: generates standard mechanical cue under 30 words in nominal state", () => {
    const directive = generateDeterministicCue({
      exercise_name: "squat",
      current_load: 102.5,
      load_unit: "kg",
      target_reps: 5,
      target_rpe: 8,
      rest_seconds: 180,
    });

    expect(directive.urgency).toBe("EXECUTE");
    expect(directive.directive_text).toContain("Squat: 102.5kg x 5 @ RPE 8.");
    expect(directive.directive_text).toContain("Brace 360° at top; drive floor away.");
    expect(directive.directive_text).toContain("Rest 3m.");
    expect(directive.word_count).toBeLessThanOrEqual(30);

    const validated = ExecutionDirectiveSchema.safeParse(directive);
    expect(validated.success).toBe(true);
  });

  it("Case 3: down-regulation generates appropriate load reduction cue", () => {
    const arbitration = resolveArbitration({
      has_acute_pain: false,
      cns_fatigue_score: 8,
    });

    const directive = generateDeterministicCue({
      exercise_name: "deadlift",
      current_load: 200,
      load_unit: "kg",
      target_reps: 5,
      arbitration,
    });

    expect(directive.urgency).toBe("ADAPT");
    expect(directive.directive_text).toContain("Down-regulate load to");
    expect(directive.word_count).toBeLessThanOrEqual(30);

    const validated = ExecutionDirectiveSchema.safeParse(directive);
    expect(validated.success).toBe(true);
  });

  describe("Programmatic Word Count Leash (clampTo30Words)", () => {
    it("should preserve text that is already under 30 words", () => {
      const shortText = "Bench Press: 100kg x 5 @ RPE 8. Pack lats, pull bar to chest. Rest 3m.";
      const clamped = clampTo30Words(shortText, "fallback");
      expect(clamped).toBe(shortText);
      expect(clamped.split(/\s+/).length).toBeLessThanOrEqual(30);
    });

    it("should clamp verbose text exceeding 30 words to a sentence boundary under 30 words", () => {
      const verbose =
        "Bench press execution is critical today because we want to maximize chest hypertrophy without compromising shoulder joints. Pack your lats tight, pull the bar straight down into the lower sternum, and press explosively while driving through the heels. Rest for two minutes.";
      const fallback = "Bench Press: 100kg x 5. Rest 2m.";

      const clamped = clampTo30Words(verbose, fallback);
      const wordCount = clamped.split(/\s+/).filter(Boolean).length;

      expect(wordCount).toBeLessThanOrEqual(30);
      expect(wordCount).toBeGreaterThan(5);

      const parsed = ExecutionDirectiveSchema.safeParse({
        urgency: "EXECUTE",
        directive_text: clamped,
        word_count: wordCount,
        audio_cue_text: clamped,
        cue_category: "technique",
      });
      expect(parsed.success).toBe(true);
    });

    it("should clamp unformatted run-on text with no sentence markers to <= 30 words", () => {
      const runOn = new Array(50).fill("word").join(" ");
      const fallback = "Squat: 100kg x 5. Rest 3m.";

      const clamped = clampTo30Words(runOn, fallback);
      const wordCount = clamped.split(/\s+/).filter(Boolean).length;

      expect(wordCount).toBeLessThanOrEqual(30);
    });
  });

  describe("Timeout & Offline Fallback", () => {
    it("should instantly return deterministic fallback when offline or no API credentials configured", async () => {
      const directive = await generateExecutionDirective({
        exercise_name: "overhead_press",
        current_load: 60,
        load_unit: "kg",
        target_reps: 8,
      });

      expect(directive).toBeDefined();
      expect(directive.directive_text).toContain("Overhead press: 60kg x 8");
      expect(directive.word_count).toBeLessThanOrEqual(30);
    });
  });
});

import { describe, it, expect } from "vitest";
import { parseGymShorthand } from "../lib/parser";

describe("Gym Shorthand Tokenized Parser (/src/lib/parser.ts)", () => {
  it("Case 1: parses 'bench 100kg 3x5 rpe8' correctly", () => {
    const res = parseGymShorthand("bench 100kg 3x5 rpe8");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("bench_press");
    expect(res.movement_pattern).toBe("horizontal_push");
    expect(res.load_value).toBe(100);
    expect(res.load_unit).toBe("kg");
    expect(res.total_sets).toBe(3);
    expect(res.reps_per_set).toEqual([5, 5, 5]);
    expect(res.rpe).toBe(8);
    expect(res.arbitration_hard_stop).toBe(false);
  });

  it("Case 2: parses 'sq 140 5,5,5 @ 8.5' with comma-separated rep scheme and @ syntax", () => {
    const res = parseGymShorthand("sq 140 5,5,5 @ 8.5");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("squat");
    expect(res.movement_pattern).toBe("quad_dominant");
    expect(res.load_value).toBe(140);
    expect(res.load_unit).toBe("kg"); // defaulted
    expect(res.total_sets).toBe(3);
    expect(res.reps_per_set).toEqual([5, 5, 5]);
    expect(res.rpe).toBe(8.5);
  });

  it("Case 3: parses 'deadlift 225lb 1x5 rir 2' with RIR syntax", () => {
    const res = parseGymShorthand("deadlift 225lb 1x5 rir 2");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("deadlift");
    expect(res.movement_pattern).toBe("hip_hinge");
    expect(res.load_value).toBe(225);
    expect(res.load_unit).toBe("lb");
    expect(res.total_sets).toBe(1);
    expect(res.reps_per_set).toEqual([5]);
    expect(res.rir).toBe(2);
    expect(res.rpe).toBe(8); // 10 - 2
  });

  it("Case 4: parses 'ohp 60 3x8' defaulting unit to user preferred_unit", () => {
    const resKg = parseGymShorthand("ohp 60 3x8", "kg");
    expect(resKg.success).toBe(true);
    expect(resKg.exercise_name).toBe("overhead_press");
    expect(resKg.movement_pattern).toBe("vertical_push");
    expect(resKg.load_value).toBe(60);
    expect(resKg.load_unit).toBe("kg");
    expect(resKg.total_sets).toBe(3);
    expect(resKg.reps_per_set).toEqual([8, 8, 8]);

    const resLb = parseGymShorthand("ohp 135 3x8", "lb");
    expect(resLb.load_unit).toBe("lb");
  });

  it("Case 5: extracts acute pain telemetry and triggers Layer 0 Hard Stop", () => {
    const res = parseGymShorthand("squat 100 1x1 pain:knee sharp 8");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("squat");
    expect(res.pain_telemetry).toBeDefined();
    expect(res.pain_telemetry?.site).toBe("knee");
    expect(res.pain_telemetry?.sensation).toBe("sharp");
    expect(res.pain_telemetry?.severity).toBe(8);
    expect(res.arbitration_hard_stop).toBe(true);
    expect(res.arbitration_result?.arbitration_decision).toBe("HARD_STOP");
    expect(res.arbitration_result?.resolved_load_modifier).toBe(0.0);
  });

  it("Case 6: parses alias 'bp' and imperial units 'lb'", () => {
    const res = parseGymShorthand("bp 225lb 3x5");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("bench_press");
    expect(res.load_value).toBe(225);
    expect(res.load_unit).toBe("lb");
    expect(res.total_sets).toBe(3);
  });

  it("Case 7: parses alias 'dl' with '@9' syntax", () => {
    const res = parseGymShorthand("dl 180kg 1x5 @9");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("deadlift");
    expect(res.load_value).toBe(180);
    expect(res.rpe).toBe(9);
  });

  it("Case 8: parses alias 'row' into 'barbell_row'", () => {
    const res = parseGymShorthand("row 70kg 4x10");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("barbell_row");
    expect(res.movement_pattern).toBe("horizontal_pull");
    expect(res.total_sets).toBe(4);
    expect(res.reps_per_set).toEqual([10, 10, 10, 10]);
  });

  it("Case 9: parses mild pain without triggering hard stop (triggers down-regulation instead)", () => {
    const res = parseGymShorthand("bench 90kg 3x5 pain:shoulder dull 4");
    expect(res.success).toBe(true);
    expect(res.pain_telemetry?.has_pain).toBe(true);
    expect(res.pain_telemetry?.severity).toBe(4);
    expect(res.arbitration_hard_stop).toBe(false);
    expect(res.arbitration_result?.arbitration_decision).toBe("DOWN_REGULATE");
    expect(res.arbitration_result?.resolved_load_modifier).toBeLessThan(1.0);
  });

  it("Case 10: gracefully handles empty or malformed inputs without throwing", () => {
    const resEmpty = parseGymShorthand("");
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error_message).toBeDefined();

    const resNoLoad = parseGymShorthand("squat");
    expect(resNoLoad.success).toBe(false);
    expect(resNoLoad.error_message).toContain("Missing load");

    const resNoReps = parseGymShorthand("bench 100kg");
    expect(resNoReps.success).toBe(false);
    expect(resNoReps.error_message).toContain("Missing set/rep");

    const resInvalidLoad = parseGymShorthand("bench abc 3x5");
    expect(resInvalidLoad.success).toBe(false);
    expect(resInvalidLoad.error_message).toContain("Invalid load");
  });

  it("Case 11: parses comma-separated reps with arbitrary spacing 'sq 140 5, 5, 4'", () => {
    const res = parseGymShorthand("sq 140kg 5, 5, 4 @8");
    expect(res.success).toBe(true);
    expect(res.reps_per_set).toEqual([5, 5, 4]);
    expect(res.total_sets).toBe(3);
    expect(res.rpe).toBe(8);
  });

  it("Case 12: parses pullup variants correctly", () => {
    const res = parseGymShorthand("chin 10kg 3x6");
    expect(res.success).toBe(true);
    expect(res.exercise_name).toBe("chin_up");
    expect(res.movement_pattern).toBe("vertical_pull");
  });
});

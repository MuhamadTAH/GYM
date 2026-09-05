import { describe, it, expect } from "vitest";
import { resolveArbitration } from "../lib/arbitration";

describe("Layer 0 Arbitration Priority Engine (/src/lib/arbitration.ts)", () => {
  describe("Priority 0: Hard Stop (Non-Negotiable Abort)", () => {
    it("MUST abort immediately on acute pain even if progressive overload is 100% qualified", () => {
      const result = resolveArbitration({
        has_acute_pain: true,
        pain_severity: 8,
        pain_sensation: "sharp",
        pain_site: "Right Shoulder",
        proposed_overload_qualified: true, // Overload is qualified!
        proposed_load_delta_kg: 2.5,
      });

      expect(result.hard_stop_active).toBe(true);
      expect(result.arbitration_decision).toBe("HARD_STOP");
      expect(result.resolved_load_modifier).toBe(0.0);
      expect(result.resolved_volume_modifier).toBe(0.0);
      expect(result.overload_permitted).toBe(false); // Overload MUST be voided
      expect(result.abort_reason).toContain("Right Shoulder");
      expect(result.abort_reason).toContain("sharp");
    });

    it("should abort immediately on popping joint sensation", () => {
      const result = resolveArbitration({
        has_acute_pain: true,
        pain_severity: 7,
        pain_sensation: "popping",
        pain_site: "Left Knee",
        proposed_overload_qualified: true,
      });

      expect(result.hard_stop_active).toBe(true);
      expect(result.arbitration_decision).toBe("HARD_STOP");
      expect(result.overload_permitted).toBe(false);
    });

    it("should abort immediately on structural failure or joint compromise", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        joint_compromised: true,
      });

      expect(result.hard_stop_active).toBe(true);
      expect(result.arbitration_decision).toBe("HARD_STOP");
      expect(result.abort_reason).toContain("Joint integrity compromised");
    });

    it("should abort immediately on dizziness or systemic faintness", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        dizziness_or_faintness: true,
      });

      expect(result.hard_stop_active).toBe(true);
      expect(result.arbitration_decision).toBe("HARD_STOP");
      expect(result.abort_reason).toContain("Dizziness");
    });
  });

  describe("Priority 1: Down-Regulator (Load and Volume Reductions)", () => {
    it("should down-regulate load on moderate non-acute pain", () => {
      const result = resolveArbitration({
        has_acute_pain: true,
        pain_severity: 5,
        pain_sensation: "dull",
        pain_site: "Lower Back",
        proposed_overload_qualified: true,
      });

      expect(result.hard_stop_active).toBe(false);
      expect(result.arbitration_decision).toBe("DOWN_REGULATE");
      expect(result.resolved_load_modifier).toBeLessThan(1.0);
      expect(result.overload_permitted).toBe(false);
      expect(result.active_down_regulations.length).toBeGreaterThan(0);
      expect(result.active_down_regulations[0].recommended_action).toBe("reduce_load");
    });

    it("should down-regulate volume on elevated CNS fatigue and soreness", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        cns_fatigue_score: 8,
        systemic_soreness_score: 7,
      });

      expect(result.hard_stop_active).toBe(false);
      expect(result.arbitration_decision).toBe("DOWN_REGULATE");
      expect(result.resolved_volume_modifier).toBeLessThan(1.0);
      expect(result.active_down_regulations[0].recommended_action).toBe("reduce_sets");
    });

    it("should down-regulate on depressed HRV z-score and low sleep efficiency", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        hrv_z_score: -2.1,
        sleep_efficiency_pct: 65,
      });

      expect(result.arbitration_decision).toBe("DOWN_REGULATE");
      expect(result.active_down_regulations.some((r) => r.factor.includes("HRV"))).toBe(true);
      expect(result.active_down_regulations.some((r) => r.factor.includes("sleep"))).toBe(true);
    });

    it("should respect Human Override Mandate and suppress algorithmic down-regulation", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        cns_fatigue_score: 8,
        user_override_active: true,
        user_override_reason: "Subjective readiness high despite fatigue metric",
        proposed_overload_qualified: true,
      });

      expect(result.hard_stop_active).toBe(false);
      expect(result.arbitration_decision).toBe("MAINTAIN");
      expect(result.resolved_load_modifier).toBe(1.0);
      expect(result.overload_permitted).toBe(true);
      expect(result.action_summary).toContain("Human override active");
    });
  });

  describe("Priority 2: Contextual Adaptation", () => {
    it("should adapt volume when time is constrained under 20 minutes", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        is_time_constrained: true,
        time_remaining_minutes: 15,
      });

      expect(result.hard_stop_active).toBe(false);
      expect(result.arbitration_decision).toBe("CONTEXT_ADAPT");
      expect(result.resolved_volume_modifier).toBeLessThan(1.0);
      expect(result.action_summary).toContain("Time remaining");
    });
  });

  describe("Priority 3: Progressive Overload & Nominal State", () => {
    it("should approve progressive overload when all higher priority checks are clear", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        cns_fatigue_score: 3,
        systemic_soreness_score: 2,
        proposed_overload_qualified: true,
      });

      expect(result.hard_stop_active).toBe(false);
      expect(result.arbitration_decision).toBe("OVERLOAD");
      expect(result.resolved_load_modifier).toBe(1.0);
      expect(result.overload_permitted).toBe(true);
      expect(result.action_summary).toContain("Progressive overload approved");
    });

    it("should maintain nominal load when all constraints clear and no overload proposed", () => {
      const result = resolveArbitration({
        has_acute_pain: false,
        proposed_overload_qualified: false,
      });

      expect(result.arbitration_decision).toBe("MAINTAIN");
      expect(result.resolved_load_modifier).toBe(1.0);
      expect(result.resolved_volume_modifier).toBe(1.0);
      expect(result.overload_permitted).toBe(false);
    });
  });
});

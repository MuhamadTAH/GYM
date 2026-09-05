import { describe, it, expect } from "vitest";
import {
  calculateBrzycki1RM,
  calculateWathan1RM,
  calculateMifflinStJeorBMR,
  calculateTDEE,
  calculateProgressiveOverload,
  calculateTonnage,
} from "../lib/math";

describe("Deterministic Math Engine (/src/lib/math.ts)", () => {
  describe("Brzycki 1RM Calculator", () => {
    it("should return exact weight when reps = 1", () => {
      expect(calculateBrzycki1RM(100, 1)).toBe(100);
      expect(calculateBrzycki1RM(142.5, 1)).toBe(142.5);
    });

    it("should compute accurate 1RM for standard rep ranges", () => {
      // 100 * (36 / (37 - 5)) = 100 * (36 / 32) = 112.5
      expect(calculateBrzycki1RM(100, 5)).toBe(112.5);
      // 80 * (36 / (37 - 10)) = 80 * (36 / 27) = 106.666 -> 106.7
      expect(calculateBrzycki1RM(80, 10)).toBe(106.7);
    });

    it("should cap reps at 30 for high rep counts to prevent mathematical division by zero", () => {
      const at30 = calculateBrzycki1RM(100, 30);
      const at35 = calculateBrzycki1RM(100, 35);
      const at37 = calculateBrzycki1RM(100, 37); // would divide by zero if uncapped

      expect(at30).toBeDefined();
      expect(at35).toBe(at30);
      expect(at37).toBe(at30);
    });

    it("should return null for invalid inputs", () => {
      expect(calculateBrzycki1RM(0, 5)).toBeNull();
      expect(calculateBrzycki1RM(-100, 5)).toBeNull();
      expect(calculateBrzycki1RM(100, 0)).toBeNull();
      expect(calculateBrzycki1RM(100, -3)).toBeNull();
      expect(calculateBrzycki1RM(NaN, 5)).toBeNull();
      expect(calculateBrzycki1RM(100, Infinity)).toBeNull();
    });
  });

  describe("Wathan 1RM Calculator", () => {
    it("should return exact weight when reps = 1", () => {
      expect(calculateWathan1RM(100, 1)).toBe(100);
    });

    it("should compute valid 1RM for rep ranges and cap at 30", () => {
      const result5 = calculateWathan1RM(100, 5);
      expect(result5).toBeGreaterThan(100);
      expect(calculateWathan1RM(100, 40)).toBe(calculateWathan1RM(100, 30));
    });

    it("should return null for non-positive or invalid inputs", () => {
      expect(calculateWathan1RM(-50, 5)).toBeNull();
      expect(calculateWathan1RM(50, -1)).toBeNull();
    });
  });

  describe("BMR and TDEE Calculators", () => {
    it("should calculate Mifflin-St Jeor BMR for male correctly", () => {
      // 10 * 80 + 6.25 * 180 - 5 * 25 + 5 = 800 + 1125 - 125 + 5 = 1805
      const bmr = calculateMifflinStJeorBMR({
        weightKg: 80,
        heightCm: 180,
        ageYears: 25,
        sex: "male",
      });
      expect(bmr).toBe(1805);
    });

    it("should calculate Mifflin-St Jeor BMR for female correctly", () => {
      // 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
      const bmr = calculateMifflinStJeorBMR({
        weightKg: 60,
        heightCm: 165,
        ageYears: 30,
        sex: "female",
      });
      expect(bmr).toBe(1320);
    });

    it("should return null for invalid biometric parameters", () => {
      expect(
        calculateMifflinStJeorBMR({
          weightKg: -70,
          heightCm: 175,
          ageYears: 25,
          sex: "male",
        })
      ).toBeNull();
    });

    it("should calculate TDEE from BMR and activity multiplier", () => {
      const tdee = calculateTDEE(1805, "moderately_active"); // 1805 * 1.55 = 2797.75 -> 2798
      expect(tdee).toBe(2798);
      expect(calculateTDEE(0, "sedentary")).toBeNull();
    });
  });

  describe("Progressive Overload Step-Loading", () => {
    it("should qualify for +2.5kg increment when all target reps are achieved at target RPE", () => {
      const result = calculateProgressiveOverload({
        currentLoad: 100,
        unit: "kg",
        completedReps: 5,
        targetReps: 5,
        loggedRpe: 7.5,
        targetRpe: 8.0,
      });

      expect(result.qualifies).toBe(true);
      expect(result.action).toBe("INCREMENT_LOAD");
      expect(result.loadDelta).toBe(2.5);
      expect(result.nextPrescribedLoad).toBe(102.5);
    });

    it("should qualify for +5.0lb increment when unit is lb", () => {
      const result = calculateProgressiveOverload({
        currentLoad: 225,
        unit: "lb",
        completedReps: 5,
        targetReps: 5,
        loggedRpe: 8.0,
        targetRpe: 8.0,
      });

      expect(result.qualifies).toBe(true);
      expect(result.action).toBe("INCREMENT_LOAD");
      expect(result.loadDelta).toBe(5.0);
      expect(result.nextPrescribedLoad).toBe(230.0);
    });

    it("should down-regulate load when reps are significantly missed", () => {
      const result = calculateProgressiveOverload({
        currentLoad: 100,
        unit: "kg",
        completedReps: 3, // missed by 2
        targetReps: 5,
        loggedRpe: 9.5,
      });

      expect(result.qualifies).toBe(false);
      expect(result.action).toBe("DOWN_REGULATE_LOAD");
      expect(result.loadDelta).toBe(-2.5);
      expect(result.nextPrescribedLoad).toBe(97.5);
    });

    it("should maintain load when consolidating near target reps", () => {
      const result = calculateProgressiveOverload({
        currentLoad: 100,
        unit: "kg",
        completedReps: 4, // 1 rep short
        targetReps: 5,
        loggedRpe: 8.5,
        targetRpe: 8.0,
      });

      expect(result.qualifies).toBe(false);
      expect(result.action).toBe("MAINTAIN_LOAD");
      expect(result.loadDelta).toBe(0);
      expect(result.nextPrescribedLoad).toBe(100);
    });
  });

  describe("Tonnage Calculator", () => {
    it("should compute accurate volume load", () => {
      const sets = [
        { loadValue: 100, reps: 5 },
        { loadValue: 100, reps: 5 },
        { loadValue: 105, reps: 5 },
      ];
      expect(calculateTonnage(sets)).toBe(500 + 500 + 525);
    });
  });
});

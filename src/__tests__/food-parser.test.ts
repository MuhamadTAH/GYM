import { describe, it, expect } from "vitest";
import { parseNaturalTelemetry } from "../lib/food-parser";

describe("Natural Language Food & Telemetry Parser", () => {
  it("parses 'I ate 4 eggs' accurately into calories and protein", () => {
    const res = parseNaturalTelemetry("I ate 4 eggs");
    expect(res.success).toBe(true);
    expect(res.totalCalories).toBe(288); // 4 * 72
    expect(res.totalProtein).toBe(24);   // 4 * 6
    expect(res.items).toHaveLength(1);
    expect(res.items[0].name).toBe("Egg");
    expect(res.items[0].category).toBe("food");
    expect(res.feedbackSummary).toContain("4x Egg");
  });

  it("parses word numbers like 'two boiled eggs and one banana'", () => {
    const res = parseNaturalTelemetry("two boiled eggs and one banana");
    expect(res.success).toBe(true);
    expect(res.totalCalories).toBe(144 + 105); // 249
    expect(res.totalProtein).toBe(12 + 1.3);   // 13.3
    expect(res.items).toHaveLength(2);
  });

  it("parses specific gram weights for meats: 'chicken breast 200g'", () => {
    const res = parseNaturalTelemetry("chicken breast 200g");
    expect(res.success).toBe(true);
    // 200g * (165 kcal / 100g) = 330 kcal
    // 200g * (31g / 100g) = 62g protein
    expect(res.totalCalories).toBe(330);
    expect(res.totalProtein).toBe(62);
  });

  it("parses supplements: '1 scoop of whey protein'", () => {
    const res = parseNaturalTelemetry("1 scoop of whey protein");
    expect(res.success).toBe(true);
    expect(res.totalCalories).toBe(120);
    expect(res.totalProtein).toBe(24);
  });

  it("parses hydration telemetry: 'drank 500ml water' and '1.5L water'", () => {
    const res1 = parseNaturalTelemetry("drank 500ml water");
    expect(res1.success).toBe(true);
    expect(res1.totalWaterLiters).toBe(0.5);
    expect(res1.items[0].category).toBe("water");

    const res2 = parseNaturalTelemetry("1.5L water");
    expect(res2.success).toBe(true);
    expect(res2.totalWaterLiters).toBe(1.5);
  });

  it("parses walking telemetry: 'walked 25 minutes' and '6000 steps'", () => {
    const res1 = parseNaturalTelemetry("walked 25 minutes");
    expect(res1.success).toBe(true);
    expect(res1.totalWalkMinutes).toBe(25);
    expect(res1.items[0].category).toBe("walk");

    const res2 = parseNaturalTelemetry("6000 steps");
    expect(res2.success).toBe(true);
    expect(res2.totalWalkMinutes).toBe(50); // 6000 / 120
  });

  it("parses workout completion: 'completed chest workout'", () => {
    const res = parseNaturalTelemetry("completed chest workout");
    expect(res.success).toBe(true);
    expect(res.trainingCompleted).toBe(true);
  });

  it("parses multi-item meal with hydration: '4 eggs, 2 slices of toast, and 500ml water'", () => {
    const res = parseNaturalTelemetry("4 eggs, 2 slices of toast, and 500ml water");
    expect(res.success).toBe(true);
    expect(res.items).toHaveLength(3);
    expect(res.totalCalories).toBe(288 + 160); // 448
    expect(res.totalProtein).toBe(24 + 6);     // 30
    expect(res.totalWaterLiters).toBe(0.5);
  });

  it("parses direct calorie and protein numbers if custom meal: 'pizza 500 kcal 30g protein'", () => {
    const res = parseNaturalTelemetry("pizza 500 kcal 30g protein");
    expect(res.success).toBe(true);
    expect(res.totalCalories).toBe(500);
    expect(res.totalProtein).toBe(30);
  });

  it("handles unrecognized text gracefully", () => {
    const res = parseNaturalTelemetry("supercalifragilistic");
    expect(res.success).toBe(false);
    expect(res.totalCalories).toBe(0);
    expect(res.feedbackSummary).toContain("Could not identify");
  });
});

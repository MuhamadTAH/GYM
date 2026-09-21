import { describe, it, expect } from "vitest";
import { searchUsdaFoods, getUsdaFoodNutrition } from "@/lib/usda-database";

describe("USDA Nutrition Database Engine", () => {
  it("searches and finds multiple fruit varieties", async () => {
    const grapes = await searchUsdaFoods("Grapes", 5);
    expect(grapes.length).toBeGreaterThan(0);
    expect(grapes[0].longDesc.toLowerCase()).toContain("grape");
    expect(grapes[0].caloriesPer100g).toBeGreaterThan(50);

    const watermelon = await searchUsdaFoods("Watermelon", 5);
    expect(watermelon.length).toBeGreaterThan(0);
    expect(watermelon[0].longDesc.toLowerCase()).toContain("watermelon");
    expect(watermelon[0].caloriesPer100g).toBeGreaterThan(20);

    const mango = await searchUsdaFoods("Mango", 5);
    expect(mango.length).toBeGreaterThan(0);
    expect(mango[0].longDesc.toLowerCase()).toContain("mango");
    expect(mango[0].caloriesPer100g).toBeGreaterThan(40);
  });

  it("calculates exact nutrition for Grapes with custom grams", async () => {
    // 100g grapes is ~69 kcal
    const estimate150g = await getUsdaFoodNutrition("Grapes", 150);
    expect(estimate150g).not.toBeNull();
    if (estimate150g) {
      expect(estimate150g.matched).toBe(true);
      expect(estimate150g.grams).toBe(150);
      expect(estimate150g.hasExplicitGrams).toBe(true);
      expect(estimate150g.calories).toBeGreaterThan(80);
      expect(estimate150g.carbs).toBeGreaterThan(20);
    }
  });

  it("calculates standard portion nutrition for Watermelon when grams are omitted", async () => {
    const estimate = await getUsdaFoodNutrition("Watermelon");
    expect(estimate).not.toBeNull();
    if (estimate) {
      expect(estimate.matched).toBe(true);
      expect(estimate.hasExplicitGrams).toBe(false);
      expect(estimate.calories).toBeGreaterThan(20);
      expect(estimate.emoji).toBe("🍉");
    }
  });

  it("handles strawberries and blueberries", async () => {
    const strawberry = await getUsdaFoodNutrition("Strawberries", 100);
    expect(strawberry).not.toBeNull();
    if (strawberry) {
      expect(strawberry.emoji).toBe("🍓");
      // 100g strawberries ~32 kcal
      expect(strawberry.calories).toBeGreaterThanOrEqual(30);
      expect(strawberry.calories).toBeLessThanOrEqual(40);
    }

    const blueberry = await getUsdaFoodNutrition("Blueberries", 100);
    expect(blueberry).not.toBeNull();
    if (blueberry) {
      expect(blueberry.emoji).toBe("🫐");
      // 100g blueberries ~57 kcal
      expect(blueberry.calories).toBeGreaterThanOrEqual(50);
      expect(blueberry.calories).toBeLessThanOrEqual(65);
    }
  });

  it("integrates with estimateFoodMacrosAction and searchFoodDatabaseAction", async () => {
    const { estimateFoodMacrosAction, searchFoodDatabaseAction } = await import("@/app/actions");

    // Search for Peach
    const searchResults = await searchFoodDatabaseAction("Peach");
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((r) => r.displayName.toLowerCase().includes("peach"))).toBe(true);

    // Calculate macros for 150g Mango
    const mangoEstimate = await estimateFoodMacrosAction("Mango", 150);
    expect(mangoEstimate.matched).toBe(true);
    expect(mangoEstimate.calories).toBeGreaterThan(80);
    expect(mangoEstimate.emoji).toBe("🥭");

    // Calculate macros for Watermelon with omitted weight
    const watermelonEstimate = await estimateFoodMacrosAction("Watermelon");
    expect(watermelonEstimate.matched).toBe(true);
    expect(watermelonEstimate.calories).toBeGreaterThan(20);
    expect(watermelonEstimate.emoji).toBe("🍉");
  });
});

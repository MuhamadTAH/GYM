import { describe, it, expect, beforeAll } from "vitest";
import {
  estimateFoodMacrosAction,
  logNaturalEntryAction,
  getDailyGoalsAction,
  deleteLoggedItemAction,
  resetDailyTrackingAction,
} from "@/app/actions";
import { estimateFoodMacros } from "@/lib/food-parser";

describe("Calories & Grams Tracking Engine", () => {
  it("estimates macros accurately for chicken breast with custom grams", async () => {
    // 100g Chicken Breast is 165 kcal, 31g protein
    // 200g Chicken Breast should be 330 kcal, 62g protein
    const estimate200 = await estimateFoodMacrosAction("Chicken Breast", 200);

    expect(estimate200.matched).toBe(true);
    expect(estimate200.name).toBe("Chicken Breast");
    expect(estimate200.grams).toBe(200);
    expect(estimate200.calories).toBe(330);
    expect(estimate200.protein).toBe(62);
  });

  it("estimates macros accurately for white rice with custom grams", () => {
    // 150g Rice (1 serving) is 205 kcal, 4.5g protein
    const estimate150 = estimateFoodMacros("White Rice", 150);

    expect(estimate150.matched).toBe(true);
    expect(estimate150.name).toBe("Rice");
    expect(estimate150.grams).toBe(150);
    expect(estimate150.calories).toBe(205);
    expect(estimate150.protein).toBe(4.5);
  });

  it("estimates Middle Eastern staples like Shawarma and Falafel", () => {
    const shawarma = estimateFoodMacros("Chicken Shawarma", 150);
    expect(shawarma.matched).toBe(true);
    expect(shawarma.name).toBe("Shawarma");
    expect(shawarma.calories).toBeGreaterThan(250);

    const falafel = estimateFoodMacros("Falafel", 100);
    expect(falafel.matched).toBe(true);
    expect(falafel.name).toBe("Falafel");
    expect(falafel.calories).toBeGreaterThan(50);
  });

  it("handles fallback gracefully for unknown custom food with grams", () => {
    const custom = estimateFoodMacros("Homemade Casserole", 250);
    expect(custom.matched).toBe(false);
    expect(custom.grams).toBe(250);
    expect(custom.calories).toBe(375); // 250 * 1.5 kcal/g
    expect(custom.protein).toBe(25); // 250 * 0.1
  });

  it("logs a food item with grams and updates todayCalories", async () => {
    await resetDailyTrackingAction();

    const logRes = await logNaturalEntryAction({
      text: "180g Chicken Breast",
      calories: 297,
      protein: 55.8,
    });

    expect(logRes.success).toBe(true);
    expect(logRes.goals.todayCalories).toBe(297);
    expect(logRes.goals.todayProtein).toBe(55.8);

    const goals = await getDailyGoalsAction();
    expect(goals.todayCalories).toBe(297);
    expect(goals.todayLoggedItems.length).toBeGreaterThanOrEqual(1);

    const loggedItem = goals.todayLoggedItems.find((i) => i.rawText?.includes("Chicken") || i.name?.includes("Chicken"));
    expect(loggedItem).toBeDefined();

    // Delete item and ensure calories are deducted
    if (loggedItem) {
      const delRes = await deleteLoggedItemAction(loggedItem.id);
      expect(delRes.success).toBe(true);
      expect(delRes.goals.todayCalories).toBe(0);
    }
  });
});

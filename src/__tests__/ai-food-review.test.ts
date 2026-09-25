import { describe, it, expect, beforeAll } from "vitest";
import {
  writeUnestimatedFoodAction,
  reviewFoodWithAIAction,
  reviewAllPendingFoodsWithAIAction,
  updateLoggedFoodCaloriesAction,
  getDailyGoalsAction,
  resetDailyTrackingAction,
} from "@/app/actions";
import { reviewFoodItemWithAI } from "@/lib/ai-food-reviewer";

describe("AI Food Review & Dynamic Calorie Adjustment Engine", () => {
  beforeAll(async () => {
    await resetDailyTrackingAction();
  });

  it("writes an unestimated food item with 0 calories and pending AI status", async () => {
    await resetDailyTrackingAction();

    const writeRes = await writeUnestimatedFoodAction({
      foodName: "Homemade Chicken Biryani with Salad",
    });

    expect(writeRes.success).toBe(true);
    expect(writeRes.loggedItem).toBeDefined();
    expect(writeRes.loggedItem?.name).toBe("Homemade Chicken Biryani with Salad");
    expect(writeRes.loggedItem?.calories).toBe(0);
    expect(writeRes.loggedItem?.protein).toBe(0);
    expect(writeRes.loggedItem?.aiStatus).toBe("pending");

    // Calorie counter must NOT have counted any calories yet
    expect(writeRes.goals.todayCalories).toBe(0);

    const goals = await getDailyGoalsAction();
    expect(goals.todayCalories).toBe(0);
    expect(goals.todayLoggedItems.length).toBe(1);
    expect(goals.todayLoggedItems[0].name).toBe("Homemade Chicken Biryani with Salad");
  });

  it("reviews the pending food item with AI, calculates calories, and updates total daily calories", async () => {
    const goalsBefore = await getDailyGoalsAction();
    const pendingItem = goalsBefore.todayLoggedItems.find((i) => i.aiStatus === "pending");
    expect(pendingItem).toBeDefined();

    const reviewRes = await reviewFoodWithAIAction({
      itemId: pendingItem!.id,
    });

    expect(reviewRes.success).toBe(true);
    expect(reviewRes.loggedItem?.aiStatus).toBe("reviewed");
    expect(reviewRes.loggedItem?.calories).toBeGreaterThan(0);
    expect(reviewRes.loggedItem?.protein).toBeGreaterThan(0);
    expect(reviewRes.loggedItem?.aiNotes).toBeDefined();

    // The user's total daily calories MUST be updated to match the reviewed food!
    expect(reviewRes.goals.todayCalories).toBe(reviewRes.loggedItem!.calories);
    expect(reviewRes.goals.todayProtein).toBe(reviewRes.loggedItem!.protein);

    const goalsAfter = await getDailyGoalsAction();
    expect(goalsAfter.todayCalories).toBe(reviewRes.loggedItem!.calories);
  });

  it("allows updating calories of a food item and immediately recalculates the athlete's daily calories", async () => {
    const goals = await getDailyGoalsAction();
    const item = goals.todayLoggedItems[0];
    expect(item).toBeDefined();

    // Change calories of this food item to 650 kcal and 45g protein
    const updateRes = await updateLoggedFoodCaloriesAction({
      itemId: item.id,
      calories: 650,
      protein: 45,
      notes: "Adjusted after weighing portion",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.loggedItem?.calories).toBe(650);
    expect(updateRes.loggedItem?.protein).toBe(45);
    expect(updateRes.loggedItem?.aiStatus).toBe("manual");

    // Total daily calories must now be exactly 650 kcal
    expect(updateRes.goals.todayCalories).toBe(650);
    expect(updateRes.goals.todayProtein).toBe(45);

    const updatedGoals = await getDailyGoalsAction();
    expect(updatedGoals.todayCalories).toBe(650);
  });

  it("reviews all pending foods in batch and updates the daily total", async () => {
    await resetDailyTrackingAction();

    // Write 2 unestimated items
    await writeUnestimatedFoodAction({ foodName: "1 medium apple" });
    await writeUnestimatedFoodAction({ foodName: "2 boiled eggs" });

    const beforeReview = await getDailyGoalsAction();
    expect(beforeReview.todayCalories).toBe(0);
    expect(beforeReview.todayLoggedItems.length).toBe(2);

    const batchRes = await reviewAllPendingFoodsWithAIAction();
    expect(batchRes.success).toBe(true);
    expect(batchRes.reviewedCount).toBe(2);

    // After batch review, both items have calories and daily calories is the sum
    expect(batchRes.goals.todayCalories).toBeGreaterThan(150); // Apple ~65-95 kcal + 2 eggs 144 kcal

    const item1 = batchRes.goals.todayLoggedItems.find((i) => i.name.includes("apple"));
    const item2 = batchRes.goals.todayLoggedItems.find((i) => i.name.includes("egg"));
    expect(item1?.aiStatus).toBe("reviewed");
    expect(item2?.aiStatus).toBe("reviewed");
    expect(batchRes.goals.todayCalories).toBe((item1?.calories || 0) + (item2?.calories || 0));
  });

  it("standalone AI food review engine returns structured nutrition estimation", async () => {
    const result = await reviewFoodItemWithAI("Grilled salmon with asparagus");
    expect(result.calories).toBeGreaterThan(100);
    expect(result.protein).toBeGreaterThan(10);
    expect(result.portionDesc).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThan(0.5);
  });
});

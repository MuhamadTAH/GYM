import { describe, it, expect, beforeEach } from "vitest";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logNaturalEntryAction,
  resetDailyTrackingAction,
  clearAllGoalsAction,
  simulateNewDayRolloverAction,
  getDailyProgressHistoryAction,
  getDailyLogForDateAction,
} from "../app/actions";

describe("Day-by-Day Nutrition Progress & Reset Engine", () => {
  beforeEach(async () => {
    await clearAllGoalsAction();
  });

  it("accumulates today's calories, saves to progress on new day, and resets active day to 0", async () => {
    const day1 = "2026-09-25";
    const day2 = "2026-09-26";

    // Configure a calorie target
    await saveDailyGoalsAction({
      caloriesTarget: 1900,
      proteinMinGrams: 70,
    });

    // 1. Day 1: Athlete eats 200 calories (e.g. Greek yogurt and an apple)
    const logRes = await logNaturalEntryAction({
      text: "Greek yogurt with apple",
      calories: 200,
      protein: 15,
      clientLocalDate: day1,
    });

    expect(logRes.success).toBe(true);
    expect(logRes.goals.todayCalories).toBe(200);
    expect(logRes.goals.todayProtein).toBe(15);
    expect(logRes.goals.todayLoggedItems.length).toBe(1);

    // 2. Query Day 1 progress history before rollover
    let history = await getDailyProgressHistoryAction(7, day1);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].date).toBe(day1);
    expect(history[0].calories).toBe(200);
    expect(history[0].isToday).toBe(true);

    // 3. New Day starts (Day 2): Athlete opens app or rolls over
    const rolloverRes = await simulateNewDayRolloverAction(day2);
    expect(rolloverRes.success).toBe(true);
    expect(rolloverRes.goals.todayCalories).toBe(0); // Clean reset!
    expect(rolloverRes.goals.todayProtein).toBe(0);
    expect(rolloverRes.goals.todayLoggedItems).toEqual([]);
    expect(rolloverRes.goals.lastActiveDate).toBe(day2);

    // 4. Verify Day 1 was preserved in Progress History
    history = await getDailyProgressHistoryAction(7, day2);
    expect(history.length).toBe(2);

    // Today (Day 2) is at index 0, reset to 0
    expect(history[0].date).toBe(day2);
    expect(history[0].calories).toBe(0);
    expect(history[0].isToday).toBe(true);

    // Yesterday (Day 1) is at index 1, saved with 200 kcal
    expect(history[1].date).toBe(day1);
    expect(history[1].calories).toBe(200);
    expect(history[1].protein).toBe(15);
    expect(history[1].isToday).toBe(false);
    expect(history[1].itemsCount).toBe(1);
    expect(history[1].items[0].name.toLowerCase()).toContain("greek yogurt");

    // 5. Query specific log for Day 1
    const day1Details = await getDailyLogForDateAction(day1, day2);
    expect(day1Details).not.toBeNull();
    expect(day1Details?.calories).toBe(200);
    expect(day1Details?.items.length).toBe(1);

    // 6. Day 2: Athlete fills today's calories with 450 kcal meal
    const day2Log = await logNaturalEntryAction({
      text: "Chicken breast with rice",
      calories: 450,
      protein: 42,
      clientLocalDate: day2,
    });

    expect(day2Log.goals.todayCalories).toBe(450);
    expect(day2Log.goals.todayProtein).toBe(42);

    // 7. Verify both days in history
    history = await getDailyProgressHistoryAction(7, day2);
    expect(history[0].date).toBe(day2);
    expect(history[0].calories).toBe(450);
    expect(history[1].date).toBe(day1);
    expect(history[1].calories).toBe(200);
  });

  it("automatically detects calendar day change on getDailyGoalsAction", async () => {
    const yesterday = "2026-09-24";
    const today = "2026-09-25";

    // Log 350 kcal on yesterday
    await logNaturalEntryAction({
      text: "3 eggs and avocado",
      calories: 350,
      protein: 22,
      clientLocalDate: yesterday,
    });

    // Athlete opens app next day -> getDailyGoalsAction(today)
    const todayGoals = await getDailyGoalsAction(today);

    // Should have auto-reset today to 0
    expect(todayGoals.todayCalories).toBe(0);
    expect(todayGoals.todayProtein).toBe(0);
    expect(todayGoals.todayLoggedItems).toEqual([]);
    expect(todayGoals.lastActiveDate).toBe(today);

    // Yesterday is archived in progress
    const yesterdayLog = await getDailyLogForDateAction(yesterday, today);
    expect(yesterdayLog).not.toBeNull();
    expect(yesterdayLog?.calories).toBe(350);
    expect(yesterdayLog?.protein).toBe(22);
  });
});

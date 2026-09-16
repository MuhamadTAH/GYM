import { describe, it, expect, beforeAll } from "vitest";
import { getDailyMorningBriefing, dispatchDailyMorningBriefing } from "@/lib/briefing";
import { db } from "@/db";
import { userProfiles, athleteDailyGoals } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Automated Daily Morning Briefing Engine", () => {
  const testUserId = "briefing_test_user";

  beforeAll(async () => {
    // Seed test profile
    await db.delete(athleteDailyGoals).where(eq(athleteDailyGoals.userId, testUserId));
    await db.delete(userProfiles).where(eq(userProfiles.id, testUserId));

    await db.insert(userProfiles).values({
      id: testUserId,
      name: "Tarq",
      email: "athlete@example.com",
      age: 28,
      sex: "male",
      heightCm: 180,
      preferredUnit: "kg",
      currentWeightValue: 82.5,
      currentWeightUnit: "kg",
      sevenDayWeightMedian: 82.5,
      trainingAge: "intermediate",
      rawWeightHistory: [],
      baselineLifts: {
        squat_1rm: 150,
        bench_press_1rm: 110,
        deadlift_1rm: 190,
        overhead_press_1rm: 65,
        barbell_row_1rm: 90,
        pull_up_1rm: 25,
      },
      activeInjuries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(athleteDailyGoals).values({
      id: "goals_" + testUserId,
      userId: testUserId,
      caloriesTarget: 1900,
      proteinMinGrams: 60,
      proteinMaxGrams: 75,
      waterMinLiters: 3.0,
      waterMaxLiters: 3.5,
      dailyWalkMinMinutes: 20,
      dailyWalkMaxMinutes: 30,
      weeklySplitSchedule: [
        { day: "Monday", title: "Upper Body A", focus: "Chest & Horizontal Pull", isRest: false },
        { day: "Tuesday", title: "Lower Body A", focus: "Squat Depth & Quad Overload", isRest: false },
        { day: "Wednesday", title: "Active Recovery", focus: "20-30m walk & tissue restoration", isRest: true },
        { day: "Thursday", title: "Upper Body B", focus: "Chest & Back Width + Lateral Delts", isRest: false },
        { day: "Friday", title: "Lower Body B", focus: "Posterior Chain (Deadlift & Hamstrings)", isRest: false },
        { day: "Saturday", title: "Arms & Core", focus: "Deltoid, Arm Hypertrophy", isRest: false },
        { day: "Sunday", title: "Full Rest", focus: "Recovery & Nutrition", isRest: true },
      ],
      todayCalories: 0,
      todayProtein: 0,
      todayWaterLiters: 0,
      todayWalkMinutes: 0,
      todayTrainingCompleted: false,
      todayLoggedItems: [],
      updatedAt: new Date().toISOString(),
    });
  });

  it("generates a structured briefing for a training day (Thursday)", async () => {
    // Thursday: Oct 1, 2026 was a Thursday
    const thursdayDate = new Date("2026-10-01T08:00:00Z");
    const briefing = await getDailyMorningBriefing(thursdayDate, testUserId);

    expect(briefing).toBeDefined();
    expect(briefing.dayOfWeek).toBe("Thursday");
    expect(briefing.isTrainingDay).toBe(true);
    expect(briefing.statusBadge).toContain("UPPER BODY B");
    expect(briefing.headline).toContain("Upper Body B");

    // Workout Plan
    expect(briefing.workoutPlan).toBeDefined();
    expect(briefing.workoutPlan?.exercises.length).toBeGreaterThanOrEqual(4);
    const bench = briefing.workoutPlan?.exercises.find((e) =>
      e.normalizedName.includes("bench")
    );
    expect(bench).toBeDefined();
    expect(bench?.targetLoadText).toContain("kg");
    expect(bench?.reps).toContain("10-12");
    expect(bench?.keyCues.length).toBeGreaterThan(0);
    expect(bench?.animationUrl).toContain(".gif");

    // Daily Nutrition & Habits
    expect(briefing.dailyTargets.caloriesKcal).toBe(1900);
    expect(briefing.dailyTargets.proteinGrams).toBe("60-75g");
    expect(briefing.dailyTargets.waterLiters).toBe("3-3.5L");
    expect(briefing.dailyTargets.walkMinutes).toBe("20-30 min");
    expect(briefing.dailyTargets.trainingStandard).toContain("technical failure");
  });

  it("generates a structured briefing for a rest recovery day (Wednesday)", async () => {
    // Wednesday: Sep 30, 2026 was a Wednesday
    const wednesdayDate = new Date("2026-09-30T08:00:00Z");
    const briefing = await getDailyMorningBriefing(wednesdayDate, testUserId);

    expect(briefing.dayOfWeek).toBe("Wednesday");
    expect(briefing.isTrainingDay).toBe(false);
    expect(briefing.statusBadge).toBe("ACTIVE RECOVERY");
    expect(briefing.headline).toContain("Rest & Recovery");

    expect(briefing.recoveryPlan).toBeDefined();
    expect(briefing.recoveryPlan?.recommendedActivities.length).toBeGreaterThan(1);
    expect(briefing.recoveryPlan?.recommendedActivities.some((a) => a.includes("walk"))).toBe(true);
  });

  it("handles dispatch function gracefully without active webhook configured", async () => {
    const briefing = await getDailyMorningBriefing();
    const result = await dispatchDailyMorningBriefing(briefing);

    expect(result).toBeDefined();
    expect(result.message).toContain("Briefing payload ready");
  });
});

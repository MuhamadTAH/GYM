"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Target,
  Flame,
  Beef,
  Droplets,
  Footprints,
  Dumbbell,
  CheckCircle2,
  Circle,
  Sliders,
  Sparkles,
  X,
  RefreshCw,
  CalendarDays,
  Layers,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logDailyMetricAction,
  clearAllGoalsAction,
  getRecommendedWeeklyPlanAction,
  getRecommendedMonthlyPlanAction,
  type DailyGoalsData,
  type SaveDailyGoalsInput,
} from "@/app/actions";

export function GoalsDashboard() {
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<"weekly" | "monthly" | null>("weekly");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state for editing targets
  const [form, setForm] = useState<{
    caloriesTarget: string;
    caloriesNotes: string;
    proteinMinGrams: string;
    proteinMaxGrams: string;
    proteinNotes: string;
    waterMinLiters: string;
    waterMaxLiters: string;
    waterNotes: string;
    dailyWalkMinMinutes: string;
    dailyWalkMaxMinutes: string;
    dailyWalkNotes: string;
    trainingDaysPerWeek: string;
    trainingNotes: string;
  }>({
    caloriesTarget: "",
    caloriesNotes: "",
    proteinMinGrams: "",
    proteinMaxGrams: "",
    proteinNotes: "",
    waterMinLiters: "",
    waterMaxLiters: "",
    waterNotes: "",
    dailyWalkMinMinutes: "",
    dailyWalkMaxMinutes: "",
    dailyWalkNotes: "",
    trainingDaysPerWeek: "",
    trainingNotes: "",
  });

  const refreshGoals = () => {
    startTransition(async () => {
      try {
        const data = await getDailyGoalsAction();
        setGoals(data);
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      }
    });
  };

  useEffect(() => {
    refreshGoals();
  }, []);

  const openConfigModal = () => {
    if (goals) {
      setForm({
        caloriesTarget: goals.caloriesTarget?.toString() || "",
        caloriesNotes: goals.caloriesNotes || "",
        proteinMinGrams: goals.proteinMinGrams?.toString() || "",
        proteinMaxGrams: goals.proteinMaxGrams?.toString() || "",
        proteinNotes: goals.proteinNotes || "",
        waterMinLiters: goals.waterMinLiters?.toString() || "",
        waterMaxLiters: goals.waterMaxLiters?.toString() || "",
        waterNotes: goals.waterNotes || "",
        dailyWalkMinMinutes: goals.dailyWalkMinMinutes?.toString() || "",
        dailyWalkMaxMinutes: goals.dailyWalkMaxMinutes?.toString() || "",
        dailyWalkNotes: goals.dailyWalkNotes || "",
        trainingDaysPerWeek: goals.trainingDaysPerWeek?.toString() || "",
        trainingNotes: goals.trainingNotes || "",
      });
    }
    setIsConfigOpen(true);
  };

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const input: SaveDailyGoalsInput = {
          caloriesTarget: form.caloriesTarget ? Number(form.caloriesTarget) : null,
          caloriesNotes: form.caloriesNotes || null,
          proteinMinGrams: form.proteinMinGrams ? Number(form.proteinMinGrams) : null,
          proteinMaxGrams: form.proteinMaxGrams ? Number(form.proteinMaxGrams) : null,
          proteinNotes: form.proteinNotes || null,
          waterMinLiters: form.waterMinLiters ? Number(form.waterMinLiters) : null,
          waterMaxLiters: form.waterMaxLiters ? Number(form.waterMaxLiters) : null,
          waterNotes: form.waterNotes || null,
          dailyWalkMinMinutes: form.dailyWalkMinMinutes ? Number(form.dailyWalkMinMinutes) : null,
          dailyWalkMaxMinutes: form.dailyWalkMaxMinutes ? Number(form.dailyWalkMaxMinutes) : null,
          dailyWalkNotes: form.dailyWalkNotes || null,
          trainingDaysPerWeek: form.trainingDaysPerWeek ? Number(form.trainingDaysPerWeek) : null,
          trainingNotes: form.trainingNotes || null,
        };
        const res = await saveDailyGoalsAction(input);
        if (res.success) {
          setGoals(res.goals);
          setIsConfigOpen(false);
          setStatusMessage({ text: "Targets updated.", type: "success" });
          setTimeout(() => setStatusMessage(null), 3000);
        }
      } catch {
        setStatusMessage({ text: "Failed to save targets.", type: "error" });
      }
    });
  };

  const handleQuickAddMetric = (metric: "water" | "walk", value: number) => {
    startTransition(async () => {
      try {
        const res = await logDailyMetricAction({ metric, value, mode: "add" });
        if (res.success) {
          setGoals(res.goals);
        }
      } catch {
        console.error("Failed to add metric");
      }
    });
  };

  const handleToggleTraining = () => {
    const nextVal = !goals?.todayTrainingCompleted;
    startTransition(async () => {
      try {
        const res = await logDailyMetricAction({ metric: "training", value: nextVal, mode: "set" });
        if (res.success) {
          setGoals(res.goals);
        }
      } catch {
        console.error("Failed to toggle training");
      }
    });
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all targets back to unconfigured state?")) return;
    startTransition(async () => {
      try {
        const res = await clearAllGoalsAction();
        if (res.success) {
          setGoals(res.goals);
          setIsConfigOpen(false);
          setStatusMessage({ text: "Targets cleared.", type: "success" });
          setTimeout(() => setStatusMessage(null), 3000);
        }
      } catch {
        setStatusMessage({ text: "Failed to clear targets.", type: "error" });
      }
    });
  };

  const handleLoadRecommendedTargets = () => {
    setForm({
      caloriesTarget: "1900",
      caloriesNotes: "Fat-loss deficit (~450 kcal below maintenance)",
      proteinMinGrams: "60",
      proteinMaxGrams: "75",
      proteinNotes: "High protein for muscle preservation",
      waterMinLiters: "3.0",
      waterMaxLiters: "3.5",
      waterNotes: "Daily hydration for recovery",
      dailyWalkMinMinutes: "20",
      dailyWalkMaxMinutes: "30",
      dailyWalkNotes: "Daily NEAT brisk walking",
      trainingDaysPerWeek: "5",
      trainingNotes: "5 days/week technical failure standard",
    });
  };

  const handleLoadWeeklyTemplate = () => {
    startTransition(async () => {
      const template = await getRecommendedWeeklyPlanAction();
      const res = await saveDailyGoalsAction({
        weeklyWorkoutsTarget: template.weeklyWorkoutsTarget,
        weeklyWalkMinutesTarget: template.weeklyWalkMinutesTarget,
        weeklyCalorieDeficitTarget: template.weeklyCalorieDeficitTarget,
        weeklyFocusNotes: template.weeklyFocusNotes,
        weeklySplitSchedule: template.weeklySplitSchedule,
      });
      if (res.success) {
        setGoals(res.goals);
        setStatusMessage({ text: "Loaded 5-day split template.", type: "success" });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    });
  };

  const handleLoadMonthlyTemplate = () => {
    startTransition(async () => {
      const template = await getRecommendedMonthlyPlanAction();
      const res = await saveDailyGoalsAction({
        monthlyMesocycleName: template.monthlyMesocycleName,
        monthlyPrimaryGoal: template.monthlyPrimaryGoal,
        monthlyWeightLossTargetKg: template.monthlyWeightLossTargetKg,
        monthlyTotalWorkoutsTarget: template.monthlyTotalWorkoutsTarget,
        monthlyFocusNotes: template.monthlyFocusNotes,
        monthlyPhases: template.monthlyPhases,
      });
      if (res.success) {
        setGoals(res.goals);
        setStatusMessage({ text: "Loaded 4-week mesocycle template.", type: "success" });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    });
  };

  const calcPct = (curr: number, target: number | null | undefined) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((curr / target) * 100));
  };

  const todayCalories = goals?.todayCalories ?? 0;
  const targetCalories = goals?.caloriesTarget;
  const calPct = calcPct(todayCalories, targetCalories);

  const todayProtein = goals?.todayProtein ?? 0;
  const targetProtein = goals?.proteinMinGrams;
  const proPct = calcPct(todayProtein, targetProtein);

  const todayWater = goals?.todayWaterLiters ?? 0;
  const targetWater = goals?.waterMinLiters;
  const waterPct = calcPct(todayWater, targetWater);

  const todayWalk = goals?.todayWalkMinutes ?? 0;
  const targetWalk = goals?.dailyWalkMinMinutes;
  const walkPct = calcPct(todayWalk, targetWalk);

  const isTrainingDone = Boolean(goals?.todayTrainingCompleted);

  return (
    <div className="w-full space-y-4 font-sans text-zinc-100">
      {/* Toast */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-xl flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-zinc-900 border-emerald-500 text-emerald-300"
              : "bg-zinc-900 border-rose-500 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <X className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Targets Header */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <h1 className="text-sm font-bold font-mono tracking-wider text-zinc-200">
              TARGETS &amp; HABITS
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshGoals}
              disabled={isPending}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openConfigModal}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Targets</span>
            </button>
          </div>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Calorie Deficit Target */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Flame className="w-3.5 h-3.5" /> Calories
              </span>
              <span>{targetCalories ? `${targetCalories} kcal` : "Unset"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {todayCalories} <span className="text-xs font-normal text-zinc-500">kcal eaten</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>

          {/* Protein Target */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Beef className="w-3.5 h-3.5" /> Protein
              </span>
              <span>{targetProtein ? `${targetProtein}g` : "Unset"}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {todayProtein} <span className="text-xs font-normal text-zinc-500">g</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>

          {/* Water Target & Quick Add */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Droplets className="w-3.5 h-3.5" /> Water
              </span>
              <span>{targetWater ? `${targetWater}L` : "Unset"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-white">
                {todayWater} <span className="text-xs font-normal text-zinc-500">L</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAddMetric("water", 0.5)}
                disabled={isPending}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 hover:bg-sky-900 transition cursor-pointer"
              >
                +0.5L
              </button>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          {/* Daily Walk Target & Quick Add */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Footprints className="w-3.5 h-3.5 text-zinc-400" /> Walk (NEAT)
              </span>
              <span>{targetWalk ? `${targetWalk}m` : "Unset"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold font-mono text-white">
                {todayWalk} <span className="text-xs font-normal text-zinc-500">min</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAddMetric("walk", 15)}
                disabled={isPending}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 transition cursor-pointer"
              >
                +15m
              </button>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-400 rounded-full transition-all"
                style={{ width: `${walkPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Workout Check-in Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-850">
          <div className="flex items-center gap-2.5">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">
              Today&apos;s Workout Status:
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                isTrainingDone
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {isTrainingDone ? "COMPLETED" : "NOT COMPLETED"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleTraining}
            disabled={isPending}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              isTrainingDone
                ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-300"
                : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
            }`}
          >
            {isTrainingDone ? "Mark Incomplete" : "Mark as Done"}
          </button>
        </div>
      </section>

      {/* Weekly Schedule & Monthly Plan Tabs */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 flex-wrap gap-2">
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActivePlanTab("weekly")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activePlanTab === "weekly"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly Split Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlanTab("monthly")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activePlanTab === "monthly"
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Monthly Roadmap</span>
            </button>
          </div>

          <div>
            {activePlanTab === "weekly" ? (
              <button
                type="button"
                onClick={handleLoadWeeklyTemplate}
                disabled={isPending}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Load 5-Day Template</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLoadMonthlyTemplate}
                disabled={isPending}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Load 4-Week Roadmap</span>
              </button>
            )}
          </div>
        </div>

        {/* Weekly Split Content */}
        {activePlanTab === "weekly" && (
          <div className="space-y-3">
            {goals?.weeklySplitSchedule && goals.weeklySplitSchedule.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
                {goals.weeklySplitSchedule.map((dayItem, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border ${
                      dayItem.isRest
                        ? "bg-zinc-900/30 border-zinc-850 text-zinc-500"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-400">{dayItem.day}</span>
                      {dayItem.isRest ? (
                        <span className="text-[10px] text-zinc-600">REST</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400">TRAIN</span>
                      )}
                    </div>
                    <div className="font-bold text-zinc-100 mt-1 truncate">
                      {dayItem.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {dayItem.focus || (dayItem.isRest ? "Recovery" : "Full session")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-zinc-850 rounded-xl text-xs font-mono text-zinc-500">
                No weekly split configured yet. Click &quot;Load 5-Day Template&quot; to populate.
              </div>
            )}
          </div>
        )}

        {/* Monthly Roadmap Content */}
        {activePlanTab === "monthly" && (
          <div className="space-y-3">
            {goals?.monthlyPhases && goals.monthlyPhases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
                {goals.monthlyPhases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-400">
                        Week {phase.weekNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {phase.intensityRpe || "RPE 7-8"}
                      </span>
                    </div>
                    <div className="font-bold text-zinc-100 truncate">
                      {phase.phaseName}
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {phase.volumeDescription || phase.focusNotes || "Overload"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-zinc-850 rounded-xl text-xs font-mono text-zinc-500">
                No monthly roadmap configured yet. Click &quot;Load 4-Week Roadmap&quot; to populate.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Target Edit Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Set Custom Targets</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-400">Need quick science-backed numbers?</span>
                <button
                  type="button"
                  onClick={handleLoadRecommendedTargets}
                  className="px-2.5 py-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold"
                >
                  Auto-fill Deficit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Calories Target (kcal)</label>
                  <input
                    type="number"
                    value={form.caloriesTarget}
                    onChange={(e) => setForm({ ...form, caloriesTarget: e.target.value })}
                    placeholder="1900"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Protein Min (g)</label>
                  <input
                    type="number"
                    value={form.proteinMinGrams}
                    onChange={(e) => setForm({ ...form, proteinMinGrams: e.target.value })}
                    placeholder="65"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Water Min (Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.waterMinLiters}
                    onChange={(e) => setForm({ ...form, waterMinLiters: e.target.value })}
                    placeholder="3.0"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Daily Walk (min)</label>
                  <input
                    type="number"
                    value={form.dailyWalkMinMinutes}
                    onChange={(e) => setForm({ ...form, dailyWalkMinMinutes: e.target.value })}
                    placeholder="25"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-rose-950/40 text-rose-400 border border-zinc-800 text-xs"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs"
                >
                  Save Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

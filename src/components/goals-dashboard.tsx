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
  RotateCcw,
  Sliders,
  Sparkles,
  X,
  RefreshCw,
  CalendarDays,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Send,
  Zap,
} from "lucide-react";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logNaturalEntryAction,
  deleteLoggedItemAction,
  resetDailyTrackingAction,
  clearAllGoalsAction,
  getRecommendedWeeklyPlanAction,
  getRecommendedMonthlyPlanAction,
  type DailyGoalsData,
  type SaveDailyGoalsInput,
} from "@/app/actions";
import type { LoggedItem, WeeklySplitDay, MonthlyPhase } from "@/db/schema";

export function GoalsDashboard() {
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [naturalInput, setNaturalInput] = useState("");
  const [activePlanTab, setActivePlanTab] = useState<"weekly" | "monthly" | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state for editing targets (starts blank by default)
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

    const onFocus = () => refreshGoals();
    window.addEventListener("focus", onFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        getDailyGoalsAction()
          .then((data) => setGoals(data))
          .catch(() => {});
      }
    }, 5000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
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
          setStatusMessage({ text: "Targets updated successfully!", type: "success" });
          setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage({ text: "Failed to save targets.", type: "error" });
      }
    });
  };

  const handleLogNatural = (textToLog?: string) => {
    const text = (textToLog || naturalInput).trim();
    if (!text) return;

    startTransition(async () => {
      try {
        const res = await logNaturalEntryAction({ text });
        if (res.success) {
          setGoals(res.goals);
          setNaturalInput("");
          setStatusMessage({ text: res.message, type: "success" });
          setTimeout(() => setStatusMessage(null), 4000);
        } else {
          setStatusMessage({ text: res.message, type: "error" });
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } catch {
        setStatusMessage({ text: "Failed to log entry.", type: "error" });
      }
    });
  };

  const handleDeleteItem = (itemId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteLoggedItemAction(itemId);
        if (res.success) {
          setGoals(res.goals);
          setStatusMessage({ text: "Item removed and totals updated.", type: "success" });
          setTimeout(() => setStatusMessage(null), 3000);
        }
      } catch {
        setStatusMessage({ text: "Failed to delete item.", type: "error" });
      }
    });
  };

  const handleResetToday = () => {
    if (!window.confirm("Reset today's logged intake and activities to zero? Your targets will be preserved.")) return;
    startTransition(async () => {
      try {
        const res = await resetDailyTrackingAction();
        if (res.success) {
          setGoals(res.goals);
          setStatusMessage({ text: "Today's tracking has been reset to 0.", type: "success" });
          setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage({ text: "Failed to reset today's tracking.", type: "error" });
      }
    });
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all targets and logged data back to a completely blank unconfigured state?")) return;
    startTransition(async () => {
      try {
        const res = await clearAllGoalsAction();
        if (res.success) {
          setGoals(res.goals);
          setIsConfigOpen(false);
          setStatusMessage({ text: "All targets cleared.", type: "success" });
          setTimeout(() => setStatusMessage(null), 3500);
        }
      } catch {
        setStatusMessage({ text: "Failed to clear targets.", type: "error" });
      }
    });
  };

  const handleLoadRecommendedTargets = () => {
    setForm({
      caloriesTarget: "1900",
      caloriesNotes: "Steady fat-loss deficit (~450 kcal below TDEE) preserving muscle mass",
      proteinMinGrams: "60",
      proteinMaxGrams: "75",
      proteinNotes: "High protein: 4 eggs morning, chicken breast dinner, lentils/family staples",
      waterMinLiters: "3.0",
      waterMaxLiters: "3.5",
      waterNotes: "Daily hydration for recovery, cellular volume, and joints",
      dailyWalkMinMinutes: "20",
      dailyWalkMaxMinutes: "30",
      dailyWalkNotes: "Brisk outdoor walking to keep NEAT and metabolic rate active",
      trainingDaysPerWeek: "5",
      trainingNotes: "5 days/week double progression. Stop all sets strictly at technical failure.",
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
        setStatusMessage({ text: "Loaded recommended 5-day split schedule!", type: "success" });
        setTimeout(() => setStatusMessage(null), 3500);
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
        setStatusMessage({ text: "Loaded recommended 4-week overload mesocycle!", type: "success" });
        setTimeout(() => setStatusMessage(null), 3500);
      }
    });
  };

  // Safe percentage helper
  const calcPct = (curr: number, target: number | null | undefined) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((curr / target) * 100));
  };

  const dateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const todayCalories = goals?.todayCalories ?? 0;
  const targetCalories = goals?.caloriesTarget;
  const calPct = calcPct(todayCalories, targetCalories);

  const todayProtein = goals?.todayProtein ?? 0;
  const targetProteinMin = goals?.proteinMinGrams;
  const targetProteinMax = goals?.proteinMaxGrams;
  const proPct = calcPct(todayProtein, targetProteinMax || targetProteinMin || null);

  const todayWater = goals?.todayWaterLiters ?? 0;
  const targetWaterMin = goals?.waterMinLiters;
  const targetWaterMax = goals?.waterMaxLiters;
  const waterPct = calcPct(todayWater, targetWaterMax || targetWaterMin || null);

  const todayWalk = goals?.todayWalkMinutes ?? 0;
  const targetWalkMin = goals?.dailyWalkMinMinutes;
  const targetWalkMax = goals?.dailyWalkMaxMinutes;
  const walkPct = calcPct(todayWalk, targetWalkMax || targetWalkMin || null);

  const isTrainingDone = Boolean(goals?.todayTrainingCompleted);
  const loggedItems: LoggedItem[] = goals?.todayLoggedItems || [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Notification Toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-sm font-medium flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
              : "bg-red-950/80 border-red-500/50 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white ml-3 text-xs uppercase"
          >
            Close
          </button>
        </div>
      )}

      {/* Modern Header */}
      <header className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Target className="w-6 h-6 text-emerald-400" />
              GOALS & HABITS
            </h1>
            <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              AUTOREGULATED
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 font-mono">
            {dateString} • Daily nutrition, habits & training
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={refreshGoals}
            disabled={isPending}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Refresh latest data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleResetToday}
            disabled={isPending}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Reset today's numbers to zero"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            Reset Today
          </button>
          <button
            onClick={openConfigModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
          >
            <Sliders className="w-3.5 h-3.5" />
            Set Targets
          </button>
        </div>
      </header>

      {/* HERO SECTION: Natural Language Meal & Habit Logger */}
      <section className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-850 border-2 border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="natural-input" className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <span className="text-lg">🍳</span>
              What did you eat or do today?
            </label>
            <span className="text-xs text-zinc-400 font-mono">
              AI estimates calories & protein automatically
            </span>
          </div>

          {/* Large Clean Natural Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogNatural();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                id="natural-input"
                type="text"
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                placeholder='e.g. "4 boiled eggs", "chicken breast with rice", "drank 500ml water", "walked 25 mins"...'
                disabled={isPending}
                className="w-full bg-black/60 border border-zinc-700/80 rounded-xl px-4 py-3.5 text-sm md:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
              />
              {naturalInput && (
                <button
                  type="button"
                  onClick={() => setNaturalInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending || !naturalInput.trim()}
              className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black font-black text-sm rounded-xl flex items-center gap-2 transition-all shrink-0 font-mono shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>LOG</span>
            </button>
          </form>

          {/* Instant Quick-Pill Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
            <span className="text-zinc-500 font-mono uppercase tracking-wider text-[11px] shrink-0">
              Quick tap:
            </span>
            {[
              { label: "🍳 4 Eggs", query: "4 eggs" },
              { label: "🥩 Chicken Breast (200g)", query: "chicken breast 200g" },
              { label: "🥤 Whey Shake", query: "1 scoop of whey protein" },
              { label: "🍚 Bowl of Rice", query: "1 bowl of white rice" },
              { label: "💧 500ml Water", query: "500ml water" },
              { label: "👟 25m Walk", query: "walked 25 minutes" },
              { label: "🏋️ Workout Done", query: "completed workout" },
            ].map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => handleLogNatural(pill.query)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 whitespace-nowrap transition-colors text-xs font-medium shrink-0"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY'S METRICS: Clean High-Signal Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
            <span>📊</span> Today&apos;s Nutrition &amp; Habits
          </h2>
          {targetCalories ? (
            <span className="text-xs text-zinc-400 font-mono">
              Target: {targetCalories.toLocaleString()} kcal
            </span>
          ) : (
            <button
              onClick={openConfigModal}
              className="text-xs text-emerald-400 hover:underline font-mono"
            >
              + Set targets
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Calories */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Calories
              </span>
              <span className="text-xs font-mono text-zinc-400 font-semibold">
                {calPct}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono">
                  {todayCalories.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  / {targetCalories ? `${targetCalories.toLocaleString()} kcal` : "no target"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                {goals?.caloriesNotes || (targetCalories ? "Deficit target" : "Click 'Set Targets' to set goal")}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>

          {/* Card 2: Protein */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Beef className="w-4 h-4 text-emerald-400" />
                Protein
              </span>
              <span className="text-xs font-mono text-zinc-400 font-semibold">
                {proPct}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono">
                  {todayProtein}g
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  / {targetProteinMin ? `${targetProteinMin}${targetProteinMax ? `-${targetProteinMax}` : ""}g` : "no target"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                {goals?.proteinNotes || (targetProteinMin ? "Muscle preservation" : "e.g. 4 eggs + chicken")}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>

          {/* Card 3: Water */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Hydration
              </span>
              <span className="text-xs font-mono text-zinc-400 font-semibold">
                {waterPct}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono">
                  {todayWater}L
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  / {targetWaterMin ? `${targetWaterMin}${targetWaterMax ? `-${targetWaterMax}` : ""}L` : "no target"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                {goals?.waterNotes || (targetWaterMin ? "Cellular hydration" : "e.g. 3.0 to 3.5 Liters")}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          {/* Card 4: Daily Walk */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-purple-400" />
                Daily Walk
              </span>
              <span className="text-xs font-mono text-zinc-400 font-semibold">
                {walkPct}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono">
                  {todayWalk}m
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  / {targetWalkMin ? `${targetWalkMin}${targetWalkMax ? `-${targetWalkMax}` : ""}m` : "no target"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                {goals?.dailyWalkNotes || (targetWalkMin ? "NEAT & active metabolic rate" : "e.g. 20 to 30 mins")}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${walkPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Training Adherence Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                isTrainingDone
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Today&apos;s Training Session
                </span>
                {isTrainingDone ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> COMPLETED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                    PENDING
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {goals?.trainingDaysPerWeek ? `Target: ${goals.trainingDaysPerWeek} days/week` : "5 days/week target"}
                {" • "}
                {goals?.trainingNotes || "Stop sets strictly at technical breakdown"}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleLogNatural(isTrainingDone ? "reset workout" : "completed workout")}
            disabled={isPending}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 self-start sm:self-auto ${
              isTrainingDone
                ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            }`}
          >
            {isTrainingDone ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Session
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Mark Done Today
              </>
            )}
          </button>
        </div>
      </section>

      {/* TODAY'S LOGGED MEALS & ACTIVITIES FEED */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Today&apos;s Activity &amp; Meal History
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold">
              {loggedItems.length}
            </span>
          </div>
          {loggedItems.length > 0 && (
            <button
              onClick={handleResetToday}
              className="text-xs text-zinc-400 hover:text-amber-400 font-mono transition-colors"
            >
              Clear all items
            </button>
          )}
        </div>

        {loggedItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
            <p className="text-sm text-zinc-400">
              No meals or activities logged yet today.
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              Use the input box above (e.g. &quot;I ate 4 eggs&quot; or &quot;drank 500ml water&quot;) to log your intake automatically!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {loggedItems.map((item) => (
              <div
                key={item.id}
                className="bg-black/40 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">
                    {item.category === "food"
                      ? "🍽️"
                      : item.category === "water"
                      ? "💧"
                      : item.category === "walk"
                      ? "👟"
                      : "🏋️"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {item.rawText}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-0.5">
                      {item.calories > 0 && (
                        <span className="text-amber-400 font-semibold">
                          +{item.calories} kcal
                        </span>
                      )}
                      {item.protein > 0 && (
                        <span className="text-emerald-400 font-semibold">
                          +{item.protein}g protein
                        </span>
                      )}
                      {item.waterLiters > 0 && (
                        <span className="text-cyan-400 font-semibold">
                          +{item.waterLiters}L
                        </span>
                      )}
                      {item.walkMinutes > 0 && (
                        <span className="text-purple-400 font-semibold">
                          +{item.walkMinutes}m walk
                        </span>
                      )}
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-500 text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={isPending}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                  title="Remove this item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECONDARY SECTION: Training Plans (Weekly Split & Monthly Mesocycle) */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              Training Roadmap
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              7-Day training split &amp; 4-week progressive overload mesocycle
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActivePlanTab(activePlanTab === "weekly" ? null : "weekly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                activePlanTab === "weekly"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750"
              }`}
            >
              Weekly Split {activePlanTab === "weekly" ? "▲" : "▼"}
            </button>
            <button
              onClick={() => setActivePlanTab(activePlanTab === "monthly" ? null : "monthly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                activePlanTab === "monthly"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750"
              }`}
            >
              Monthly Mesocycle {activePlanTab === "monthly" ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {/* Weekly Split View (Expandable) */}
        {activePlanTab === "weekly" && (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">
                Weekly Target: {goals?.weeklyWorkoutsTarget ? `${goals.weeklyWorkoutsTarget} Workouts` : "Unset"} •{" "}
                {goals?.weeklyWalkMinutesTarget ? `${goals.weeklyWalkMinutesTarget}m Walk` : "Unset"}
              </span>
              {(!goals?.weeklySplitSchedule || goals.weeklySplitSchedule.length === 0) && (
                <button
                  onClick={handleLoadWeeklyTemplate}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Load Recommended 5-Day Split
                </button>
              )}
            </div>

            {goals?.weeklySplitSchedule && goals.weeklySplitSchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {goals.weeklySplitSchedule.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      day.isRest
                        ? "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        : "bg-zinc-800/60 border-zinc-700 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className={day.isRest ? "text-zinc-500" : "text-indigo-400"}>
                        {day.day}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/40">
                        {day.isRest ? "RECOVERY" : "TRAINING"}
                      </span>
                    </div>
                    <p className="font-bold">{day.title}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {day.focus}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                <p className="text-xs text-zinc-400">
                  No weekly split configured yet. Click &quot;Load Recommended 5-Day Split&quot; to populate.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Monthly Mesocycle View (Expandable) */}
        {activePlanTab === "monthly" && (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">
                {goals?.monthlyMesocycleName || "4-Week Mesocycle Block"} •{" "}
                {goals?.monthlyPrimaryGoal || "Hypertrophy / Recomposition"}
              </span>
              {(!goals?.monthlyPhases || goals.monthlyPhases.length === 0) && (
                <button
                  onClick={handleLoadMonthlyTemplate}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Load Recommended 4-Week Block
                </button>
              )}
            </div>

            {goals?.monthlyPhases && goals.monthlyPhases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {goals.monthlyPhases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-850/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-purple-400">Week {phase.weekNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-zinc-300">
                        {phase.intensityRpe}
                      </span>
                    </div>
                    <p className="font-bold text-white">{phase.phaseName}</p>
                    <p className="text-[11px] text-zinc-400">{phase.volumeDescription}</p>
                    <p className="text-[10px] text-zinc-500 font-mono italic">{phase.focusNotes}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                <p className="text-xs text-zinc-400">
                  No monthly mesocycle configured yet. Click &quot;Load Recommended 4-Week Block&quot; to populate.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* TARGET CONFIGURATION MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  CUSTOMIZE GOAL TARGETS
                </h3>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
                <span className="text-xs text-zinc-400 font-mono">
                  Zero prefill default: only set what you want
                </span>
                <button
                  type="button"
                  onClick={handleLoadRecommendedTargets}
                  className="text-xs text-emerald-400 hover:underline font-mono"
                >
                  ⚡ Load Recommended
                </button>
              </div>

              {/* Calories */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Target Calories (kcal)
                </label>
                <input
                  type="number"
                  value={form.caloriesTarget}
                  onChange={(e) => setForm({ ...form, caloriesTarget: e.target.value })}
                  placeholder="e.g. 1900"
                  className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Protein */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Beef className="w-3.5 h-3.5 text-emerald-400" /> Protein Range (Grams)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={form.proteinMinGrams}
                    onChange={(e) => setForm({ ...form, proteinMinGrams: e.target.value })}
                    placeholder="Min (e.g. 60)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    value={form.proteinMaxGrams}
                    onChange={(e) => setForm({ ...form, proteinMaxGrams: e.target.value })}
                    placeholder="Max (e.g. 75)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Water */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Water Intake Range (Liters)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={form.waterMinLiters}
                    onChange={(e) => setForm({ ...form, waterMinLiters: e.target.value })}
                    placeholder="Min (e.g. 3.0)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={form.waterMaxLiters}
                    onChange={(e) => setForm({ ...form, waterMaxLiters: e.target.value })}
                    placeholder="Max (e.g. 3.5)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Walk */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-purple-400" /> Daily Walk Duration (Minutes)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={form.dailyWalkMinMinutes}
                    onChange={(e) => setForm({ ...form, dailyWalkMinMinutes: e.target.value })}
                    placeholder="Min (e.g. 20)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    value={form.dailyWalkMaxMinutes}
                    onChange={(e) => setForm({ ...form, dailyWalkMaxMinutes: e.target.value })}
                    placeholder="Max (e.g. 30)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Training */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-indigo-400" /> Target Training Days / Week
                </label>
                <input
                  type="number"
                  value={form.trainingDaysPerWeek}
                  onChange={(e) => setForm({ ...form, trainingDaysPerWeek: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:underline font-mono"
                >
                  Clear All Goals
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-md shadow-emerald-600/20"
                  >
                    Save Targets
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

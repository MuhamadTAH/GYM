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
  Edit3,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  X,
  Calendar,
} from "lucide-react";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logDailyMetricAction,
  resetDailyTrackingAction,
  clearAllGoalsAction,
  type DailyGoalsData,
  type SaveDailyGoalsInput,
} from "@/app/actions";

export function GoalsDashboard() {
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state for goal configuration (starts completely empty by default)
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

  // Custom quick-add inputs
  const [customCalorieInput, setCustomCalorieInput] = useState("");
  const [customProteinInput, setCustomProteinInput] = useState("");

  const refreshGoals = () => {
    getDailyGoalsAction().then((data) => {
      setGoals(data);
      // Sync form if goals exist
      setForm({
        caloriesTarget: data.caloriesTarget !== null ? String(data.caloriesTarget) : "",
        caloriesNotes: data.caloriesNotes ?? "",
        proteinMinGrams: data.proteinMinGrams !== null ? String(data.proteinMinGrams) : "",
        proteinMaxGrams: data.proteinMaxGrams !== null ? String(data.proteinMaxGrams) : "",
        proteinNotes: data.proteinNotes ?? "",
        waterMinLiters: data.waterMinLiters !== null ? String(data.waterMinLiters) : "",
        waterMaxLiters: data.waterMaxLiters !== null ? String(data.waterMaxLiters) : "",
        waterNotes: data.waterNotes ?? "",
        dailyWalkMinMinutes: data.dailyWalkMinMinutes !== null ? String(data.dailyWalkMinMinutes) : "",
        dailyWalkMaxMinutes: data.dailyWalkMaxMinutes !== null ? String(data.dailyWalkMaxMinutes) : "",
        dailyWalkNotes: data.dailyWalkNotes ?? "",
        trainingDaysPerWeek: data.trainingDaysPerWeek !== null ? String(data.trainingDaysPerWeek) : "",
        trainingNotes: data.trainingNotes ?? "",
      });
    });
  };

  useEffect(() => {
    refreshGoals();
  }, []);

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: SaveDailyGoalsInput = {
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

      const res = await saveDailyGoalsAction(payload);
      if (res.success) {
        setGoals(res.goals);
        setIsConfigOpen(false);
        setStatusMessage("✅ Daily goals saved successfully!");
        setTimeout(() => setStatusMessage(null), 3000);
      }
    });
  };

  const handleQuickLog = (
    metric: "calories" | "protein" | "water" | "walk" | "training",
    value: number | boolean,
    mode: "add" | "set" = "add"
  ) => {
    startTransition(async () => {
      const res = await logDailyMetricAction({ metric, value, mode });
      if (res.success) {
        setGoals(res.goals);
      }
    });
  };

  const handleResetToday = () => {
    if (confirm("Reset today's tracking numbers to zero? Your configured targets will not be changed.")) {
      startTransition(async () => {
        const res = await resetDailyTrackingAction();
        if (res.success) {
          setGoals(res.goals);
          setStatusMessage("🔄 Today's intake numbers reset to zero.");
          setTimeout(() => setStatusMessage(null), 3000);
        }
      });
    }
  };

  const handleClearAllGoals = () => {
    if (confirm("Clear all targets and reset back to completely empty?")) {
      startTransition(async () => {
        const res = await clearAllGoalsAction();
        if (res.success) {
          setGoals(res.goals);
          setForm({
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
          setIsConfigOpen(false);
          setStatusMessage("🗑️ All goals cleared.");
          setTimeout(() => setStatusMessage(null), 3000);
        }
      });
    }
  };

  const hasAnyTargetSet = Boolean(
    goals?.caloriesTarget ||
      goals?.proteinMinGrams ||
      goals?.proteinMaxGrams ||
      goals?.waterMinLiters ||
      goals?.waterMaxLiters ||
      goals?.dailyWalkMinMinutes ||
      goals?.dailyWalkMaxMinutes ||
      goals?.trainingDaysPerWeek
  );

  // Adherence calculation
  const totalConfiguredCategories = [
    Boolean(goals?.caloriesTarget),
    Boolean(goals?.proteinMinGrams || goals?.proteinMaxGrams),
    Boolean(goals?.waterMinLiters || goals?.waterMaxLiters),
    Boolean(goals?.dailyWalkMinMinutes || goals?.dailyWalkMaxMinutes),
    Boolean(goals?.trainingDaysPerWeek),
  ].filter(Boolean).length;

  let categoriesCompletedToday = 0;
  if (goals?.caloriesTarget && goals.todayCalories >= goals.caloriesTarget) categoriesCompletedToday++;
  if (goals?.proteinMinGrams && goals.todayProtein >= goals.proteinMinGrams) categoriesCompletedToday++;
  if (goals?.waterMinLiters && goals.todayWaterLiters >= goals.waterMinLiters) categoriesCompletedToday++;
  if (goals?.dailyWalkMinMinutes && goals.todayWalkMinutes >= goals.dailyWalkMinMinutes) categoriesCompletedToday++;
  if (goals?.trainingDaysPerWeek && goals.todayTrainingCompleted) categoriesCompletedToday++;

  const todayScorePercent =
    totalConfiguredCategories > 0
      ? Math.round((categoriesCompletedToday / totalConfiguredCategories) * 100)
      : 0;

  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 text-zinc-100 select-none pb-20">
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black font-mono uppercase tracking-wider text-zinc-100">
                Daily Goals & Habits
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AUTOREGULATED
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Today: <span className="text-zinc-200">{todayDateStr}</span> • Non-negotiable daily adherence
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasAnyTargetSet && (
            <button
              type="button"
              onClick={handleResetToday}
              disabled={isPending}
              className="text-xs font-mono px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Reset today's tracking intake to 0 without changing your goals"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Today</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="text-xs font-mono font-bold px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{hasAnyTargetSet ? "Edit Goals" : "Configure Goals"}</span>
          </button>
        </div>
      </header>

      {/* Notification toast */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Empty State Banner if no goals are configured yet */}
      {!hasAnyTargetSet && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 flex flex-col items-center text-center gap-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h2 className="text-base sm:text-lg font-black font-mono text-zinc-100 uppercase tracking-wide">
              No Goals Configured Yet
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1.5 leading-relaxed">
              Your dashboard starts completely clean. Click below to enter your exact targets for Calories,
              Protein, Water, Daily Walk, and Training Adherence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="text-xs font-mono font-bold px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Set My Daily Goals</span>
          </button>
        </div>
      )}

      {/* Adherence Score Ribbon (Only shown if goals are configured) */}
      {hasAnyTargetSet && (
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 font-mono font-black text-emerald-400 text-lg">
              {todayScorePercent}%
            </div>
            <div>
              <div className="text-xs font-bold font-mono text-zinc-200">
                Today&apos;s Goal Adherence
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {categoriesCompletedToday} of {totalConfiguredCategories} configured targets reached today
              </div>
            </div>
          </div>

          <div className="w-full sm:w-64 bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, todayScorePercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* 5 Category Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. CALORIES CARD */}
        <section className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-zinc-200">
                  Calories
                </span>
              </div>
              {goals?.caloriesTarget ? (
                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                  Target: {goals.caloriesTarget.toLocaleString()} kcal
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">Not configured</span>
              )}
            </div>

            {/* Strategic Notes */}
            {goals?.caloriesNotes ? (
              <p className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                💡 {goals.caloriesNotes}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono italic">
                No deficit or calorie strategy note entered.
              </p>
            )}

            {/* Progress Display */}
            <div className="mt-4">
              <div className="flex justify-between items-baseline font-mono text-xs mb-1.5">
                <span className="text-zinc-400">Today&apos;s Intake:</span>
                <span className="font-bold text-zinc-100">
                  <span className="text-orange-400 text-sm font-black">{goals?.todayCalories ?? 0}</span>
                  {goals?.caloriesTarget ? ` / ${goals.caloriesTarget} kcal` : " kcal"}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{
                    width: `${
                      goals?.caloriesTarget
                        ? Math.min(100, Math.round(((goals.todayCalories ?? 0) / goals.caloriesTarget) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Intake Logger */}
          <div className="mt-5 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {[+100, +250, +500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickLog("calories", amt, "add")}
                  disabled={isPending}
                  className="flex-1 py-1.5 text-xs font-mono rounded-lg bg-zinc-800 hover:bg-zinc-750 text-orange-300 border border-zinc-700/60 transition cursor-pointer disabled:opacity-50"
                >
                  +{amt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                placeholder="Custom kcal..."
                value={customCalorieInput}
                onChange={(e) => setCustomCalorieInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Number(customCalorieInput);
                  if (val > 0) {
                    handleQuickLog("calories", val, "add");
                    setCustomCalorieInput("");
                  }
                }}
                disabled={!customCalorieInput || isPending}
                className="px-3 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* 2. PROTEIN CARD */}
        <section className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <Beef className="w-5 h-5" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-zinc-200">
                  Protein
                </span>
              </div>
              {goals?.proteinMinGrams || goals?.proteinMaxGrams ? (
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {goals.proteinMinGrams && goals.proteinMaxGrams
                    ? `${goals.proteinMinGrams}g - ${goals.proteinMaxGrams}g`
                    : `${goals.proteinMinGrams ?? goals.proteinMaxGrams}g target`}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">Not configured</span>
              )}
            </div>

            {/* Strategic Notes */}
            {goals?.proteinNotes ? (
              <p className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                🥩 {goals.proteinNotes}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono italic">
                No food staples or protein sources specified.
              </p>
            )}

            {/* Progress Display */}
            <div className="mt-4">
              <div className="flex justify-between items-baseline font-mono text-xs mb-1.5">
                <span className="text-zinc-400">Today&apos;s Intake:</span>
                <span className="font-bold text-zinc-100">
                  <span className="text-rose-400 text-sm font-black">{goals?.todayProtein ?? 0}g</span>
                  {goals?.proteinMinGrams
                    ? ` / ${goals.proteinMinGrams}${goals.proteinMaxGrams ? `-${goals.proteinMaxGrams}` : ""}g`
                    : ""}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{
                    width: `${
                      goals?.proteinMinGrams
                        ? Math.min(100, Math.round(((goals.todayProtein ?? 0) / goals.proteinMinGrams) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Protein Logger */}
          <div className="mt-5 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {[+10, +25, +30].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickLog("protein", amt, "add")}
                  disabled={isPending}
                  className="flex-1 py-1.5 text-xs font-mono rounded-lg bg-zinc-800 hover:bg-zinc-750 text-rose-300 border border-zinc-700/60 transition cursor-pointer disabled:opacity-50"
                >
                  +{amt}g
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                placeholder="Custom grams..."
                value={customProteinInput}
                onChange={(e) => setCustomProteinInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Number(customProteinInput);
                  if (val > 0) {
                    handleQuickLog("protein", val, "add");
                    setCustomProteinInput("");
                  }
                }}
                disabled={!customProteinInput || isPending}
                className="px-3 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* 3. WATER INTAKE CARD */}
        <section className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Droplets className="w-5 h-5" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-zinc-200">
                  Water Intake
                </span>
              </div>
              {goals?.waterMinLiters || goals?.waterMaxLiters ? (
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {goals.waterMinLiters && goals.waterMaxLiters
                    ? `${goals.waterMinLiters}L - ${goals.waterMaxLiters}L`
                    : `${goals.waterMinLiters ?? goals.waterMaxLiters}L target`}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">Not configured</span>
              )}
            </div>

            {/* Strategic Notes */}
            {goals?.waterNotes ? (
              <p className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                💧 {goals.waterNotes}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono italic">
                No hydration reminder note specified.
              </p>
            )}

            {/* Progress Display */}
            <div className="mt-4">
              <div className="flex justify-between items-baseline font-mono text-xs mb-1.5">
                <span className="text-zinc-400">Today&apos;s Hydration:</span>
                <span className="font-bold text-zinc-100">
                  <span className="text-cyan-400 text-sm font-black">{goals?.todayWaterLiters ?? 0}L</span>
                  {goals?.waterMinLiters
                    ? ` / ${goals.waterMinLiters}${goals.waterMaxLiters ? `-${goals.waterMaxLiters}` : ""}L`
                    : ""}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{
                    width: `${
                      goals?.waterMinLiters
                        ? Math.min(100, Math.round(((goals.todayWaterLiters ?? 0) / goals.waterMinLiters) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Water Buttons */}
          <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
            {[
              { label: "+250ml", val: 0.25 },
              { label: "+500ml", val: 0.5 },
              { label: "+1.0L", val: 1.0 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleQuickLog("water", btn.val, "add")}
                disabled={isPending}
                className="flex-1 py-1.5 text-xs font-mono rounded-lg bg-zinc-800 hover:bg-zinc-750 text-cyan-300 border border-zinc-700/60 transition cursor-pointer disabled:opacity-50"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. DAILY WALK (NEAT) CARD */}
        <section className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Footprints className="w-5 h-5" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-zinc-200">
                  Daily Walk (NEAT)
                </span>
              </div>
              {goals?.dailyWalkMinMinutes || goals?.dailyWalkMaxMinutes ? (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {goals.dailyWalkMinMinutes && goals.dailyWalkMaxMinutes
                    ? `${goals.dailyWalkMinMinutes} - ${goals.dailyWalkMaxMinutes} min`
                    : `${goals.dailyWalkMinMinutes ?? goals.dailyWalkMaxMinutes} min`}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">Not configured</span>
              )}
            </div>

            {/* Strategic Notes */}
            {goals?.dailyWalkNotes ? (
              <p className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                👟 {goals.dailyWalkNotes}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono italic">
                No active metabolic rate walk note specified.
              </p>
            )}

            {/* Progress Display */}
            <div className="mt-4">
              <div className="flex justify-between items-baseline font-mono text-xs mb-1.5">
                <span className="text-zinc-400">Walk Time Today:</span>
                <span className="font-bold text-zinc-100">
                  <span className="text-emerald-400 text-sm font-black">{goals?.todayWalkMinutes ?? 0}m</span>
                  {goals?.dailyWalkMinMinutes
                    ? ` / ${goals.dailyWalkMinMinutes}${goals.dailyWalkMaxMinutes ? `-${goals.dailyWalkMaxMinutes}` : ""}m`
                    : ""}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      goals?.dailyWalkMinMinutes
                        ? Math.min(100, Math.round(((goals.todayWalkMinutes ?? 0) / goals.dailyWalkMinMinutes) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Walk Buttons */}
          <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
            {[
              { label: "+10m", val: 10 },
              { label: "+15m", val: 15 },
              { label: "+30m", val: 30 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleQuickLog("walk", btn.val, "add")}
                disabled={isPending}
                className="flex-1 py-1.5 text-xs font-mono rounded-lg bg-zinc-800 hover:bg-zinc-750 text-emerald-300 border border-zinc-700/60 transition cursor-pointer disabled:opacity-50"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* 5. TRAINING ADHERENCE & DISCIPLINE CARD */}
        <section className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Dumbbell className="w-5 h-5" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-zinc-200">
                  Training Discipline & Frequency
                </span>
              </div>
              {goals?.trainingDaysPerWeek ? (
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  Target: {goals.trainingDaysPerWeek} Days / Week
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500">Not configured</span>
              )}
            </div>

            {/* Strategic Notes */}
            {goals?.trainingNotes ? (
              <p className="mt-2 text-xs text-zinc-300 font-mono bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 leading-relaxed">
                🎯 {goals.trainingNotes}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600 font-mono italic">
                No technical failure or execution discipline standard specified.
              </p>
            )}

            {/* Weekly Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] font-mono text-zinc-500 uppercase">This Week&apos;s Sessions</div>
                <div className="text-lg font-mono font-black text-purple-400 mt-0.5">
                  {goals?.weeklyWorkoutsCompleted ?? 0}
                  {goals?.trainingDaysPerWeek ? ` / ${goals.trainingDaysPerWeek} Completed` : " Completed"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-zinc-500 uppercase">Today&apos;s Workout</div>
                  <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                    {goals?.todayTrainingCompleted ? "✅ Session Done" : "⏳ Pending Session"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLog("training", !goals?.todayTrainingCompleted, "set")}
                  disabled={isPending}
                  className={`p-2 rounded-xl transition cursor-pointer border ${
                    goals?.todayTrainingCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {goals?.todayTrainingCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Layer 0 Safeguard: Stop all sets at technical breakdown.</span>
            <button
              type="button"
              onClick={() => handleQuickLog("training", !goals?.todayTrainingCompleted, "set")}
              className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
            >
              {goals?.todayTrainingCompleted ? "Mark Incomplete" : "Mark Done Today"}
            </button>
          </div>
        </section>
      </div>

      {/* MODAL: CONFIGURE / EDIT GOALS (Completely empty by default) */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black font-mono uppercase tracking-wider text-zinc-100">
                  Configure My Daily Targets
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveGoals} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* 1. Calories */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-3">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-mono font-bold uppercase">
                  <Flame className="w-4 h-4" />
                  <span>Calories Target</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Target (kcal)</label>
                    <input
                      type="number"
                      placeholder="e.g., 1900"
                      value={form.caloriesTarget}
                      onChange={(e) => setForm({ ...form, caloriesTarget: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Deficit / Strategy Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., maintains your fat-loss deficit"
                      value={form.caloriesNotes}
                      onChange={(e) => setForm({ ...form, caloriesNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Protein */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase">
                  <Beef className="w-4 h-4" />
                  <span>Protein Target</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Min (grams)</label>
                    <input
                      type="number"
                      placeholder="e.g., 60"
                      value={form.proteinMinGrams}
                      onChange={(e) => setForm({ ...form, proteinMinGrams: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Max (grams)</label>
                    <input
                      type="number"
                      placeholder="e.g., 70"
                      value={form.proteinMaxGrams}
                      onChange={(e) => setForm({ ...form, proteinMaxGrams: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Food Staples / Meal Sources</label>
                    <input
                      type="text"
                      placeholder="e.g., 4 eggs + chicken breast + family staples"
                      value={form.proteinNotes}
                      onChange={(e) => setForm({ ...form, proteinNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Water */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase">
                  <Droplets className="w-4 h-4" />
                  <span>Daily Water Intake</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Min (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 3.0"
                      value={form.waterMinLiters}
                      onChange={(e) => setForm({ ...form, waterMinLiters: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Max (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 3.5"
                      value={form.waterMaxLiters}
                      onChange={(e) => setForm({ ...form, waterMaxLiters: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Hydration Reminder Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., drink 1L with workout, 2.5L rest of day"
                      value={form.waterNotes}
                      onChange={(e) => setForm({ ...form, waterNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Daily Walk */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
                  <Footprints className="w-4 h-4" />
                  <span>Daily Walk (NEAT)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Min (Minutes)</label>
                    <input
                      type="number"
                      placeholder="e.g., 20"
                      value={form.dailyWalkMinMinutes}
                      onChange={(e) => setForm({ ...form, dailyWalkMinMinutes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Max (Minutes)</label>
                    <input
                      type="number"
                      placeholder="e.g., 30"
                      value={form.dailyWalkMaxMinutes}
                      onChange={(e) => setForm({ ...form, dailyWalkMaxMinutes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Metabolic Rate Notes</label>
                    <input
                      type="text"
                      placeholder="e.g., keeps metabolic rate active outside the gym"
                      value={form.dailyWalkNotes}
                      onChange={(e) => setForm({ ...form, dailyWalkNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Training Adherence */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-bold uppercase">
                  <Dumbbell className="w-4 h-4" />
                  <span>Training Frequency & Technical Failure Rule</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Days / Week</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      placeholder="e.g., 5"
                      value={form.trainingDaysPerWeek}
                      onChange={(e) => setForm({ ...form, trainingDaysPerWeek: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                      Execution Standard & Pain-Free Rules
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Complete prescribed session, stopping all sets at technical failure (zero swinging, zero knee/back pain)"
                      value={form.trainingNotes}
                      onChange={(e) => setForm({ ...form, trainingNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                {hasAnyTargetSet ? (
                  <button
                    type="button"
                    onClick={handleClearAllGoals}
                    disabled={isPending}
                    className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All Targets</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="text-xs font-mono px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs font-mono font-bold px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save My Goals"}
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

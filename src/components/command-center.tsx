"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Flame,
  Activity,
  Dumbbell,
  Calendar,
  RefreshCw,
  Target,
  BarChart3,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  getNutritionOverviewAction,
  generateNewMesocycleAction,
} from "@/app/actions";
import type { MacroBreakdown, NutritionGoal } from "@/lib/nutrition";
import type { PlannerGoal, SplitType } from "@/lib/planner";

export function CommandCenter() {
  const [goal, setGoal] = useState<NutritionGoal>("maintain");
  const [nutrition, setNutrition] = useState<MacroBreakdown | null>(null);
  const [userName, setUserName] = useState("Athlete");
  const [weightKg, setWeightKg] = useState(80);
  const [preferredUnit, setPreferredUnit] = useState<"kg" | "lb">("kg");

  // Mesocycle Form State
  const [mesoGoal, setMesoGoal] = useState<PlannerGoal>("hypertrophy");
  const [mesoSplit, setMesoSplit] = useState<SplitType>("push_pull_legs");
  const [mesoDays, setMesoDays] = useState(4);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  // Load nutrition data on mount and on goal switch
  useEffect(() => {
    getNutritionOverviewAction(goal).then((res) => {
      if (res.success && res.nutrition) {
        setNutrition(res.nutrition);
        setUserName(res.userName);
        setWeightKg(res.weightKg);
        setPreferredUnit(res.preferredUnit);
      }
    });
  }, [goal]);

  // Generate new mesocycle handler
  const handleGenerateMesocycle = () => {
    startTransition(async () => {
      const res = await generateNewMesocycleAction({
        primaryGoal: mesoGoal,
        split: mesoSplit,
        daysPerWeek: mesoDays,
      });

      if (res.success) {
        setGenerateMessage(
          `Successfully seeded 4-week ${mesoGoal} mesocycle (${res.workoutSessionsCount} sessions)!`
        );
        setTimeout(() => {
          setShowGenerateModal(false);
          setGenerateMessage("");
        }, 2000);
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 pb-20 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">
            Command Center • Metabolic & Block Engine
          </span>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
          {userName}
        </span>
      </header>

      {/* METABOLIC & MACRO PANEL */}
      <section className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-sm font-black font-mono uppercase tracking-wider text-zinc-200">
              Metabolic Partitioning
            </h2>
          </div>
          {/* Goal Selector */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            {(["cut", "maintain", "bulk"] as NutritionGoal[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded transition ${
                  goal === g
                    ? "bg-orange-500 text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {nutrition ? (
          <>
            {/* Caloric Big Number */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase block">BMR</span>
                <span className="text-sm font-bold text-zinc-300">
                  {nutrition.bmr} <span className="text-[9px]">kcal</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase block">TDEE</span>
                <span className="text-sm font-bold text-zinc-300">
                  {nutrition.tdee} <span className="text-[9px]">kcal</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-700/50">
                <span className="text-[10px] text-orange-400 uppercase block font-bold">
                  Target
                </span>
                <span className="text-sm font-black text-orange-200">
                  {nutrition.targetCalories} <span className="text-[9px]">kcal</span>
                </span>
              </div>
            </div>

            {/* Macros Progress Breakdown */}
            <div className="mt-4 space-y-2.5 font-mono text-xs">
              {/* Protein */}
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    Protein (2.2g/kg)
                  </span>
                  <span>
                    <strong>{nutrition.proteinGrams}g</strong> ({nutrition.proteinCalories} kcal)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${nutrition.proteinPct}%` }}
                  />
                </div>
              </div>

              {/* Fats */}
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Fats (0.8g/kg)
                  </span>
                  <span>
                    <strong>{nutrition.fatGrams}g</strong> ({nutrition.fatCalories} kcal)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${nutrition.fatPct}%` }}
                  />
                </div>
              </div>

              {/* Carbs */}
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                    Carbohydrates
                  </span>
                  <span>
                    <strong>{nutrition.carbGrams}g</strong> ({nutrition.carbCalories} kcal)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${nutrition.carbPct}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 p-4 text-center text-xs font-mono text-zinc-500">
            Calculating metabolic partitioning...
          </div>
        )}
      </section>

      {/* MESOCYCLE STATUS & GENERATOR */}
      <section className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-black font-mono uppercase tracking-wider text-zinc-200">
              Active Mesocycle Block
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
            WEEK 1 / 4
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">SPLIT TYPE</span>
            <span className="font-bold text-zinc-200 capitalize">Push / Pull / Legs</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">FREQUENCY</span>
            <span className="font-bold text-zinc-200">4 Days / Week</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="mt-3 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Generate / Reset Mesocycle
        </button>
      </section>

      {/* MUSCLE GROUP WEEKLY VOLUME TARGETS */}
      <section className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-black font-mono uppercase tracking-wider text-zinc-200">
            Weekly Muscle Volume Targets
          </h2>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {[
            { group: "Chest / Push", planned: 12, completed: 5, color: "bg-emerald-400" },
            { group: "Back / Pull", planned: 14, completed: 8, color: "bg-blue-400" },
            { group: "Quads / Legs", planned: 12, completed: 6, color: "bg-purple-400" },
            { group: "Hamstrings / Hinge", planned: 8, completed: 4, color: "bg-amber-400" },
            { group: "Shoulders (OHP)", planned: 8, completed: 3, color: "bg-teal-400" },
          ].map((item) => (
            <div key={item.group} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850">
              <div className="flex justify-between text-zinc-300 mb-1.5">
                <span className="font-bold">{item.group}</span>
                <span className="text-zinc-400 text-[11px]">
                  {item.completed} / {item.planned} sets
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${Math.min(100, (item.completed / item.planned) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GENERATE MESOCYCLE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl font-mono">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Proactive Routine Generator
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Constructs a 4-week progressive overload block seeded into SQLite.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">PRIMARY GOAL</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["hypertrophy", "strength", "recomposition"] as PlannerGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setMesoGoal(g)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-lg uppercase border transition ${
                        mesoGoal === g
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">SPLIT TYPE</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: "push_pull_legs", label: "PPL" },
                    { key: "upper_lower", label: "Upper/Lower" },
                    { key: "full_body", label: "Full Body" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setMesoSplit(s.key as SplitType)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-lg uppercase border transition ${
                        mesoSplit === s.key
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">DAYS PER WEEK: {mesoDays}</label>
                <input
                  type="range"
                  min={3}
                  max={6}
                  value={mesoDays}
                  onChange={(e) => setMesoDays(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 bg-zinc-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                  <span>3 Days</span>
                  <span>4 Days</span>
                  <span>5 Days</span>
                  <span>6 Days</span>
                </div>
              </div>
            </div>

            {generateMessage && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{generateMessage}</span>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleGenerateMesocycle}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5"
              >
                {isPending ? "Seeding..." : "Generate Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

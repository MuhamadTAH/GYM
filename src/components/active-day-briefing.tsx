"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Dumbbell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  Droplets,
  Footprints,
  Share2,
  CheckCircle2,
  Play,
} from "lucide-react";
import { getDailyBriefingAction, dispatchDailyBriefingAction } from "@/app/actions";
import type { DailyBriefingPayload } from "@/lib/briefing";

interface ActiveDayBriefingProps {
  onNavigateToHud?: () => void;
  onNavigateToGoals?: () => void;
}

export function ActiveDayBriefing({
  onNavigateToHud,
  onNavigateToGoals,
}: ActiveDayBriefingProps) {
  const [briefing, setBriefing] = useState<DailyBriefingPayload | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDailyBriefingAction()
      .then((data) => {
        setBriefing(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[ActiveDayBriefing] Failed to fetch briefing:", err);
        setIsLoading(false);
      });
  }, []);

  const handleDispatch = async () => {
    setDispatchStatus("Dispatching...");
    try {
      const res = await dispatchDailyBriefingAction();
      setDispatchStatus(res.message);
      setTimeout(() => setDispatchStatus(null), 4000);
    } catch {
      setDispatchStatus("Failed to dispatch briefing.");
      setTimeout(() => setDispatchStatus(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mb-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 animate-pulse font-mono text-xs text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Loading Daily Morning Briefing...</span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <section className="w-full mb-5 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-xl overflow-hidden font-mono transition-all">
      {/* Pinned Top Bar / Banner Header */}
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wide text-white">
                {briefing.dateFormatted}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  briefing.isTrainingDay
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                    : "bg-indigo-950/80 border-indigo-500/50 text-indigo-400"
                }`}
              >
                {briefing.statusBadge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-xl">
              {briefing.headline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dispatch/Share Button */}
          <button
            type="button"
            onClick={handleDispatch}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] transition cursor-pointer"
            title="Dispatch briefing via webhook/Telegram"
          >
            <Share2 className="w-3 h-3 text-emerald-400" />
            <span>Notify</span>
          </button>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            aria-label={isExpanded ? "Collapse Briefing" : "Expand Briefing"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Toast / Dispatch Notification */}
      {dispatchStatus && (
        <div className="px-4 py-1.5 bg-emerald-950/90 border-b border-emerald-800 text-[11px] text-emerald-300 text-center font-bold">
          {dispatchStatus}
        </div>
      )}

      {/* Expanded Briefing Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Subheadline & Motivational Directive */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Morning Execution Directive
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed font-semibold">
                &ldquo;{briefing.coachMotivationalNote}&rdquo;
              </p>
            </div>

            {briefing.isTrainingDay && onNavigateToHud && (
              <button
                type="button"
                onClick={onNavigateToHud}
                className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Jump to Workout</span>
              </button>
            )}
          </div>

          {/* Main 2-Column Section: Workout Plan vs Daily Targets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Prescribed Movement Routine or Rest Focus (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  {briefing.isTrainingDay ? (
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>
                    {briefing.isTrainingDay
                      ? `Prescribed Movements (${briefing.workoutPlan?.exercises.length ?? 5})`
                      : "Rest & Active Recovery Plan"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {briefing.isTrainingDay ? "Target: 10-12 reps @ Failure" : "Active restoration"}
                </span>
              </div>

              {briefing.isTrainingDay && briefing.workoutPlan ? (
                <div className="space-y-2">
                  {briefing.workoutPlan.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-850 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-200 capitalize">
                              {ex.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                              {ex.targetMuscle}
                            </span>
                          </div>
                          {ex.keyCues.length > 0 && (
                            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                              Cue: {ex.keyCues[0]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-400 block">
                          {ex.targetLoadText}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {ex.sets} sets × {ex.reps}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : briefing.recoveryPlan ? (
                <div className="space-y-2 p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30">
                  <p className="text-xs text-indigo-300 font-bold mb-2">
                    Focus: {briefing.recoveryPlan.focus}
                  </p>
                  <ul className="space-y-1.5 text-xs text-zinc-400">
                    {briefing.recoveryPlan.recommendedActivities.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Right: Daily Nutrition & Habit Targets (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Today&apos;s Targets</span>
                </div>
                {onNavigateToGoals && (
                  <button
                    type="button"
                    onClick={onNavigateToGoals}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    View Goals Dashboard
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Calories */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-850">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase mb-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>Calories</span>
                  </div>
                  <div className="text-base font-black text-white">
                    ~{briefing.dailyTargets.caloriesKcal.toLocaleString()}{" "}
                    <span className="text-[11px] text-zinc-400 font-normal">kcal</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    Fat-loss deficit
                  </p>
                </div>

                {/* Protein */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-850">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase mb-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    <span>Protein</span>
                  </div>
                  <div className="text-base font-black text-white">
                    {briefing.dailyTargets.proteinGrams}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    Muscle preservation
                  </p>
                </div>

                {/* Hydration */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-850">
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase mb-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    <span>Water</span>
                  </div>
                  <div className="text-base font-black text-white">
                    {briefing.dailyTargets.waterLiters}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    Synovial lubrication
                  </p>
                </div>

                {/* Daily Walk */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-850">
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold uppercase mb-1">
                    <Footprints className="w-3 h-3 text-purple-400" />
                    <span>Daily Walk</span>
                  </div>
                  <div className="text-base font-black text-white">
                    {briefing.dailyTargets.walkMinutes}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    Metabolic NEAT
                  </p>
                </div>
              </div>

              {/* Training Standard Directive */}
              <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-bold text-zinc-300">Standard: </span>
                {briefing.dailyTargets.trainingStandard}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

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
  const [isExpanded, setIsExpanded] = useState(false);
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
      setTimeout(() => setDispatchStatus(null), 3000);
    } catch {
      setDispatchStatus("Failed to dispatch briefing.");
      setTimeout(() => setDispatchStatus(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mb-3 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Loading briefing...</span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <section className="w-full mb-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-md overflow-hidden text-xs">
      {/* Compact Top Bar */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 bg-zinc-900/60">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-zinc-200 shrink-0 font-mono">
            {briefing.dateFormatted}
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0 ${
              briefing.isTrainingDay
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                : "bg-indigo-950/60 text-indigo-400 border border-indigo-800/50"
            }`}
          >
            {briefing.statusBadge}
          </span>
          <span className="text-zinc-400 truncate hidden md:inline">
            {briefing.headline}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDispatch}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            title="Dispatch briefing notification"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-mono text-[11px] transition cursor-pointer"
          >
            <span>{isExpanded ? "Hide" : "Details"}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Dispatch notification */}
      {dispatchStatus && (
        <div className="px-3 py-1 bg-emerald-950/80 border-t border-emerald-800/60 text-[11px] text-emerald-300 text-center font-mono">
          {dispatchStatus}
        </div>
      )}

      {/* Expanded Briefing Details */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 border-t border-zinc-850">
          {/* Directive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800">
            <p className="text-zinc-300 italic">
              &ldquo;{briefing.coachMotivationalNote}&rdquo;
            </p>
            {briefing.isTrainingDay && onNavigateToHud && (
              <button
                type="button"
                onClick={onNavigateToHud}
                className="shrink-0 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Go to Workout</span>
              </button>
            )}
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
              <span className="text-zinc-500 block text-[10px]">TARGET CALORIES</span>
              <span className="font-bold text-amber-400">
                {briefing.dailyTargets.caloriesKcal.toLocaleString()} kcal
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
              <span className="text-zinc-500 block text-[10px]">PROTEIN</span>
              <span className="font-bold text-emerald-400">
                {briefing.dailyTargets.proteinGrams}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
              <span className="text-zinc-500 block text-[10px]">WATER</span>
              <span className="font-bold text-sky-400">
                {briefing.dailyTargets.waterLiters}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
              <span className="text-zinc-500 block text-[10px]">DAILY WALK</span>
              <span className="font-bold text-zinc-300">
                {briefing.dailyTargets.walkMinutes}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

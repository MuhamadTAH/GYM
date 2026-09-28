"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Flame,
  Calendar,
  Sparkles,
  CheckCircle2,
  Copy,
  Beef,
  Droplets,
  Footprints,
  Dumbbell,
  Loader2,
  Share2,
} from "lucide-react";
import {
  getDailyNutritionReportAction,
  type DailyNutritionReport,
} from "@/app/actions";

interface DailyCalorieReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate?: string;
}

export function DailyCalorieReportModal({
  isOpen,
  onClose,
  targetDate,
}: DailyCalorieReportModalProps) {
  const [report, setReport] = useState<DailyNutritionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getDailyNutritionReportAction(targetDate)
        .then((rep) => setReport(rep))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, targetDate]);

  const handleCopySummary = () => {
    if (!report?.summaryReport) return;
    navigator.clipboard.writeText(report.summaryReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Daily Intake & Calorie Report
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/40">
                  {report?.date || targetDate || "Today"}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Itemized intake summary, calories used vs left, and multi-tier budgets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-mono">Generating daily calorie report...</span>
            </div>
          ) : report ? (
            <>
              {/* Top Calorie Status Card: Used vs Left */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-zinc-900/60 to-zinc-900/40 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">Today's Calorie Balance</span>
                  <span className="text-amber-400 font-semibold">Goal: {report.caloriesTarget} kcal</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] font-mono text-zinc-400 block mb-0.5">Calories Used</span>
                    <span className="text-2xl font-extrabold text-white">
                      {report.caloriesConsumed} <span className="text-xs font-normal text-zinc-500">kcal</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-850">
                    <span className="text-[11px] font-mono text-zinc-400 block mb-0.5">Calories Left</span>
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {report.caloriesRemaining} <span className="text-xs font-normal text-zinc-500">kcal</span>
                    </span>
                  </div>
                </div>

                {/* Multi-Tier Budgets: Weekly & Monthly Projections */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-400">Weekly Target (7d):</span>
                    <span className="text-white font-bold">{report.weeklyCaloriesTarget} kcal</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-400">Monthly Target (30d):</span>
                    <span className="text-white font-bold">{report.monthlyCaloriesTarget} kcal</span>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <Beef className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Protein</span>
                    <span className="font-bold text-white">{report.proteinGrams}g</span>
                    <span className="text-[10px] text-zinc-500"> / {report.proteinTarget}g</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Water</span>
                    <span className="font-bold text-white">{report.waterLiters}L</span>
                    <span className="text-[10px] text-zinc-500"> / {report.waterTarget}L</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Walk Time</span>
                    <span className="font-bold text-white">{report.walkMinutes} min</span>
                  </div>
                </div>
              </div>

              {/* Itemized Foods Logged */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold px-1 flex items-center justify-between">
                  <span>What You Got Today ({report.items.length} items)</span>
                  <span className="text-[11px] text-zinc-500 normal-case font-normal">Itemized Breakdown</span>
                </h3>

                {report.items.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center text-xs font-mono text-zinc-500">
                    No food or meals logged for this date yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {report.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-[11px]">{idx + 1}.</span>
                          <div>
                            <span className="text-white font-medium block">{item.name}</span>
                            <span className="text-[10px] text-zinc-500">
                              {item.category} • {item.protein || 0}g Protein
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-bold">{item.calories}</span>
                          <span className="text-[10px] text-zinc-500 ml-1">kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Share / Copy Report Section */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                <span className="text-[11px] font-mono text-zinc-500">
                  Ready for AI Coach Analysis
                </span>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copied ? "Copied Report!" : "Copy Full Report"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              Could not generate report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { X, Dumbbell, AlertTriangle, CheckCircle, Flame, ShieldAlert } from "lucide-react";
import type { ExerciseGuide } from "@/lib/exercises-data";

interface ExerciseGuideModalProps {
  guide: ExerciseGuide | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExerciseGuideModal({ guide, isOpen, onClose }: ExerciseGuideModalProps) {
  if (!isOpen || !guide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {guide.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  {guide.targetMuscle}
                </span>
                <span className="text-[10px] uppercase text-zinc-400">
                  • {guide.equipment}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Looped Movement Animation GIF */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center p-2 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={guide.animationUrl}
              alt={`${guide.name} movement pattern GIF`}
              className="max-h-60 object-contain rounded-xl"
              loading="lazy"
              onError={(e) => {
                // Fallback to thumbnail if GIF fails to load
                (e.target as HTMLImageElement).src = guide.thumbnailUrl;
              }}
            />
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LOOPED MOVEMENT PATTERN</span>
            </div>
          </div>

          {/* Secondary Muscles */}
          {guide.secondaryMuscles && guide.secondaryMuscles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">
                Secondary:
              </span>
              {guide.secondaryMuscles.map((muscle, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}

          {/* Setup & Execution Coaching Cues */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Setup & Execution Cues</span>
            </div>
            <div className="space-y-1.5">
              {guide.coachingCues.map((cue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-500/20">
                    {idx + 1}
                  </span>
                  <span>{cue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Common Form Breakdown Warnings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Common Form Breakdown Warnings</span>
            </div>
            <div className="space-y-1.5">
              {guide.formWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px] border border-amber-500/30">
                    !
                  </span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Instructions Accordion/List */}
          <div className="space-y-2 pt-1 border-t border-zinc-850">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Step-by-Step Instructions
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-400 leading-relaxed">
              {guide.instructions.map((step, idx) => (
                <li key={idx} className="pl-1">
                  <span className="text-zinc-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Got It • Back to Gym Floor
          </button>
        </div>
      </div>
    </div>
  );
}

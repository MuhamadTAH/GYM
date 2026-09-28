"use client";

import React, { useState } from "react";
import {
  X,
  Lightbulb,
  BookOpen,
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import {
  updateExerciseBenefitsAndGuideAction,
  type TodaysWorkoutView,
} from "@/app/actions";

interface ExerciseGuideEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseIndex: number;
  exerciseName: string;
  targetDate?: string;
  initialBenefits?: string;
  initialInstructions?: string[];
  onSaved?: (workout: TodaysWorkoutView) => void;
}

export function ExerciseGuideEditModal({
  isOpen,
  onClose,
  exerciseIndex,
  exerciseName,
  targetDate,
  initialBenefits,
  initialInstructions,
  onSaved,
}: ExerciseGuideEditModalProps) {
  const [benefits, setBenefits] = useState(initialBenefits || "");
  const [instructions, setInstructions] = useState(
    Array.isArray(initialInstructions)
      ? initialInstructions.join("\n")
      : initialInstructions || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await updateExerciseBenefitsAndGuideAction({
        exerciseIndex,
        date: targetDate,
        benefits,
        instructions,
      });

      if (res.success) {
        setSavedSuccess(true);
        onSaved?.(res.todaysWorkout);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Why & How To Do This Exercise
              </h2>
              <p className="text-xs text-zinc-400">
                {exerciseName} • Benefits & Step-by-Step Instructions
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
        <form onSubmit={handleSave} className="p-5 flex-1 overflow-y-auto space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exercise benefits & how-to guide saved!</span>
            </div>
          )}

          {/* Benefits Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Benefits (Why do this workout?)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Isolates the clavicular head of pectoralis major, improves shoulder stability, and creates progressive overload hypertrophy."
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-white font-sans text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* How To Do It Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>How To Do It (Step-by-Step Execution)</span>
            </label>
            <textarea
              rows={5}
              placeholder="1. Set bench to 30 degrees.&#10;2. Retract scapulae and plant feet firmly.&#10;3. Lower dumbbells with a 2-second eccentric.&#10;4. Drive upward without clinking the weights."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <span className="text-[10px] text-zinc-500 font-mono block">
              Tip: Put each step on a new line or number them 1., 2., 3.
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-mono text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Guide</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

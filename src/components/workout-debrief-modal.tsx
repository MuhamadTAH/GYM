"use client";

import React, { useState } from "react";
import {
  X,
  Star,
  Activity,
  Flame,
  BatteryCharging,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Send,
  MessageSquare,
} from "lucide-react";
import {
  submitWorkoutDebriefAction,
  type TodaysWorkoutView,
} from "@/app/actions";

interface WorkoutDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName?: string;
  targetDate?: string;
  existingRating?: number | null;
  existingRpe?: number | null;
  existingEnergy?: "high" | "moderate" | "low" | "drained" | null;
  existingSoreness?: "none" | "mild" | "moderate" | "severe" | null;
  existingDebrief?: string | null;
  existingCoachFeedback?: string | null;
  onSubmitted?: (workout: TodaysWorkoutView) => void;
}

export function WorkoutDebriefModal({
  isOpen,
  onClose,
  sessionName,
  targetDate,
  existingRating,
  existingRpe,
  existingEnergy,
  existingSoreness,
  existingDebrief,
  existingCoachFeedback,
  onSubmitted,
}: WorkoutDebriefModalProps) {
  const [rating, setRating] = useState<number>(existingRating || 5);
  const [rpe, setRpe] = useState<number>(existingRpe || 8);
  const [energy, setEnergy] = useState<"high" | "moderate" | "low" | "drained">(
    existingEnergy || "moderate"
  );
  const [soreness, setSoreness] = useState<"none" | "mild" | "moderate" | "severe">(
    existingSoreness || "none"
  );
  const [notes, setNotes] = useState<string>(existingDebrief || "");
  const [coachFeedback, setCoachFeedback] = useState<string>(
    existingCoachFeedback || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await submitWorkoutDebriefAction({
        date: targetDate,
        athleteRating: rating,
        sessionRpe: rpe,
        energyLevel: energy,
        muscleSoreness: soreness,
        athleteDebrief: notes,
      });

      if (res.success) {
        setCoachFeedback(res.coachFeedback);
        setSubmittedSuccess(true);
        onSubmitted?.(res.todaysWorkout);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Post-Workout Report
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/40">
                  Debrief
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {sessionName || "Workout Session"} • How was your workout?
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

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* AI Coach Feedback Banner if received */}
          {coachFeedback && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold">
                <Sparkles className="w-4 h-4" />
                <span>AI Coach Analysis & Autoregulation</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                {coachFeedback}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Star Rating */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Session Rating (1 to 5 Stars)
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                {rating === 5 && "⭐ Phenomenal session!"}
                {rating === 4 && "Great workout, progressive overload met"}
                {rating === 3 && "Solid baseline execution"}
                {rating === 2 && "Tough grind, high fatigue"}
                {rating === 1 && "Struggled with fatigue/pain"}
              </span>
            </div>

            {/* 2. Session RPE (Effort) */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 font-bold uppercase tracking-wider">Perceived Effort (RPE)</span>
                <span className="text-indigo-400 font-bold text-sm">RPE {rpe} / 10</span>
              </div>
              <input
                type="range"
                min="5"
                max="10"
                step="0.5"
                value={rpe}
                onChange={(e) => setRpe(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>RPE 5 (Easy warm-up)</span>
                <span>RPE 8 (2 reps in reserve)</span>
                <span>RPE 10 (Max failure)</span>
              </div>
            </div>

            {/* 3. Energy Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Readiness & Energy Level
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                {(["high", "moderate", "low", "drained"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergy(lvl)}
                    className={`py-2 rounded-xl border text-center capitalize transition cursor-pointer font-semibold ${
                      energy === lvl
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Muscle Soreness */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Joint Ache / Muscle Soreness
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                {(["none", "mild", "moderate", "severe"] as const).map((sor) => (
                  <button
                    key={sor}
                    type="button"
                    onClick={() => setSoreness(sor)}
                    className={`py-2 rounded-xl border text-center capitalize transition cursor-pointer font-semibold ${
                      soreness === sor
                        ? sor === "severe"
                          ? "bg-rose-600 border-rose-500 text-white shadow-sm"
                          : "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {sor}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Athlete Debrief Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Athlete Reflection Notes
              </label>
              <textarea
                rows={3}
                placeholder="How did the workout feel? Any personal records, pumps, or joints to spare next session?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-white font-sans text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-mono text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{submittedSuccess ? "Update Debrief" : "Submit Report"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

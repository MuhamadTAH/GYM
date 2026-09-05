"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  User,
  Dumbbell,
  Calculator,
  ShieldAlert,
  Check,
  X,
  Scale,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getUserProfileAction,
  saveUserProfileAction,
  type UserProfileView,
} from "@/app/actions";
import { calculateBrzycki1RM } from "@/lib/math";
import type { BaselineLifts, ActiveInjury } from "@/schemas/fitness";
import type { PlannerGoal, SplitType } from "@/lib/planner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ProfileModal({ isOpen, onClose, onSaved }: ProfileModalProps) {
  const [name, setName] = useState("Athlete");
  const [age, setAge] = useState(26);
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [heightCm, setHeightCm] = useState(178);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState(82);

  // Baseline 1RMs
  const [squat1rm, setSquat1rm] = useState(140);
  const [bench1rm, setBench1rm] = useState(100);
  const [deadlift1rm, setDeadlift1rm] = useState(180);
  const [ohp1rm, setOhp1rm] = useState(65);
  const [row1rm, setRow1rm] = useState(85);
  const [pullup1rm, setPullup1rm] = useState(30);

  // Rep-to-1RM Calculator State
  const [showRepCalc, setShowRepCalc] = useState(false);
  const [calcLift, setCalcLift] = useState<keyof BaselineLifts>("bench_press_1rm");
  const [calcWeight, setCalcWeight] = useState(80);
  const [calcReps, setCalcReps] = useState(8);

  // Active Injuries
  const [hasKneeInjury, setHasKneeInjury] = useState(false);
  const [hasShoulderInjury, setHasShoulderInjury] = useState(false);
  const [hasBackInjury, setHasBackInjury] = useState(false);

  // Options
  const [regenerateBlock, setRegenerateBlock] = useState(true);
  const [primaryGoal, setPrimaryGoal] = useState<PlannerGoal>("hypertrophy");
  const [split, setSplit] = useState<SplitType>("push_pull_legs");
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load existing profile on open
  useEffect(() => {
    if (isOpen) {
      getUserProfileAction().then((p) => {
        if (p) {
          setName(p.name);
          setAge(p.age);
          setSex(p.sex);
          setHeightCm(p.heightCm);
          setUnit(p.preferredUnit);
          setWeight(p.currentWeightValue);
          setSquat1rm(p.baselineLifts.squat_1rm);
          setBench1rm(p.baselineLifts.bench_press_1rm);
          setDeadlift1rm(p.baselineLifts.deadlift_1rm);
          setOhp1rm(p.baselineLifts.overhead_press_1rm);
          setRow1rm(p.baselineLifts.barbell_row_1rm);
          setPullup1rm(p.baselineLifts.pull_up_1rm);

          const sites = (p.activeInjuries || []).map((i) => i.anatomical_site.toLowerCase());
          setHasKneeInjury(sites.includes("knee"));
          setHasShoulderInjury(sites.includes("shoulder"));
          setHasBackInjury(sites.includes("lower_back") || sites.includes("back"));
        }
      });
    }
  }, [isOpen]);

  // Handle Rep-to-1RM auto-calculation
  const calculatedEstimate = calculateBrzycki1RM(calcWeight, calcReps);

  const applyCalculated1RM = () => {
    if (calculatedEstimate && calculatedEstimate > 0) {
      switch (calcLift) {
        case "squat_1rm":
          setSquat1rm(calculatedEstimate);
          break;
        case "bench_press_1rm":
          setBench1rm(calculatedEstimate);
          break;
        case "deadlift_1rm":
          setDeadlift1rm(calculatedEstimate);
          break;
        case "overhead_press_1rm":
          setOhp1rm(calculatedEstimate);
          break;
        case "barbell_row_1rm":
          setRow1rm(calculatedEstimate);
          break;
        case "pull_up_1rm":
          setPullup1rm(calculatedEstimate);
          break;
      }
      setMessage(`Applied ${calculatedEstimate}${unit} 1RM to ${calcLift.replace(/_/g, " ")}`);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const handleSave = () => {
    const activeInjuries: ActiveInjury[] = [];
    if (hasKneeInjury) {
      activeInjuries.push({
        anatomical_site: "knee",
        severity: "joint_pain_acute",
        blacklisted_movement_patterns: ["squat"],
        safe_substitutes: ["leg_press"],
      });
    }
    if (hasShoulderInjury) {
      activeInjuries.push({
        anatomical_site: "shoulder",
        severity: "tendon_strain",
        blacklisted_movement_patterns: ["overhead_press"],
        safe_substitutes: ["incline_dumbbell_press"],
      });
    }
    if (hasBackInjury) {
      activeInjuries.push({
        anatomical_site: "lower_back",
        severity: "joint_pain_acute",
        blacklisted_movement_patterns: ["hip_hinge", "squat"],
        safe_substitutes: ["chest_supported_row"],
      });
    }

    startTransition(async () => {
      const res = await saveUserProfileAction({
        name,
        age,
        sex,
        heightCm,
        preferredUnit: unit,
        currentWeightValue: weight,
        baselineLifts: {
          squat_1rm: squat1rm,
          bench_press_1rm: bench1rm,
          deadlift_1rm: deadlift1rm,
          overhead_press_1rm: ohp1rm,
          barbell_row_1rm: row1rm,
          pull_up_1rm: pullup1rm,
        },
        activeInjuries,
        regenerateMesocycle: regenerateBlock,
        primaryGoal,
        split,
        daysPerWeek,
      });

      if (res.success) {
        setMessage(
          regenerateBlock
            ? "Saved profile & generated new 4-week block with updated 1RMs!"
            : "Saved profile successfully!"
        );
        setTimeout(() => {
          setMessage("");
          if (onSaved) onSaved();
          onClose();
        }, 1500);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-mono">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 my-8 text-zinc-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-850 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Athlete Profile & Baseline 1RMs
              </h2>
              <p className="text-[11px] text-zinc-400">
                Powers deterministic progressive overload and working loads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1 text-xs">
          {/* SECTION 1: BIOMETRICS */}
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              1. Athlete Biometrics
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Sex</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["male", "female", "other"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={`py-1.5 text-[10px] uppercase font-bold rounded-lg border transition ${
                        sex === s
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Age (yr)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Bodyweight</label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-l-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setUnit(unit === "kg" ? "lb" : "kg")}
                    className="px-2 py-1.5 rounded-r-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase border-y border-r border-zinc-700 text-[10px]"
                  >
                    {unit}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: BASELINE 1RMS */}
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                2. Baseline 1RMs ({unit.toUpperCase()})
              </span>
              <button
                type="button"
                onClick={() => setShowRepCalc((prev) => !prev)}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-bold underline cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                {showRepCalc ? "Hide Reps Calc" : "Calculate from Reps"}
              </button>
            </div>

            {/* Rep-to-1RM Calculator Tool */}
            {showRepCalc && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/50 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-200">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Brzycki Rep-to-1RM Converter
                  </span>
                  {calculatedEstimate && (
                    <span className="text-emerald-400">
                      ≈ {calculatedEstimate} {unit} 1RM
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Target Lift</label>
                    <select
                      value={calcLift}
                      onChange={(e) => setCalcLift(e.target.value as keyof BaselineLifts)}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-indigo-800 text-white font-bold text-[11px]"
                    >
                      <option value="bench_press_1rm">Bench Press</option>
                      <option value="squat_1rm">Squat</option>
                      <option value="deadlift_1rm">Deadlift</option>
                      <option value="overhead_press_1rm">Overhead Press</option>
                      <option value="barbell_row_1rm">Barbell Row</option>
                      <option value="pull_up_1rm">Weighted Pull-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Load ({unit})</label>
                    <input
                      type="number"
                      step="2.5"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-indigo-800 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Reps Hit</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={calcReps}
                      onChange={(e) => setCalcReps(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-indigo-800 text-white font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyCalculated1RM}
                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] uppercase tracking-wider transition"
                >
                  Apply {calculatedEstimate}{unit} to {calcLift.replace(/_/g, " ")}
                </button>
              </div>
            )}

            {/* 1RM Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Squat 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={squat1rm}
                  onChange={(e) => setSquat1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Bench Press 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={bench1rm}
                  onChange={(e) => setBench1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Deadlift 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={deadlift1rm}
                  onChange={(e) => setDeadlift1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Overhead Press 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={ohp1rm}
                  onChange={(e) => setOhp1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Barbell Row 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={row1rm}
                  onChange={(e) => setRow1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Weighted Pull-up 1RM</label>
                <input
                  type="number"
                  step="2.5"
                  value={pullup1rm}
                  onChange={(e) => setPullup1rm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: INJURY SAFEGUARDS */}
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              3. Injury & Joint Safeguards (Layer 0 Autoregulation)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setHasKneeInjury((p) => !p)}
                className={`p-2 rounded-lg border text-center transition ${
                  hasKneeInjury
                    ? "bg-red-950/60 border-red-600 text-red-300 font-bold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                Knee Pain
              </button>
              <button
                type="button"
                onClick={() => setHasShoulderInjury((p) => !p)}
                className={`p-2 rounded-lg border text-center transition ${
                  hasShoulderInjury
                    ? "bg-red-950/60 border-red-600 text-red-300 font-bold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                Shoulder Pain
              </button>
              <button
                type="button"
                onClick={() => setHasBackInjury((p) => !p)}
                className={`p-2 rounded-lg border text-center transition ${
                  hasBackInjury
                    ? "bg-red-950/60 border-red-600 text-red-300 font-bold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                Lower Back
              </button>
            </div>
          </div>

          {/* SECTION 4: MESOCYCLE RE-GENERATION OPTION */}
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={regenerateBlock}
                onChange={(e) => setRegenerateBlock(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-800 focus:ring-0 cursor-pointer"
              />
              <span className="font-bold text-white text-xs">
                Immediately re-seed 4-week mesocycle with these 1RM working loads
              </span>
            </label>

            {regenerateBlock && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Goal</label>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value as PlannerGoal)}
                    className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-white text-[10px] font-bold"
                  >
                    <option value="hypertrophy">Hypertrophy</option>
                    <option value="strength">Strength</option>
                    <option value="recomposition">Recomposition</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Split</label>
                  <select
                    value={split}
                    onChange={(e) => setSplit(e.target.value as SplitType)}
                    className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-white text-[10px] font-bold"
                  >
                    <option value="push_pull_legs">Push/Pull/Legs</option>
                    <option value="upper_lower">Upper/Lower</option>
                    <option value="full_body">Full Body</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Days / Week</label>
                  <select
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-white text-[10px] font-bold"
                  >
                    <option value={3}>3 Days</option>
                    <option value={4}>4 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={6}>6 Days</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold text-center">
            {message}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 mt-2 border-t border-zinc-850 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs uppercase transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-2/3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition"
          >
            <Check className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Profile & 1RMs"}
          </button>
        </div>
      </div>
    </div>
  );
}

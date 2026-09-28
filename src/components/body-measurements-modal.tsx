"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Scale,
  Ruler,
  TrendingDown,
  TrendingUp,
  History,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import {
  getBodyMeasurementsAction,
  saveBodyMeasurementsAction,
  type BodyMeasurementsView,
  type BodyMeasurementEntry,
} from "@/app/actions";

interface BodyMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function BodyMeasurementsModal({
  isOpen,
  onClose,
  onUpdated,
}: BodyMeasurementsModalProps) {
  const [data, setData] = useState<BodyMeasurementsView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "log" | "history">("overview");

  // Form Fields
  const [weight, setWeight] = useState<string>("");
  const [weightGoal, setWeightGoal] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [sizeUnit, setSizeUnit] = useState<"cm" | "in">("cm");

  const [armSize, setArmSize] = useState<string>("");
  const [armSizeGoal, setArmSizeGoal] = useState<string>("");

  const [legSize, setLegSize] = useState<string>("");
  const [legSizeGoal, setLegSizeGoal] = useState<string>("");

  const [waistSize, setWaistSize] = useState<string>("");
  const [waistSizeGoal, setWaistSizeGoal] = useState<string>("");

  const [chestSize, setChestSize] = useState<string>("");
  const [chestSizeGoal, setChestSizeGoal] = useState<string>("");

  const [hipSize, setHipSize] = useState<string>("");
  const [hipSizeGoal, setHipSizeGoal] = useState<string>("");

  const [calfSize, setCalfSize] = useState<string>("");
  const [calfSizeGoal, setCalfSizeGoal] = useState<string>("");

  const [shoulderSize, setShoulderSize] = useState<string>("");
  const [shoulderSizeGoal, setShoulderSizeGoal] = useState<string>("");

  const [neckSize, setNeckSize] = useState<string>("");
  const [neckSizeGoal, setNeckSizeGoal] = useState<string>("");

  const [notes, setNotes] = useState<string>("");
  const [measureDate, setMeasureDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const loadMeasurements = async () => {
    setIsLoading(true);
    try {
      const res = await getBodyMeasurementsAction();
      setData(res);
      if (res.latest) {
        setWeight(res.latest.weight ? String(res.latest.weight) : "");
        setWeightGoal(res.latest.weightGoal ? String(res.latest.weightGoal) : "");
        setWeightUnit(res.latest.weightUnit || "kg");
        setSizeUnit(res.latest.sizeUnit || "cm");

        setArmSize(res.latest.armSize ? String(res.latest.armSize) : "");
        setArmSizeGoal(res.latest.armSizeGoal ? String(res.latest.armSizeGoal) : "");

        setLegSize(res.latest.legSize ? String(res.latest.legSize) : "");
        setLegSizeGoal(res.latest.legSizeGoal ? String(res.latest.legSizeGoal) : "");

        setWaistSize(res.latest.waistSize ? String(res.latest.waistSize) : "");
        setWaistSizeGoal(res.latest.waistSizeGoal ? String(res.latest.waistSizeGoal) : "");

        setChestSize(res.latest.chestSize ? String(res.latest.chestSize) : "");
        setChestSizeGoal(res.latest.chestSizeGoal ? String(res.latest.chestSizeGoal) : "");

        setHipSize(res.latest.hipSize ? String(res.latest.hipSize) : "");
        setHipSizeGoal(res.latest.hipSizeGoal ? String(res.latest.hipSizeGoal) : "");

        setCalfSize(res.latest.calfSize ? String(res.latest.calfSize) : "");
        setCalfSizeGoal(res.latest.calfSizeGoal ? String(res.latest.calfSizeGoal) : "");

        setShoulderSize(res.latest.shoulderSize ? String(res.latest.shoulderSize) : "");
        setShoulderSizeGoal(res.latest.shoulderSizeGoal ? String(res.latest.shoulderSizeGoal) : "");

        setNeckSize(res.latest.neckSize ? String(res.latest.neckSize) : "");
        setNeckSizeGoal(res.latest.neckSizeGoal ? String(res.latest.neckSizeGoal) : "");
      }
    } catch {
      setStatusMsg({ text: "Failed to load measurements.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMeasurements();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await saveBodyMeasurementsAction({
        weight: weight ? parseFloat(weight) : undefined,
        weightGoal: weightGoal ? parseFloat(weightGoal) : undefined,
        weightUnit,
        sizeUnit,
        armSize: armSize ? parseFloat(armSize) : undefined,
        armSizeGoal: armSizeGoal ? parseFloat(armSizeGoal) : undefined,
        legSize: legSize ? parseFloat(legSize) : undefined,
        legSizeGoal: legSizeGoal ? parseFloat(legSizeGoal) : undefined,
        waistSize: waistSize ? parseFloat(waistSize) : undefined,
        waistSizeGoal: waistSizeGoal ? parseFloat(waistSizeGoal) : undefined,
        chestSize: chestSize ? parseFloat(chestSize) : undefined,
        chestSizeGoal: chestSizeGoal ? parseFloat(chestSizeGoal) : undefined,
        hipSize: hipSize ? parseFloat(hipSize) : undefined,
        hipSizeGoal: hipSizeGoal ? parseFloat(hipSizeGoal) : undefined,
        calfSize: calfSize ? parseFloat(calfSize) : undefined,
        calfSizeGoal: calfSizeGoal ? parseFloat(calfSizeGoal) : undefined,
        shoulderSize: shoulderSize ? parseFloat(shoulderSize) : undefined,
        shoulderSizeGoal: shoulderSizeGoal ? parseFloat(shoulderSizeGoal) : undefined,
        neckSize: neckSize ? parseFloat(neckSize) : undefined,
        neckSizeGoal: neckSizeGoal ? parseFloat(neckSizeGoal) : undefined,
        notes: notes || undefined,
        date: measureDate,
      });

      if (res.success) {
        setStatusMsg({ text: res.message, type: "success" });
        setData(res.data);
        setActiveSubTab("overview");
        onUpdated?.();
        setTimeout(() => setStatusMsg(null), 3500);
      } else {
        setStatusMsg({ text: "Failed to save measurements.", type: "error" });
      }
    } catch (err: any) {
      setStatusMsg({ text: err?.message || "Error saving measurements", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const latest = data?.latest;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Body & Circumference Hub
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                  AI Synced
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Track body weight & limb sizes (current vs goal). Updated by you or AI.
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

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 border-b border-zinc-850 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "overview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Current vs Goal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("log")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "log"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Update Measurements</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "history"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({data?.history?.length || 0})</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-2xl text-xs font-mono flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border border-red-800 text-red-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs font-mono">Loading body data...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW (CURRENT VS GOAL) */}
              {activeSubTab === "overview" && (
                <div className="space-y-4">
                  {/* Scale Weight Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-900/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-medium">
                        <Scale className="w-4 h-4" />
                        <span>Scale Body Weight</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white">
                          {latest?.weight ? `${latest.weight} ${latest.weightUnit}` : "Not logged"}
                        </span>
                        {latest?.weightGoal && (
                          <span className="text-sm font-mono text-zinc-400">
                            Goal: <span className="text-indigo-300 font-bold">{latest.weightGoal} {latest.weightUnit}</span>
                          </span>
                        )}
                      </div>
                      {latest?.weight && latest?.weightGoal && (
                        <div className="text-xs font-mono text-zinc-400 pt-1">
                          {latest.weight > latest.weightGoal ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              {(latest.weight - latest.weightGoal).toFixed(1)} {latest.weightUnit} to cut
                            </span>
                          ) : latest.weight < latest.weightGoal ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              {(latest.weightGoal - latest.weight).toFixed(1)} {latest.weightUnit} to gain
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">Goal achieved!</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab("log")}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold self-start sm:self-center transition cursor-pointer"
                    >
                      Update Weight & Sizes
                    </button>
                  </div>

                  {/* Body Circumferences Grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold px-1">
                      Body Circumference Measurements (Current vs Goal)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          name: "Arm Size (Biceps)",
                          current: latest?.armSize,
                          goal: latest?.armSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Leg Size (Thighs)",
                          current: latest?.legSize,
                          goal: latest?.legSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Waist Size",
                          current: latest?.waistSize,
                          goal: latest?.waistSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Chest Size",
                          current: latest?.chestSize,
                          goal: latest?.chestSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Hip Size",
                          current: latest?.hipSize,
                          goal: latest?.hipSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Calf Size",
                          current: latest?.calfSize,
                          goal: latest?.calfSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Shoulder Size",
                          current: latest?.shoulderSize,
                          goal: latest?.shoulderSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                        {
                          name: "Neck Size",
                          current: latest?.neckSize,
                          goal: latest?.neckSizeGoal,
                          unit: latest?.sizeUnit || "cm",
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs text-zinc-300 font-medium block">
                              {item.name}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {item.current ? `${item.current} ${item.unit}` : "—"}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-zinc-500 uppercase block">Goal</span>
                            <span className="text-xs font-bold text-indigo-400">
                              {item.goal ? `${item.goal} ${item.unit}` : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {latest?.notes && (
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                      <span className="font-mono text-zinc-500 font-bold block mb-1">Latest Note:</span>
                      {latest.notes}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: UPDATE / LOG FORM */}
              {activeSubTab === "log" && (
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Units & Date */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
                    <div>
                      <label className="text-zinc-400 block mb-1">Date</label>
                      <input
                        type="date"
                        value={measureDate}
                        onChange={(e) => setMeasureDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Weight Unit</label>
                      <select
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200"
                      >
                        <option value="kg">kg (Kilograms)</option>
                        <option value="lb">lb (Pounds)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Size Unit</label>
                      <select
                        value={sizeUnit}
                        onChange={(e) => setSizeUnit(e.target.value as "cm" | "in")}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200"
                      >
                        <option value="cm">cm (Centimeters)</option>
                        <option value="in">in (Inches)</option>
                      </select>
                    </div>
                  </div>

                  {/* Body Weight Section */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      Body Weight ({weightUnit})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 font-mono block mb-1">
                          Current Weight
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 80.5"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-mono block mb-1">
                          Goal Weight
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 75.0"
                          value={weightGoal}
                          onChange={(e) => setWeightGoal(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Body Sizes Section */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      Limb & Circumference Sizes ({sizeUnit})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Arm */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Arm (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="38.5"
                            value={armSize}
                            onChange={(e) => setArmSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Arm (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="41.0"
                            value={armSizeGoal}
                            onChange={(e) => setArmSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Leg */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Leg / Thigh (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="58.0"
                            value={legSize}
                            onChange={(e) => setLegSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Leg (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="62.0"
                            value={legSizeGoal}
                            onChange={(e) => setLegSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Waist */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Waist (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="85.0"
                            value={waistSize}
                            onChange={(e) => setWaistSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Waist (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="80.0"
                            value={waistSizeGoal}
                            onChange={(e) => setWaistSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Chest */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Chest (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="104.0"
                            value={chestSize}
                            onChange={(e) => setChestSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Chest (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="110.0"
                            value={chestSizeGoal}
                            onChange={(e) => setChestSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Hip */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Hip (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="98.0"
                            value={hipSize}
                            onChange={(e) => setHipSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Hip (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="95.0"
                            value={hipSizeGoal}
                            onChange={(e) => setHipSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Calf */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Calf (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="37.0"
                            value={calfSize}
                            onChange={(e) => setCalfSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Calf (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="39.0"
                            value={calfSizeGoal}
                            onChange={(e) => setCalfSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Shoulder */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Shoulder (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="122.0"
                            value={shoulderSize}
                            onChange={(e) => setShoulderSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Shoulder (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="128.0"
                            value={shoulderSizeGoal}
                            onChange={(e) => setShoulderSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>

                      {/* Neck */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono block">Neck (Current)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="39.0"
                            value={neckSize}
                            onChange={(e) => setNeckSize(e.target.value)}
                            className="w-full bg-transparent text-white font-mono text-xs p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-indigo-400 font-mono block">Neck (Goal)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="40.0"
                            value={neckSizeGoal}
                            onChange={(e) => setNeckSizeGoal(e.target.value)}
                            className="w-full bg-transparent text-indigo-300 font-mono text-xs p-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] text-zinc-400 font-mono block mb-1">
                      Measurement Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Morning empty stomach, post-cardio"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab("overview")}
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Measurements</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: HISTORY */}
              {activeSubTab === "history" && (
                <div className="space-y-3">
                  {(!data?.history || data.history.length === 0) ? (
                    <div className="py-8 text-center text-xs font-mono text-zinc-500">
                      No measurements logged yet. Use the Update tab to log your first weigh-in!
                    </div>
                  ) : (
                    data.history.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            {entry.date}
                          </span>
                          {entry.weight && (
                            <span className="text-white font-bold text-sm">
                              {entry.weight} {entry.weightUnit}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-400">
                          {entry.armSize && <div>Arm: <span className="text-zinc-200">{entry.armSize} {entry.sizeUnit}</span></div>}
                          {entry.legSize && <div>Leg: <span className="text-zinc-200">{entry.legSize} {entry.sizeUnit}</span></div>}
                          {entry.waistSize && <div>Waist: <span className="text-zinc-200">{entry.waistSize} {entry.sizeUnit}</span></div>}
                          {entry.chestSize && <div>Chest: <span className="text-zinc-200">{entry.chestSize} {entry.sizeUnit}</span></div>}
                          {entry.hipSize && <div>Hip: <span className="text-zinc-200">{entry.hipSize} {entry.sizeUnit}</span></div>}
                          {entry.calfSize && <div>Calf: <span className="text-zinc-200">{entry.calfSize} {entry.sizeUnit}</span></div>}
                          {entry.shoulderSize && <div>Shoulder: <span className="text-zinc-200">{entry.shoulderSize} {entry.sizeUnit}</span></div>}
                          {entry.neckSize && <div>Neck: <span className="text-zinc-200">{entry.neckSize} {entry.sizeUnit}</span></div>}
                        </div>

                        {entry.notes && (
                          <div className="text-[11px] text-zinc-500 italic pt-1 border-t border-zinc-850">
                            "{entry.notes}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

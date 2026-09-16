"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Flame,
  Camera,
  Plus,
  Trash2,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Check,
  Send,
  Sliders,
  Scale,
  X,
  AlertCircle,
  Beef,
  Wheat,
  Droplet,
  ChevronRight,
  Upload,
} from "lucide-react";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logNaturalEntryAction,
  deleteLoggedItemAction,
  resetDailyTrackingAction,
  scanMealImageAction,
  estimateFoodMacrosAction,
  type DailyGoalsData,
  type SaveDailyGoalsInput,
} from "@/app/actions";
import { FOOD_DATABASE, type EstimatedMacroResult } from "@/lib/food-parser";
import type { LoggedItem } from "@/db/schema";
import { MealScanModal } from "./meal-scan-modal";

export function CaloriesDashboard() {
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active Logging Mode: "grams" (Name + Grams), "camera" (Image Scan), "quick" (Free Text)
  const [logMode, setLogMode] = useState<"grams" | "camera" | "quick">("grams");

  // Mode 1: Food Name + Grams state (Grams is completely optional)
  const [foodName, setFoodName] = useState("");
  const [grams, setGrams] = useState<string>("");
  const [estimatedMacros, setEstimatedMacros] = useState<EstimatedMacroResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mode 2: In-page Camera / Image state
  const [isMealScanModalOpen, setIsMealScanModalOpen] = useState(false);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scannedMealResult, setScannedMealResult] = useState<{
    mealName: string;
    items: { name: string; estimatedGrams: number; calories: number; protein: number }[];
    totalCalories: number;
    totalProtein: number;
  } | null>(null);

  // Mode 3: Quick free-form text input
  const [quickInput, setQuickInput] = useState("");

  // Edit Calorie Target Modal state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState("");
  const [targetProteinInput, setTargetProteinInput] = useState("");

  const refreshData = () => {
    startTransition(async () => {
      try {
        const data = await getDailyGoalsAction();
        setGoals(data);
        if (data) {
          setTargetCaloriesInput(data.caloriesTarget?.toString() || "1900");
          setTargetProteinInput(data.proteinMinGrams?.toString() || "65");
        }
      } catch (err) {
        console.error("Failed to load calorie goals:", err);
      }
    });
  };

  useEffect(() => {
    refreshData();
    const onFocus = () => refreshData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Update real-time macro estimation when foodName or grams change
  useEffect(() => {
    const trimmed = foodName.trim();
    if (!trimmed) {
      setEstimatedMacros(null);
      return;
    }
    const gVal = grams.trim() ? parseFloat(grams) : undefined;
    estimateFoodMacrosAction(trimmed, gVal).then((result) => {
      setEstimatedMacros(result);
    });
  }, [foodName, grams]);

  // Flash status message
  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. Log by Food Name & Grams (Grams weight is optional)
  const handleLogByGrams = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = foodName.trim();
    if (!name) {
      showFeedback("Please enter what you ate.", "error");
      return;
    }

    const gVal = grams.trim() ? parseFloat(grams) : undefined;
    const macros = estimatedMacros || (await estimateFoodMacrosAction(name, gVal));

    let loggedText = name;
    if (gVal && gVal > 0) {
      loggedText = `${gVal}g ${macros.name || name}`;
    } else if (macros.portionDesc) {
      loggedText = `${macros.portionDesc}`;
    } else {
      loggedText = macros.name || name;
    }

    startTransition(async () => {
      try {
        const res = await logNaturalEntryAction({
          text: loggedText,
          calories: macros.calories,
          protein: macros.protein,
        });

        if (res.success) {
          setGoals(res.goals);
          setFoodName("");
          setGrams(""); // Keep weight empty/optional for the next meal
          setEstimatedMacros(null);
          showFeedback(`Logged ${loggedText} (+${macros.calories} kcal, +${macros.protein}g protein)`);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to log food", "error");
      }
    });
  };

  // 2. Handle Image Selection & In-line Camera
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showFeedback("Please select an image file (JPEG, PNG, WebP).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImageBase64(base64);
      setIsScanningImage(true);

      try {
        const scanRes = await scanMealImageAction(base64, file.type);
        if (scanRes.meal) {
          setScannedMealResult({
            mealName: scanRes.meal.mealName,
            items: scanRes.meal.items,
            totalCalories: scanRes.meal.totalCalories,
            totalProtein: scanRes.meal.totalProteinGrams,
          });
          showFeedback(`AI identified: ${scanRes.meal.mealName} (~${scanRes.meal.totalCalories} kcal)`);
        } else {
          showFeedback(scanRes.error || "Could not analyze image.", "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Scanning failed.", "error");
      } finally {
        setIsScanningImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Confirm and Log In-line Scanned Meal
  const handleConfirmScannedMeal = async () => {
    if (!scannedMealResult) return;

    startTransition(async () => {
      try {
        const res = await logNaturalEntryAction({
          text: scannedMealResult.mealName,
          calories: scannedMealResult.totalCalories,
          protein: scannedMealResult.totalProtein,
        });

        if (res.success) {
          setGoals(res.goals);
          setSelectedImageBase64(null);
          setScannedMealResult(null);
          showFeedback(
            `Logged scanned meal: ${scannedMealResult.mealName} (+${scannedMealResult.totalCalories} kcal, +${scannedMealResult.totalProtein}g protein)`
          );
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to log scanned meal.", "error");
      }
    });
  };

  // 3. Quick Free-form / One-Tap preset logging
  const handleQuickLog = async (textToLog?: string) => {
    const text = (textToLog || quickInput).trim();
    if (!text) return;

    startTransition(async () => {
      try {
        const res = await logNaturalEntryAction({ text });
        if (res.success) {
          setGoals(res.goals);
          if (!textToLog) setQuickInput("");
          showFeedback(`Logged: "${text}" (+${res.loggedItem?.calories || 0} kcal)`);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to log entry.", "error");
      }
    });
  };

  // 4. Delete Logged Item
  const handleDeleteItem = async (itemId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteLoggedItemAction(itemId);
        if (res.success) {
          setGoals(res.goals);
          showFeedback("Item removed and calories updated.");
        }
      } catch (err) {
        console.error("Failed to delete item:", err);
      }
    });
  };

  // 5. Reset Today's Calories
  const handleResetToday = async () => {
    if (!window.confirm("Reset today's calories and meals back to zero?")) return;
    startTransition(async () => {
      try {
        const res = await resetDailyTrackingAction();
        if (res.goals) setGoals(res.goals);
        showFeedback("Today's calories reset to 0.");
      } catch (err) {
        console.error("Failed to reset daily calories:", err);
      }
    });
  };

  // 6. Save Updated Calorie Target
  const handleSaveTarget = async () => {
    const cVal = parseInt(targetCaloriesInput, 10);
    const pVal = parseInt(targetProteinInput, 10);

    if (isNaN(cVal) || cVal <= 0) {
      showFeedback("Please enter a valid calorie target.", "error");
      return;
    }

    startTransition(async () => {
      try {
        const payload: SaveDailyGoalsInput = {
          caloriesTarget: cVal,
          proteinMinGrams: !isNaN(pVal) ? pVal : goals?.proteinMinGrams ?? 65,
        };
        const res = await saveDailyGoalsAction(payload);
        if (res.goals) setGoals(res.goals);
        setIsTargetModalOpen(false);
        showFeedback(`Daily calorie target updated to ${cVal} kcal.`);
      } catch (err) {
        console.error("Failed to save target:", err);
      }
    });
  };

  // Metrics calculations
  const caloriesEaten = Math.round(goals?.todayCalories || 0);
  const caloriesTarget = goals?.caloriesTarget || 1900;
  const caloriesRemaining = caloriesTarget - caloriesEaten;
  const caloriePercent = Math.min(100, Math.round((caloriesEaten / caloriesTarget) * 100));

  const proteinEaten = Math.round((goals?.todayProtein || 0) * 10) / 10;
  const proteinTarget = goals?.proteinMinGrams || 65;

  // Food history (filter out non-food if any, showing all eaten items)
  const eatenItems = (goals?.todayLoggedItems || []).filter(
    (item) => item.category === "food" || item.calories > 0
  );

  // Filter food database suggestions as user types
  const filteredSuggestions = foodName.trim()
    ? FOOD_DATABASE.filter((f) =>
        f.displayName.toLowerCase().includes(foodName.toLowerCase().trim()) ||
        f.aliases.some((a) => a.toLowerCase().includes(foodName.toLowerCase().trim()))
      ).slice(0, 5)
    : [];

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Optional Modal for Full Camera/File Scan */}
      <MealScanModal
        isOpen={isMealScanModalOpen}
        onClose={() => setIsMealScanModalOpen(false)}
        onLoggedSuccess={(msg) => {
          showFeedback(msg);
          refreshData();
        }}
      />

      {/* Target Setting Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-750 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100">Set Daily Calorie Target</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Target Daily Calories (kcal)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetCaloriesInput}
                    onChange={(e) => setTargetCaloriesInput(e.target.value)}
                    placeholder="e.g. 1900"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-zinc-500">kcal</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  1,900 kcal is optimal for steady fat loss deficit while preserving lean muscle.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Minimum Daily Protein (g)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetProteinInput}
                    onChange={(e) => setTargetProteinInput(e.target.value)}
                    placeholder="e.g. 65"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-zinc-500">grams</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs transition shadow-lg shadow-amber-400/20"
                >
                  Save Targets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-slideUp ${
            statusMessage.type === "success"
              ? "bg-zinc-900 border-emerald-500 text-emerald-300 shadow-emerald-500/10"
              : "bg-zinc-900 border-rose-500 text-rose-300 shadow-rose-500/10"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: HERO CALORIE COUNTER */}
      <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Flame className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>DAILY CALORIES</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  DEFICIT TRACKER
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Precision tracking for weight loss: log food names, grams, or photo scans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTargetModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Edit target calories"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Target: {caloriesTarget} kcal</span>
            </button>
            <button
              type="button"
              onClick={refreshData}
              disabled={isPending}
              className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleResetToday}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-750 hover:border-rose-900/50 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              title="Reset today's calories to 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Primary Calorie Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
          {/* Main Calorie Gauge */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                  {caloriesEaten.toLocaleString()}
                </span>
                <span className="text-base sm:text-lg font-mono text-zinc-400 ml-2">
                  / {caloriesTarget.toLocaleString()} kcal
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm sm:text-base font-bold font-mono ${
                    caloriesRemaining >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {caloriesRemaining >= 0
                    ? `${caloriesRemaining.toLocaleString()} kcal remaining`
                    : `${Math.abs(caloriesRemaining).toLocaleString()} kcal over`}
                </span>
              </div>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-3.5 bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-750">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  caloriePercent > 100
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-emerald-500 to-amber-400"
                }`}
                style={{ width: `${Math.min(100, caloriePercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
              <span>0 kcal</span>
              <span className="text-zinc-400">{caloriePercent}% of daily budget</span>
              <span>{caloriesTarget.toLocaleString()} kcal</span>
            </div>
          </div>

          {/* Quick Macro Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Beef className="w-3.5 h-3.5" /> Protein
                </span>
                <span>{proteinTarget}g goal</span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {proteinEaten}g
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (proteinEaten / proteinTarget) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1 text-sky-400">
                  <Flame className="w-3.5 h-3.5" /> Deficit Status
                </span>
              </div>
              <div className="text-base font-bold font-mono text-sky-300">
                {caloriesRemaining > 200 ? "Deficit Safe" : caloriesRemaining >= 0 ? "Target Reached" : "Surplus"}
              </div>
              <p className="text-[10px] text-zinc-500">
                {caloriesRemaining >= 0 ? "Steady fat-burning zone" : "Higher calorie day"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: FAST FOOD LOGGING CENTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold font-mono text-zinc-200">LOG WHAT YOU ATE</h2>
          </div>

          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setLogMode("grams")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                logMode === "grams"
                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Food + Grams (Optional)</span>
            </button>
            <button
              type="button"
              onClick={() => setLogMode("camera")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                logMode === "camera"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>📷 Image / Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setLogMode("quick")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                logMode === "quick"
                  ? "bg-amber-400 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Free Text / Presets</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FOOD NAME & GRAMS INPUT (OPTIONAL WEIGHT) */}
        {logMode === "grams" && (
          <form onSubmit={handleLogByGrams} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Food Name Input */}
              <div className="sm:col-span-8 relative">
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  1. What did you eat? (Food Name)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => {
                      setFoodName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="e.g. Chicken Breast, White Rice, Eggs, Oatmeal, Apple..."
                    className="w-full bg-zinc-950 border border-zinc-750 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 font-sans focus:outline-none transition shadow-inner"
                  />
                  {foodName && (
                    <button
                      type="button"
                      onClick={() => setFoodName("")}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {filteredSuggestions.map((item) => (
                      <button
                        key={item.displayName}
                        type="button"
                        onClick={() => {
                          setFoodName(item.displayName);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-300 border-b border-zinc-900 last:border-0"
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.emoji}</span>
                          <span className="font-bold">{item.displayName}</span>
                        </span>
                        <span className="text-zinc-500 font-mono">
                          ~{item.caloriesPerUnit} kcal / {item.unitType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grams (g) Input - OPTIONAL */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono text-zinc-400">
                    2. Weight in Grams
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
                    OPTIONAL
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    placeholder="e.g. 150 (optional)"
                    className="w-full bg-zinc-950 border border-zinc-750 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-zinc-100 font-mono focus:outline-none transition shadow-inner"
                  />
                  {grams ? (
                    <button
                      type="button"
                      onClick={() => setGrams("")}
                      className="absolute right-3 top-2.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-lg transition"
                      title="Clear weight (make optional)"
                    >
                      Clear ✕
                    </button>
                  ) : (
                    <span className="absolute right-4 top-3 text-xs font-mono text-zinc-500 pointer-events-none">
                      grams (opt)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Gram Pills & Popular Food Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-zinc-500 mr-1">Weight:</span>
                <button
                  type="button"
                  onClick={() => setGrams("")}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition ${
                    !grams.trim()
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  Auto (No Weight)
                </button>
                {[50, 100, 150, 200, 250, 300].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrams(grams === g.toString() ? "" : g.toString())}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition ${
                      grams === g.toString()
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-zinc-500 mr-1">Staples:</span>
                {[
                  { name: "Chicken Breast" },
                  { name: "White Rice" },
                  { name: "Eggs" },
                  { name: "Oatmeal" },
                  { name: "Banana" },
                ].map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setFoodName(s.name);
                      setShowSuggestions(false);
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 transition"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calorie Preview Card */}
            {foodName.trim() && estimatedMacros && (
              <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{estimatedMacros.emoji}</span>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <span>
                        {grams.trim()
                          ? `${grams}g ${estimatedMacros.name}`
                          : estimatedMacros.portionDesc || estimatedMacros.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                        {grams.trim() ? "EXACT GRAMS" : "PORTION ESTIMATE"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-3 mt-0.5">
                      <span className="text-amber-400 font-bold">~{estimatedMacros.calories} kcal</span>
                      <span className="text-emerald-400">{estimatedMacros.protein}g Protein</span>
                      <span>{estimatedMacros.carbs}g Carbs</span>
                      <span>{estimatedMacros.fat}g Fat</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {grams.trim()
                      ? `Log ${grams}g (${estimatedMacros.calories} kcal)`
                      : `Log ${estimatedMacros.name || foodName} (${estimatedMacros.calories} kcal)`}
                  </span>
                </button>
              </div>
            )}

            {!foodName.trim() && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={true}
                  className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs font-mono flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <span>Type what you ate to log calories (grams weight is optional)</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: TAKE IMAGE / CAMERA SCAN (MULTIMODAL AI) */}
        {logMode === "camera" && (
          <div className="space-y-4">
            <div className="bg-zinc-950 border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-2xl p-6 text-center transition space-y-4">
              <input
                type="file"
                id="inline-camera-input"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {!selectedImageBase64 ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">
                      Take a Photo or Upload Your Meal
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                      Gemini Vision scans plate items, estimates portion grams, and calculates exact calories.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label
                      htmlFor="inline-camera-input"
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center gap-2 transition cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 Snap Photo / Camera</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMealScanModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 font-bold text-xs font-mono flex items-center gap-2 transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Image File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-zinc-750 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImageBase64}
                      alt="Scanned Meal"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageBase64(null);
                        setScannedMealResult(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-zinc-200 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isScanningImage && (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-purple-400 py-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gemini Vision is estimating portion grams & calories...</span>
                    </div>
                  )}

                  {scannedMealResult && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          <span>🍽️ {scannedMealResult.mealName}</span>
                        </h4>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-amber-400">
                            +{scannedMealResult.totalCalories} kcal
                          </span>
                          <span className="text-xs font-mono text-emerald-400 ml-2">
                            +{scannedMealResult.totalProtein}g protein
                          </span>
                        </div>
                      </div>

                      {/* Items breakdown with grams */}
                      <div className="space-y-1.5 border-t border-zinc-800/80 pt-2">
                        {scannedMealResult.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg"
                          >
                            <span>{item.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-300 font-bold">{item.estimatedGrams}g</span>
                              <span className="text-amber-400">{item.calories} kcal</span>
                              <span className="text-emerald-400">{item.protein}g P</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmScannedMeal}
                        disabled={isPending}
                        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-purple-600/20 mt-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm & Log {scannedMealResult.totalCalories} kcal to Today</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FREE TEXT / NATURAL SPEECH / PRESET BUTTONS */}
        {logMode === "quick" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickLog();
                }}
                placeholder='Type naturally, e.g. "I ate 4 boiled eggs and 150g chicken breast"...'
                className="flex-1 bg-zinc-950 border border-zinc-750 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition font-sans shadow-inner"
              />
              <button
                type="button"
                onClick={() => handleQuickLog()}
                disabled={!quickInput.trim() || isPending}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-bold text-xs font-mono transition cursor-pointer"
              >
                Log
              </button>
            </div>

            {/* Quick Tap Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-400">One-Tap Common Items:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "🍳 4 Boiled Eggs", text: "4 boiled eggs" },
                  { label: "🥩 200g Chicken Breast", text: "200g chicken breast" },
                  { label: "🍚 150g White Rice", text: "150g white rice" },
                  { label: "🥤 Whey Shake (1 scoop)", text: "1 scoop whey protein" },
                  { label: "🍌 1 Medium Banana", text: "1 banana" },
                  { label: "🥣 Greek Yogurt (1 cup)", text: "1 cup greek yogurt" },
                  { label: "🌯 Chicken Shawarma", text: "150g chicken shawarma" },
                  { label: "🥪 Tuna Sandwich", text: "1 can of tuna and 2 slices bread" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickLog(preset.text)}
                    disabled={isPending}
                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-left text-xs text-zinc-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>{preset.label}</span>
                    <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: TODAY'S MEAL & CALORIE LOG HISTORY */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-zinc-100">TODAY&apos;S FOOD & MEAL LOG</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {eatenItems.length} {eatenItems.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {eatenItems.length > 0 && (
            <button
              type="button"
              onClick={handleResetToday}
              className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 transition"
            >
              Clear all
            </button>
          )}
        </div>

        {eatenItems.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/40">
            <Scale className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-mono text-zinc-400">No meals logged yet today.</p>
            <p className="text-[11px] text-zinc-600">
              Use the Food + Grams bar above or snap a photo to begin tracking today&apos;s calories.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 space-y-1">
            {eatenItems.map((item) => {
              const time = item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={item.id}
                  className="py-3 px-3 rounded-xl hover:bg-zinc-950/50 flex items-center justify-between gap-4 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-750 flex items-center justify-center text-base shrink-0">
                      {item.summary?.split(" ")[0] || "🍽️"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-200 truncate flex items-center gap-2">
                        <span>{item.name}</span>
                        {time && <span className="text-[10px] font-mono text-zinc-500 font-normal">at {time}</span>}
                      </div>
                      <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                        <span className="text-amber-400 font-bold">+{item.calories} kcal</span>
                        {item.protein > 0 && (
                          <span className="text-emerald-400">+{item.protein}g protein</span>
                        )}
                        <span className="text-zinc-600 truncate max-w-[200px]">
                          {item.rawText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30 transition shrink-0 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

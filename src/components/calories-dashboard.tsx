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
  Sliders,
  Scale,
  X,
  AlertCircle,
  Beef,
  ChevronDown,
  ChevronUp,
  Edit2,
  Bot,
  Calendar,
  History,
  FastForward,
} from "lucide-react";
import {
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logNaturalEntryAction,
  deleteLoggedItemAction,
  resetDailyTrackingAction,
  estimateFoodMacrosAction,
  searchFoodDatabaseAction,
  getDailyProgressHistoryAction,
  simulateNewDayRolloverAction,
  writeUnestimatedFoodAction,
  reviewFoodWithAIAction,
  reviewAllPendingFoodsWithAIAction,
  updateLoggedFoodCaloriesAction,
  type DailyGoalsData,
  type SaveDailyGoalsInput,
  type FoodSearchResultItem,
  type DailyNutritionLogRecord,
} from "@/app/actions";
import { FOOD_DATABASE, type EstimatedMacroResult } from "@/lib/food-parser";
import type { LoggedItem } from "@/db/schema";
import { MealScanModal } from "./meal-scan-modal";

export function CaloriesDashboard() {
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Unified Food Entry State
  const [foodName, setFoodName] = useState("");
  const [grams, setGrams] = useState<string>("");
  const [estimatedMacros, setEstimatedMacros] = useState<EstimatedMacroResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<FoodSearchResultItem[]>([]);

  // Modals state
  const [isMealScanModalOpen, setIsMealScanModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState("");
  const [targetProteinInput, setTargetProteinInput] = useState("");

  // History State
  const [history, setHistory] = useState<DailyNutritionLogRecord[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);
  const [isSimulatingDay, setIsSimulatingDay] = useState(false);

  // AI Review & Calorie Adjustment State
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [isReviewingAllPending, setIsReviewingAllPending] = useState(false);
  const [editingItem, setEditingItem] = useState<LoggedItem | null>(null);
  const [editCaloriesInput, setEditCaloriesInput] = useState("");
  const [editProteinInput, setEditProteinInput] = useState("");
  const [editNotesInput, setEditNotesInput] = useState("");

  const getClientLocalDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const refreshData = () => {
    startTransition(async () => {
      try {
        const localDate = getClientLocalDate();
        const [data, hist] = await Promise.all([
          getDailyGoalsAction(localDate),
          getDailyProgressHistoryAction(14, localDate),
        ]);
        setGoals(data);
        setHistory(hist);
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

  // Real-time macro preview
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

  // Autocomplete search
  useEffect(() => {
    const trimmed = foodName.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFoodDatabaseAction(trimmed).then((items) => {
        setSearchSuggestions(items);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [foodName]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Write Food (Awaiting AI Review with 0 kcal)
  const handleWriteUnestimatedFood = async () => {
    const name = foodName.trim();
    if (!name) {
      showFeedback("Please enter a food name.", "error");
      return;
    }

    const gVal = grams.trim() ? parseFloat(grams) : undefined;

    startTransition(async () => {
      try {
        const localDate = getClientLocalDate();
        const effectiveFoodName = gVal && gVal > 0 ? `${gVal}g ${name}` : name;
        const res = await writeUnestimatedFoodAction({
          foodName: effectiveFoodName,
          clientLocalDate: localDate,
        });

        if (res.success) {
          setGoals(res.goals);
          setFoodName("");
          setGrams("");
          setShowSuggestions(false);
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback(res.message);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to write food", "error");
      }
    });
  };

  // 2. Quick Log (Instant estimate)
  const handleQuickLog = async (e?: React.FormEvent) => {
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
        const localDate = getClientLocalDate();
        const res = await logNaturalEntryAction({
          text: loggedText,
          calories: macros.calories,
          protein: macros.protein,
          clientLocalDate: localDate,
        });

        if (res.success) {
          setGoals(res.goals);
          setFoodName("");
          setGrams("");
          setEstimatedMacros(null);
          setShowSuggestions(false);
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback(`Logged ${loggedText} (+${macros.calories} kcal)`);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to log food", "error");
      }
    });
  };

  // 3. AI Review single item
  const handleReviewItemWithAI = async (itemId: string) => {
    setReviewingItemId(itemId);
    startTransition(async () => {
      try {
        const localDate = getClientLocalDate();
        const res = await reviewFoodWithAIAction({ itemId, clientLocalDate: localDate });
        if (res.success) {
          setGoals(res.goals);
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback(res.message);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "AI review failed", "error");
      } finally {
        setReviewingItemId(null);
      }
    });
  };

  // 4. Batch Review All Pending
  const handleReviewAllPending = async () => {
    setIsReviewingAllPending(true);
    startTransition(async () => {
      try {
        const localDate = getClientLocalDate();
        const res = await reviewAllPendingFoodsWithAIAction({ clientLocalDate: localDate });
        if (res.success) {
          setGoals(res.goals);
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback(res.message);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Batch review failed", "error");
      } finally {
        setIsReviewingAllPending(false);
      }
    });
  };

  // 5. Delete Food Item
  const handleDeleteItem = async (itemId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteLoggedItemAction(itemId);
        if (res.success) {
          setGoals(res.goals);
          const localDate = getClientLocalDate();
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback("Item deleted.");
        }
      } catch {
        showFeedback("Failed to delete item.", "error");
      }
    });
  };

  // 6. Reset Today
  const handleResetToday = async () => {
    if (!window.confirm("Reset today's calories and meals to 0?")) return;
    startTransition(async () => {
      try {
        const res = await resetDailyTrackingAction();
        if (res.success) {
          setGoals(res.goals);
          const localDate = getClientLocalDate();
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback("Today's tracking reset to 0.");
        }
      } catch {
        showFeedback("Failed to reset.", "error");
      }
    });
  };

  // 7. Advance / Simulate New Day
  const handleSimulateNewDay = async () => {
    setIsSimulatingDay(true);
    startTransition(async () => {
      try {
        const res = await simulateNewDayRolloverAction();
        if (res.success) {
          setGoals(res.goals);
          const localDate = getClientLocalDate();
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback("New day started: Yesterday archived to history.");
        }
      } catch {
        showFeedback("Failed to advance day.", "error");
      } finally {
        setIsSimulatingDay(false);
      }
    });
  };

  // 8. Open Edit Food Modal
  const openEditModal = (item: LoggedItem) => {
    setEditingItem(item);
    setEditCaloriesInput(String(item.calories || 0));
    setEditProteinInput(String(item.protein || 0));
    setEditNotesInput(item.aiNotes || "");
  };

  // 9. Save Edit Food Modal
  const handleSaveEditFoodCalories = async () => {
    if (!editingItem) return;
    const calNum = parseFloat(editCaloriesInput);
    if (isNaN(calNum) || calNum < 0) {
      showFeedback("Please enter valid calories.", "error");
      return;
    }
    const proNum = editProteinInput.trim() ? parseFloat(editProteinInput) : undefined;

    startTransition(async () => {
      try {
        const localDate = getClientLocalDate();
        const res = await updateLoggedFoodCaloriesAction({
          itemId: editingItem.id,
          calories: calNum,
          protein: proNum,
          notes: editNotesInput.trim() || undefined,
          clientLocalDate: localDate,
        });

        if (res.success) {
          setGoals(res.goals);
          setEditingItem(null);
          const hist = await getDailyProgressHistoryAction(14, localDate);
          setHistory(hist);
          showFeedback(res.message);
        } else {
          showFeedback(res.message, "error");
        }
      } catch (err: unknown) {
        showFeedback(err instanceof Error ? err.message : "Failed to update calories", "error");
      }
    });
  };

  // 10. Save Target Modal
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
        showFeedback(`Target set to ${cVal} kcal.`);
      } catch (err) {
        console.error("Failed to save target:", err);
      }
    });
  };

  // Calculated metrics
  const caloriesEaten = Math.round(goals?.todayCalories || 0);
  const caloriesTarget = goals?.caloriesTarget || 1900;
  const caloriesRemaining = caloriesTarget - caloriesEaten;
  const caloriePercent = Math.min(100, Math.round((caloriesEaten / caloriesTarget) * 100));

  const proteinEaten = Math.round((goals?.todayProtein || 0) * 10) / 10;
  const proteinTarget = goals?.proteinMinGrams || 65;

  const eatenItems = (goals?.todayLoggedItems || []).filter(
    (item) => item.category === "food" || item.calories > 0
  );

  const pendingCount = eatenItems.filter(
    (i) => i.category === "food" && (i.aiStatus === "pending" || i.calories === 0)
  ).length;

  const filteredSuggestions = foodName.trim()
    ? FOOD_DATABASE.filter(
        (f) =>
          f.displayName.toLowerCase().includes(foodName.toLowerCase().trim()) ||
          f.aliases.some((a) => a.toLowerCase().includes(foodName.toLowerCase().trim()))
      ).slice(0, 5)
    : [];

  return (
    <div className="w-full space-y-4 font-sans text-zinc-100">
      {/* Optional Photo Scan Modal */}
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
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Daily Calorie Target</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Target Calories (kcal)
                </label>
                <input
                  type="number"
                  value={targetCaloriesInput}
                  onChange={(e) => setTargetCaloriesInput(e.target.value)}
                  placeholder="e.g. 1900"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Protein Goal (grams)
                </label>
                <input
                  type="number"
                  value={targetProteinInput}
                  onChange={(e) => setTargetProteinInput(e.target.value)}
                  placeholder="e.g. 65"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition cursor-pointer"
                >
                  Save Target
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Food Calories Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100 truncate">
                  Edit: {editingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editCaloriesInput}
                  onChange={(e) => setEditCaloriesInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Protein (grams)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editProteinInput}
                  onChange={(e) => setEditProteinInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Portion Notes (Optional)
                </label>
                <input
                  type="text"
                  value={editNotesInput}
                  onChange={(e) => setEditNotesInput(e.target.value)}
                  placeholder="e.g. 180g portion"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditFoodCalories}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition cursor-pointer"
                >
                  Save &amp; Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-xl flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-zinc-900 border-emerald-500 text-emerald-300"
              : "bg-zinc-900 border-rose-500 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. DAILY FUEL STATUS CARD */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h1 className="text-sm font-bold font-mono tracking-wider text-zinc-200">
              DAILY CALORIES
            </h1>
            <span className="text-[11px] font-mono text-zinc-500">
              {goals?.lastActiveDate || getClientLocalDate()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleSimulateNewDay}
              disabled={isPending || isSimulatingDay}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              title="Archive today to history and reset today to 0"
            >
              <FastForward className="w-3 h-3 text-amber-400" />
              <span>New Day</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTargetModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Target: {caloriesTarget}</span>
            </button>
            <button
              type="button"
              onClick={refreshData}
              disabled={isPending}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleResetToday}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition cursor-pointer"
              title="Reset today's calories"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Main Calorie Progress */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                  {caloriesEaten.toLocaleString()}
                </span>
                <span className="text-sm font-mono text-zinc-400 ml-2">
                  / {caloriesTarget.toLocaleString()} kcal
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                  caloriesRemaining >= 0
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                    : "bg-rose-950/60 text-rose-400 border-rose-800/60"
                }`}
              >
                {caloriesRemaining >= 0
                  ? `${caloriesRemaining.toLocaleString()} kcal remaining`
                  : `${Math.abs(caloriesRemaining).toLocaleString()} kcal over`}
              </span>
            </div>

            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  caloriePercent > 100 ? "bg-rose-500" : "bg-amber-400"
                }`}
                style={{ width: `${Math.min(100, caloriePercent)}%` }}
              />
            </div>
          </div>

          {/* Protein Metric */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Beef className="w-3.5 h-3.5" /> Protein
              </span>
              <span>{proteinTarget}g goal</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {proteinEaten}g
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (proteinEaten / proteinTarget) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. FAST FOOD ENTRY BAR */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
              Log Food
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsMealScanModalOpen(true)}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Photo Scan</span>
          </button>
        </div>

        {/* Input Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 relative">
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleWriteUnestimatedFood();
                }
              }}
              placeholder='Type food (e.g. "Chicken breast and rice", "3 boiled eggs")...'
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition"
            />
            {foodName && (
              <button
                type="button"
                onClick={() => setFoodName("")}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && (searchSuggestions.length > 0 || filteredSuggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-30 overflow-hidden max-h-56 overflow-y-auto">
                <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Suggestions</span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
                {(searchSuggestions.length > 0 ? searchSuggestions : filteredSuggestions).map((item) => {
                  const subtitle =
                    "subtitle" in item
                      ? item.subtitle
                      : `~${item.caloriesPerUnit} kcal / ${item.unitType}`;

                  return (
                    <button
                      key={item.displayName}
                      type="button"
                      onClick={() => {
                        setFoodName(item.displayName);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-850 flex items-center justify-between text-xs text-zinc-300 border-b border-zinc-850 last:border-0 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.emoji}</span>
                        <span className="font-semibold text-zinc-200">{item.displayName}</span>
                      </span>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        {subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Grams */}
          <div className="sm:col-span-4 relative">
            <input
              type="number"
              min="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="Grams (Optional)"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none transition"
            />
            {grams && (
              <button
                type="button"
                onClick={() => setGrams("")}
                className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={handleWriteUnestimatedFood}
            disabled={!foodName.trim() || isPending}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-900 text-zinc-950 disabled:text-zinc-600 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Adds food with 0 kcal, awaiting your AI review"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✍️ Write Food (Review with AI)</span>
          </button>

          <button
            type="button"
            onClick={handleQuickLog}
            disabled={!foodName.trim() || isPending}
            className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:bg-zinc-950 text-zinc-300 disabled:text-zinc-600 border border-zinc-800 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Log immediately with estimated calories"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              Quick Log {estimatedMacros ? `(~${estimatedMacros.calories} kcal)` : ""}
            </span>
          </button>
        </div>
      </section>

      {/* 3. TODAY'S LOGGED MEALS */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
              Today&apos;s Meals
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
              {eatenItems.length}
            </span>
          </div>
          {eatenItems.length > 0 && (
            <button
              type="button"
              onClick={handleResetToday}
              className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 transition cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Batch AI Review Alert */}
        {pendingCount > 0 && (
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bot className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 font-semibold truncate">
                {pendingCount} item{pendingCount > 1 ? "s" : ""} awaiting AI review (0 kcal so far)
              </span>
            </div>
            <button
              type="button"
              onClick={handleReviewAllPending}
              disabled={isPending || isReviewingAllPending}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Sparkles className={`w-3 h-3 ${isReviewingAllPending ? "animate-spin" : ""}`} />
              <span>{isReviewingAllPending ? "Reviewing..." : `Review All (${pendingCount})`}</span>
            </button>
          </div>
        )}

        {/* Items List */}
        {eatenItems.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-850 rounded-xl">
            <p className="text-xs font-mono text-zinc-500">No meals logged yet today.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-850 space-y-1">
            {eatenItems.map((item) => {
              const isFood = item.category === "food";
              const isPendingReview = isFood && (item.aiStatus === "pending" || item.calories === 0);
              const isReviewed = item.aiStatus === "reviewed";
              const isBeingReviewed = reviewingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 rounded-lg hover:bg-zinc-900/50 transition"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-200 truncate">
                        {item.name}
                      </span>
                      {isPendingReview && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold">
                          Pending AI
                        </span>
                      )}
                      {isReviewed && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                          AI Reviewed
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                      {isPendingReview ? (
                        <span className="text-amber-400/90 font-semibold">0 kcal</span>
                      ) : (
                        <>
                          <span className="text-amber-400 font-bold">+{item.calories} kcal</span>
                          {item.protein > 0 && (
                            <span className="text-emerald-400 font-semibold">+{item.protein}g protein</span>
                          )}
                        </>
                      )}
                    </div>

                    {item.aiNotes && (
                      <p className="text-[11px] text-zinc-400 italic">
                        💡 {item.aiNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPendingReview && (
                      <button
                        type="button"
                        onClick={() => handleReviewItemWithAI(item.id)}
                        disabled={isPending || isBeingReviewed}
                        className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Review with AI"
                      >
                        <Sparkles className={`w-3 h-3 text-amber-400 ${isBeingReviewed ? "animate-spin" : ""}`} />
                        <span>{isBeingReviewed ? "Reviewing..." : "Review"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                      title="Edit calories"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. 14-DAY PROGRESS HISTORY (COLLAPSIBLE) */}
      <section className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
              14-Day History
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">
              ({history.length} days recorded)
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition"
          >
            <span>{isHistoryExpanded ? "Hide" : "Show"}</span>
            {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isHistoryExpanded && (
          <div className="pt-2 border-t border-zinc-850 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 py-3 text-center">
                No past days recorded yet.
              </p>
            ) : (
              history.map((dayRecord) => {
                const isExpanded = expandedDayDate === dayRecord.date;
                return (
                  <div
                    key={dayRecord.date}
                    className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-900/40 text-xs font-mono"
                  >
                    <div
                      onClick={() => setExpandedDayDate(isExpanded ? null : dayRecord.date)}
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-900 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-bold text-zinc-200">{dayRecord.displayDate}</span>
                        <span className="text-zinc-500 text-[11px]">({dayRecord.date})</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-200">
                          {dayRecord.calories.toLocaleString()} kcal
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            dayRecord.status === "under_budget"
                              ? "bg-emerald-950 text-emerald-400"
                              : "bg-rose-950 text-rose-400"
                          }`}
                        >
                          {dayRecord.status === "under_budget" ? "Deficit" : "Surplus"}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-zinc-950 border-t border-zinc-850 space-y-1 text-[11px] text-zinc-400">
                        {dayRecord.items.length === 0 ? (
                          <p className="italic text-zinc-500">No meal details recorded.</p>
                        ) : (
                          dayRecord.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b border-zinc-900 last:border-0">
                              <span>{item.name}</span>
                              <span className="text-amber-400 font-bold">+{item.calories} kcal</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}

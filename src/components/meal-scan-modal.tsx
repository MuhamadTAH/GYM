"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Flame,
  Target,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { logNaturalEntryAction } from "@/app/actions";
import type { ScannedMealItem, ScannedMealResponse } from "@/lib/meal-scanner";

interface MealScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedSuccess: (message: string) => void;
}

export function MealScanModal({
  isOpen,
  onClose,
  onLoggedSuccess,
}: MealScanModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scanned / Editable state
  const [scannedMeal, setScannedMeal] = useState<ScannedMealResponse | null>(null);
  const [mealName, setMealName] = useState("");
  const [items, setItems] = useState<ScannedMealItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      setErrorMsg("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFileData({
        base64: result,
        mimeType: file.type,
      });
      // Automatically trigger AI analysis upon image selection
      performScan(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const performScan = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/nutrition/scan-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze meal photo.");
      }

      const meal: ScannedMealResponse = data.meal;
      setScannedMeal(meal);
      setMealName(meal.mealName);
      setItems(meal.items);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error analyzing meal photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ScannedMealItem,
    val: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: typeof val === "string" && field !== "name" ? parseFloat(val) || 0 : val,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "Extra Item", estimatedGrams: 50, calories: 50, protein: 5 },
    ]);
  };

  const totalCalories = Math.round(
    items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
  );
  const totalProtein = Math.round(
    items.reduce((sum, item) => sum + (Number(item.protein) || 0), 0) * 10
  ) / 10;

  const handleConfirmAndLog = async () => {
    if (!mealName.trim() || items.length === 0) {
      setErrorMsg("Please include a meal name and at least one food item.");
      return;
    }

    setIsLogging(true);
    try {
      const res = await logNaturalEntryAction({
        text: mealName,
        calories: totalCalories,
        protein: totalProtein,
      });

      if (res.success) {
        onLoggedSuccess(`Logged scanned meal: ${mealName} (+${totalCalories} kcal, +${totalProtein}g protein)`);
        onClose();
      } else {
        setErrorMsg("Failed to save meal to database.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to log meal.");
    } finally {
      setIsLogging(false);
    }
  };

  const resetScanner = () => {
    setImagePreview(null);
    setFileData(null);
    setScannedMeal(null);
    setItems([]);
    setMealName("");
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Multimodal Meal Scanner
              </h3>
              <p className="text-[10px] text-zinc-400">
                Segment plate items, estimate portion grams & auto-calculate macros
              </p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Area / Preview */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-purple-500/60 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-zinc-200 block">
                  Click or drag photo to scan meal
                </span>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Supports Camera capture, JPEG, PNG, WebP (up to 10MB)
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Thumbnail with Rescan option */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 max-h-48 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Meal preview"
                  className="max-h-48 w-full object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-zinc-300 border border-zinc-750 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change Photo</span>
                  </button>
                </div>
              </div>

              {/* Scanning Spinner */}
              {isScanning && (
                <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-purple-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>AI Vision Model Analyzing Plate & Volumetric Grams...</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Segmenting individual protein, carbohydrate, and vegetable components.
                  </p>
                </div>
              )}

              {/* Editable Breakdown Card */}
              {!isScanning && scannedMeal && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Meal Name Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">
                      Meal Description / Name
                    </label>
                    <input
                      type="text"
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      placeholder="e.g. Chicken Breast with Rice and Lentils"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Segmented Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400">
                      <span>Segmented Plate Items ({items.length})</span>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-850 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                        >
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                              className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
                              placeholder="Item Name"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.estimatedGrams}
                                onChange={(e) =>
                                  handleItemChange(idx, "estimatedGrams", e.target.value)
                                }
                                className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs text-right"
                              />
                              <span className="text-[10px] text-zinc-500">g</span>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.calories}
                                onChange={(e) =>
                                  handleItemChange(idx, "calories", e.target.value)
                                }
                                className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-amber-300 text-xs text-right font-bold"
                              />
                              <span className="text-[10px] text-zinc-500">kcal</span>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                value={item.protein}
                                onChange={(e) =>
                                  handleItemChange(idx, "protein", e.target.value)
                                }
                                className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs text-right font-bold"
                              />
                              <span className="text-[10px] text-zinc-500">g pro</span>
                            </div>
                          </div>

                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Totals Banner */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">
                          Total Calories
                        </div>
                        <div className="text-lg font-black text-amber-400 flex items-center gap-1">
                          <Flame className="w-4 h-4" />
                          <span>+{totalCalories} kcal</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">
                          Total Protein
                        </div>
                        <div className="text-lg font-black text-emerald-400 flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>+{totalProtein}g</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        Confidence: {Math.round((scannedMeal.confidenceScore || 0.8) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-900/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          {scannedMeal && (
            <button
              type="button"
              onClick={handleConfirmAndLog}
              disabled={isLogging || items.length === 0}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-purple-950/50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLogging ? "Logging..." : "Confirm & Log to Dashboard"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

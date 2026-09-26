"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Video,
  AlertOctagon,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Footprints,
  Dumbbell,
  Calendar,
  MoreVertical,
  Search,
  Sparkles,
  CheckCircle2,
  X,
  RotateCcw,
  Activity,
  User,
  Trophy,
  ArrowLeftRight,
  FastForward,
  Minus,
  Plus,
} from "lucide-react";
import {
  submitShorthandSetAction,
  triggerManualHardStopAction,
  fetchRecentSetsAction,
  getTodaysWorkoutAction,
  completeWorkoutSessionAction,
  swapSessionOrderAction,
  skipRestDayAction,
  quickStartWorkoutAction,
  getDailyGoalsAction,
  type LoggedSetResponse,
  type TodaysWorkoutView,
  type AutoregulationAdjustment,
  type DailyGoalsData,
} from "@/app/actions";
import type { ArbitrationResult } from "@/lib/arbitration";
import type { ExecutionDirective } from "@/lib/coach";
import type { PlannedExercise } from "@/lib/planner";
import { AudioCuePlayer, useAudioCue } from "./audio-cue";
import { ProfileModal } from "./profile-modal";
import { ExerciseGuideModal } from "./exercise-guide-modal";
import { getExerciseGuide, type ExerciseGuide } from "@/lib/exercises-data";

interface RecentSetDisplay {
  id: string;
  exerciseName: string;
  setNumber: number;
  loadValue: number;
  loadUnit: string;
  reps: number;
  loggedRpe: number | null;
  hasAcutePain: boolean;
  completedAt: string;
}

export function ShorthandLogger() {
  // Navigation / View Modes: "routine" (Left screen) | "dashboard" (Middle screen) | "player" (Right screen)
  const [viewMode, setViewMode] = useState<"routine" | "dashboard" | "player">("routine");

  // Routine & Active Workout state
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkoutView | null>(null);
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
  const [activeDay, setActiveDay] = useState<number>(3); // 1 to 7
  const [activeExIndex, setActiveExIndex] = useState<number>(0);
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Player execution state
  const [preferredUnit, setPreferredUnit] = useState<"kg" | "lb">("kg");
  const [currentLoad, setCurrentLoad] = useState<number>(80);
  const [currentReps, setCurrentReps] = useState<number>(10);
  const [currentRpe, setCurrentRpe] = useState<number>(8);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [userOverride, setUserOverride] = useState(false);

  // Live Timer / Stopwatch state (for player)
  const [timerSeconds, setTimerSeconds] = useState<number>(18);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Feedback & Directives state
  const [lastResponse, setLastResponse] = useState<LoggedSetResponse | null>(null);
  const [activeDirective, setActiveDirective] = useState<ExecutionDirective | null>(null);
  const [arbitrationState, setArbitrationState] = useState<ArbitrationResult | null>(null);
  const [recentSets, setRecentSets] = useState<RecentSetDisplay[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<ExerciseGuide | null>(null);
  const [completionResult, setCompletionResult] = useState<{
    message: string;
    adjustments: AutoregulationAdjustment[];
  } | null>(null);

  const { speakDirective } = useAudioCue(activeDirective, isAudioEnabled);

  // Load today's workout & metrics
  const refreshWorkout = () => {
    getTodaysWorkoutAction().then((tw) => {
      if (tw) {
        setTodaysWorkout(tw);
        if (tw.dayIndex) setActiveDay(tw.dayIndex);
        if (tw.exercises.length > 0) {
          const firstEx = tw.exercises[activeExIndex] || tw.exercises[0];
          setCurrentLoad(firstEx.targetLoad);
          setCurrentReps(firstEx.targetReps);
          setCurrentRpe(firstEx.targetRpe || 8);
          setPreferredUnit(firstEx.loadUnit);
        }
      }
    });
    getDailyGoalsAction().then((g) => {
      if (g) setGoals(g);
    });
    fetchRecentSetsAction().then((sets) => {
      if (sets && sets.length > 0) {
        setRecentSets(sets as unknown as RecentSetDisplay[]);
      }
    });
  };

  useEffect(() => {
    refreshWorkout();
  }, []);

  // Sync active exercise load & reps when activeExIndex changes
  useEffect(() => {
    if (todaysWorkout && todaysWorkout.exercises.length > 0) {
      const ex = todaysWorkout.exercises[activeExIndex] || todaysWorkout.exercises[0];
      if (ex) {
        setCurrentLoad(ex.targetLoad);
        setCurrentReps(ex.targetReps);
        setCurrentRpe(ex.targetRpe || 8);
        setPreferredUnit(ex.loadUnit);
        setCurrentSetNumber(1);
        setTimerSeconds(18); // Reset timer to standard countdown/elapsed
      }
    }
  }, [activeExIndex, todaysWorkout]);

  // Live timer interval
  useEffect(() => {
    if (isTimerRunning && viewMode === "player") {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, viewMode]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Quick start workout if none loaded
  const handleQuickStart = () => {
    startTransition(async () => {
      const res = await quickStartWorkoutAction();
      if (res.success && res.todaysWorkout) {
        setTodaysWorkout(res.todaysWorkout);
        if (res.todaysWorkout.exercises.length > 0) {
          const firstEx = res.todaysWorkout.exercises[0];
          setCurrentLoad(firstEx.targetLoad);
          setCurrentReps(firstEx.targetReps);
          setCurrentRpe(firstEx.targetRpe || 8);
          setPreferredUnit(firstEx.loadUnit);
        }
        setStatusMessage("Workout started! You are in active training.");
        setTimeout(() => setStatusMessage(""), 3000);
      }
    });
  };

  // Log current set in Player Mode
  const handleLogActiveSet = () => {
    if (!todaysWorkout || todaysWorkout.exercises.length === 0) return;
    const ex = todaysWorkout.exercises[activeExIndex];
    if (!ex) return;

    const shorthand = `${ex.exerciseName.replace(/_/g, " ")} ${currentLoad}${preferredUnit} 1x${currentReps} @ ${currentRpe}`;

    startTransition(async () => {
      const res = await submitShorthandSetAction(shorthand, userOverride);
      setLastResponse(res);

      if (res.success && res.parsed) {
        setArbitrationState(res.arbitration ?? null);
        if (res.coachDirective) {
          setActiveDirective(res.coachDirective);
        }

        // Advance set number or next exercise
        if (currentSetNumber < ex.targetSets) {
          setCurrentSetNumber((prev) => prev + 1);
          setTimerSeconds(0); // start rest timer from 0
          setStatusMessage(`Set ${currentSetNumber} logged! Rest timer active.`);
        } else {
          // Completed all sets for this exercise, advance to next
          if (activeExIndex < todaysWorkout.exercises.length - 1) {
            setActiveExIndex((prev) => prev + 1);
            setStatusMessage(`Completed ${ex.exerciseName}! Moving to next exercise.`);
          } else {
            setStatusMessage("All planned exercises completed! Ready to finish workout.");
          }
        }

        // Refresh recent sets
        const updated = await fetchRecentSetsAction();
        if (updated) setRecentSets(updated as unknown as RecentSetDisplay[]);
        setTimeout(() => setStatusMessage(""), 3500);
      } else {
        setStatusMessage(res.message || "Failed to log set");
        setTimeout(() => setStatusMessage(""), 3500);
      }
    });
  };

  // Adjust Load helper
  const adjustLoad = (delta: number) => {
    setCurrentLoad((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  // Adjust RPE helper
  const adjustRpe = (delta: number) => {
    setCurrentRpe((prev) => Math.min(10, Math.max(5, Math.round((prev + delta) * 10) / 10)));
    setStatusMessage(`RPE adjusted to ${currentRpe + delta}`);
    setTimeout(() => setStatusMessage(""), 2000);
  };

  // Complete workout session
  const handleCompleteSession = () => {
    if (!todaysWorkout) return;
    startTransition(async () => {
      const res = await completeWorkoutSessionAction(todaysWorkout.sessionId);
      if (res.success) {
        setCompletionResult({
          message: res.message,
          adjustments: res.adjustmentsMade || [],
        });
        refreshWorkout();
      }
    });
  };

  // Swap session order
  const handleSwapOrder = () => {
    if (!todaysWorkout || !todaysWorkout.nextSession) return;
    startTransition(async () => {
      const res = await swapSessionOrderAction(
        todaysWorkout.sessionId,
        todaysWorkout.nextSession!.sessionId
      );
      if (res.success) {
        setStatusMessage(res.message);
        setShowOptionsMenu(false);
        setTimeout(() => setStatusMessage(""), 3000);
        refreshWorkout();
      }
    });
  };

  // Skip rest day
  const handleSkipRest = () => {
    if (!todaysWorkout) return;
    startTransition(async () => {
      const res = await skipRestDayAction(todaysWorkout.sessionId);
      if (res.success) {
        setStatusMessage(res.message);
        setShowOptionsMenu(false);
        setTimeout(() => setStatusMessage(""), 3000);
        refreshWorkout();
      }
    });
  };

  // Emergency safety hard stop
  const handleEmergencyHardStop = () => {
    startTransition(async () => {
      const arb = await triggerManualHardStopAction("Emergency Stop Triggered by Athlete");
      setArbitrationState(arb);
      const haltDirective: ExecutionDirective = {
        urgency: "CRITICAL",
        directive_text: "HALT EXERCISE IMMEDIATELY. Unrack safely. Do not continue this movement.",
        word_count: 10,
        audio_cue_text: "Halt exercise immediately. Unrack safely.",
        cue_category: "safety",
        timestamp: new Date().toISOString(),
      };
      setActiveDirective(haltDirective);
      setStatusMessage("🚨 HARD STOP ACTIVATED: Movement halted.");
    });
  };

  // Active guide for player
  const currentPlannedEx =
    todaysWorkout?.exercises?.[activeExIndex] || todaysWorkout?.exercises?.[0];
  const activeExerciseName = currentPlannedEx?.exerciseName || "bench_press";
  const activeExerciseGuide = getExerciseGuide(activeExerciseName);

  // Filtered exercises for routine list
  const exercisesList = (todaysWorkout?.exercises || []).filter((ex) =>
    searchQuery.trim()
      ? ex.exerciseName.toLowerCase().includes(searchQuery.toLowerCase().trim())
      : true
  );

  return (
    <div className="w-full max-w-4xl mx-auto font-sans text-zinc-100 pb-20 select-none">
      {/* Profile & 1RMs Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={refreshWorkout}
      />

      {/* Exercise Animation & Visual Guide Modal */}
      <ExerciseGuideModal
        guide={selectedGuide}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-indigo-500/80 text-indigo-300 text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TOP VIEW SWITCHER: Matches the 3 Screens in Reference Image */}
      <div className="flex items-center justify-between gap-2 mb-4 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setViewMode("dashboard")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === "dashboard"
                ? "bg-[#5850ec] text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("routine")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === "routine"
                ? "bg-[#5850ec] text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Routine</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("player")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === "player"
                ? "bg-[#5850ec] text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Player Mode</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAudioEnabled((prev) => !prev)}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isAudioEnabled
                ? "bg-zinc-900 border-zinc-750 text-indigo-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
            title={isAudioEnabled ? "Audio cues enabled" : "Audio muted"}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="text-xs font-mono px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>1RMs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: WORKOUT ROUTINE & DAYS (Left screen in reference image)        */}
      {/* ========================================================================= */}
      {viewMode === "routine" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Card Container */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header: Back & Title */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode("dashboard")}
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white capitalize">
                {todaysWorkout?.sessionName || "Full Body Workout"}
              </h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 top-11 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-30 text-xs font-mono space-y-1">
                    {todaysWorkout?.nextSession && (
                      <button
                        type="button"
                        onClick={handleSwapOrder}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 flex items-center gap-2"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Swap with Next</span>
                      </button>
                    )}
                    {todaysWorkout?.isRestDay && (
                      <button
                        type="button"
                        onClick={handleSkipRest}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 flex items-center gap-2"
                      >
                        <FastForward className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Skip Rest Day</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCompleteSession}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-950/60 text-emerald-400 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Finish Workout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Date Row */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <span className="font-semibold text-zinc-200">
                Today, {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="text-zinc-600">⌵</span>
            </div>

            {/* Horizontal Day Selector Pills: Day 1 to Day 7 */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                const isActive = activeDay === dayNum;
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setActiveDay(dayNum)}
                    className={`py-3 rounded-2xl flex flex-col items-center justify-center transition cursor-pointer ${
                      isActive
                        ? "bg-[#5850ec] text-white shadow-lg shadow-indigo-600/30 scale-105"
                        : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-tight font-medium opacity-80">
                      Day
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono">
                      {dayNum}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Routine Summary */}
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1">
              <span className="font-bold text-zinc-200">
                {todaysWorkout?.exercises.length || 0} Exercises, ~45 Mins
              </span>
              <span className="text-zinc-500">
                Week {todaysWorkout?.weekNumber || 1} • Overload
              </span>
            </div>

            {/* Exercises List Cards */}
            {todaysWorkout?.isRestDay ? (
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Scheduled Rest &amp; Recovery Day</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Muscular protein synthesis and recovery active.
                </p>
                <button
                  type="button"
                  onClick={handleSkipRest}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Skip Rest &amp; Start Workout
                </button>
              </div>
            ) : exercisesList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
                <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Planned Exercises for Today</h3>
                <p className="text-xs text-zinc-400">
                  Ready to jump into progressive overload training?
                </p>
                <button
                  type="button"
                  onClick={handleQuickStart}
                  className="px-4 py-2.5 rounded-xl bg-[#5850ec] hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  ⚡ Start Training (Skip Setup)
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exercisesList.map((ex, idx) => {
                  const guide = getExerciseGuide(ex.exerciseName);
                  const isCurrent = activeExIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveExIndex(idx);
                        setViewMode("player");
                      }}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition cursor-pointer ${
                        isCurrent
                          ? "bg-zinc-900/90 border-indigo-500/50 shadow-md shadow-indigo-600/10"
                          : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Square Movement Animated Thumbnail */}
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/60 border border-zinc-800 shrink-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={guide.animationUrl}
                            alt={guide.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = guide.thumbnailUrl;
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate capitalize">
                            {guide.name || ex.exerciseName.replace(/_/g, " ")}
                          </h4>
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">
                            {ex.targetSets} sets × {ex.targetReps} reps @ {ex.targetLoad}
                            {ex.loadUnit}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Bottom Full-Width "Start" Button */}
            {!todaysWorkout?.isRestDay && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode("player")}
                  className="w-full py-4 rounded-full bg-[#5850ec] hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Workout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: DASHBOARD & ACTIVITY (Middle screen in reference image)        */}
      {/* ========================================================================= */}
      {viewMode === "dashboard" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header: Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-white">Dashboard</h2>
              <span className="text-xs font-mono text-zinc-500">
                {todaysWorkout?.sessionName || "Active Period"}
              </span>
            </div>

            {/* Rounded Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities or exercises here..."
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-indigo-500 rounded-full pl-11 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Recent Activity: 2 Large Squircle Cards Side-by-Side */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-300">Recent activity</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Amber Squircle: Daily Activity */}
                <div className="p-4 rounded-3xl bg-amber-500 text-zinc-950 space-y-3 shadow-lg shadow-amber-500/20">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <Footprints className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Daily Activity</span>
                    <span className="text-xs font-mono opacity-80">
                      {goals?.todayWalkMinutes || 25}m / 30m
                    </span>
                  </div>
                </div>

                {/* Purple Squircle: Workouts */}
                <div className="p-4 rounded-3xl bg-[#5850ec] text-white space-y-3 shadow-lg shadow-indigo-600/20">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Workouts</span>
                    <span className="text-xs font-mono opacity-80">
                      {recentSets.length} sets logged
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Plans Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Your Plans</span>
                <button
                  type="button"
                  onClick={() => setViewMode("routine")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  View All &gt;
                </button>
              </div>

              {/* Plan Card (Soft Mint/Emerald tint) */}
              <div className="p-4 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {todaysWorkout?.sessionName || "Full Body Workout"}
                    </h4>
                    <p className="text-[11px] text-emerald-400">Lose weight &amp; Keep Fit</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-300 font-bold">20%</span>
                </div>

                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-1/5" />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-0.5">
                  <span>8 Days Left</span>
                  <span>Week {todaysWorkout?.weekNumber || 1} of 4</span>
                </div>
              </div>
            </div>

            {/* Workout Process Section: 3 Side-by-Side Metric Cards */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Workout Process</span>
                <span className="text-xs text-indigo-400 font-semibold cursor-pointer">
                  View All &gt;
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    <Footprints className="w-3 h-3 text-indigo-400" /> Walk
                  </span>
                  <div className="text-xs font-bold text-white">
                    {goals?.todayWalkMinutes || 25} <span className="text-zinc-500">/ 30m</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    <Dumbbell className="w-3 h-3 text-emerald-400" /> Exercise
                  </span>
                  <div className="text-xs font-bold text-white">
                    {recentSets.length} <span className="text-zinc-500">/ 12</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" /> Health
                  </span>
                  <div className="text-xs font-bold text-white truncate">
                    {goals?.todayCalories || 0} <span className="text-zinc-500">/ 1900</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action to open Routine */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewMode("routine")}
                className="w-full py-3.5 rounded-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-bold text-xs font-mono transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>View Full Routine &amp; Exercises</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: ACTIVE WORKOUT PLAYER (Right screen in reference image)        */}
      {/* ========================================================================= */}
      {viewMode === "player" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header: Back & Title */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode("routine")}
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white capitalize">
                {todaysWorkout?.sessionName || "Full Body Workout"}
              </h2>
              <button
                type="button"
                onClick={handleCompleteSession}
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold"
              >
                Finish
              </button>
            </div>

            {/* Center Movement Animation Figure (Big Character Figure) */}
            <div className="relative w-full max-w-sm mx-auto h-64 sm:h-72 rounded-3xl overflow-hidden bg-black/40 border border-zinc-850 flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeExerciseGuide.animationUrl}
                alt={activeExerciseGuide.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = activeExerciseGuide.thumbnailUrl;
                }}
              />

              {/* Muscle badge */}
              <span className="absolute top-3 left-3 text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/70 text-indigo-300 border border-zinc-800">
                {activeExerciseGuide.targetMuscle}
              </span>
            </div>

            {/* Control Panel Sheet */}
            <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-5">
              {/* Row of 5 Circular Icon Buttons: Audio, Video, Pain Alert, Thumbs Up, Thumbs Down */}
              <div className="flex items-center justify-center gap-3">
                {/* 1. Audio toggle */}
                <button
                  type="button"
                  onClick={() => setIsAudioEnabled((prev) => !prev)}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer ${
                    isAudioEnabled
                      ? "bg-zinc-900 border-zinc-750 text-indigo-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-600"
                  }`}
                  title={isAudioEnabled ? "Audio Cues On" : "Audio Muted"}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* 2. Video / Form guide modal */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuide(activeExerciseGuide);
                    setIsGuideOpen(true);
                  }}
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/60 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Watch Form & Technical Cues"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* 3. Pain Alert / Emergency Stop */}
                <button
                  type="button"
                  onClick={handleEmergencyHardStop}
                  className="w-11 h-11 rounded-full bg-red-950/80 border border-red-700/60 hover:border-red-500 flex items-center justify-center text-red-400 hover:text-red-300 transition cursor-pointer"
                  title="Report Acute Pain / Emergency Stop"
                >
                  <AlertOctagon className="w-4 h-4" />
                </button>

                {/* 4. Thumbs Up (Felt Easy) */}
                <button
                  type="button"
                  onClick={() => adjustRpe(-0.5)}
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 flex items-center justify-center text-zinc-300 hover:text-emerald-400 transition cursor-pointer"
                  title="Felt Easy (Lower RPE)"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>

                {/* 5. Thumbs Down (Felt Heavy) */}
                <button
                  type="button"
                  onClick={() => adjustRpe(+0.5)}
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 flex items-center justify-center text-zinc-300 hover:text-amber-400 transition cursor-pointer"
                  title="Felt Heavy (Increase RPE)"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>

              {/* Exercise Counter & Title */}
              <div className="text-center space-y-1">
                <span className="text-xs font-mono text-zinc-400 font-semibold">
                  {activeExIndex + 1}/{todaysWorkout?.exercises.length || 7}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
                  {activeExerciseGuide.name || activeExerciseName.replace(/_/g, " ")}
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Set {currentSetNumber} of {currentPlannedEx?.targetSets || 3} • Target:{" "}
                  {currentLoad}
                  {preferredUnit} × {currentReps} reps @ RPE {currentRpe}
                </p>
              </div>

              {/* Big Digital Stopwatch / Rest Timer: 00:18 */}
              <div className="text-center">
                <div
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white cursor-pointer select-none"
                >
                  {formatTimer(timerSeconds)}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {isTimerRunning ? "⏱️ Running (Tap to pause)" : "⏸️ Paused (Tap to resume)"}
                </span>
              </div>

              {/* Load & Reps Quick Steppers */}
              <div className="flex items-center justify-center gap-2 font-mono text-xs">
                <span className="text-zinc-500">Adjust Load:</span>
                <button
                  type="button"
                  onClick={() => adjustLoad(-5)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustLoad(-2.5)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                >
                  -2.5
                </button>
                <span className="font-bold text-white px-1">
                  {currentLoad}
                  {preferredUnit}
                </span>
                <button
                  type="button"
                  onClick={() => adjustLoad(+2.5)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-400"
                >
                  +2.5
                </button>
                <button
                  type="button"
                  onClick={() => adjustLoad(+5)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-400"
                >
                  +5
                </button>
              </div>

              {/* Main Rounded Purple Action Button: Pause / Complete Set */}
              <button
                type="button"
                onClick={handleLogActiveSet}
                disabled={isPending}
                className="w-full py-4 rounded-full bg-[#5850ec] hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <span>Logging Set...</span>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Complete Set &amp; Rest</span>
                  </>
                )}
              </button>

              {/* Bottom Navigation: < Previous & Skip > */}
              <div className="flex items-center justify-between pt-1 text-xs font-mono text-zinc-400">
                <button
                  type="button"
                  onClick={() => setActiveExIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeExIndex === 0}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 text-zinc-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveExIndex((prev) =>
                      Math.min((todaysWorkout?.exercises.length || 1) - 1, prev + 1)
                    )
                  }
                  disabled={
                    !todaysWorkout || activeExIndex >= todaysWorkout.exercises.length - 1
                  }
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 text-zinc-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Skip</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autoregulation Progression Completion Modal */}
      {completionResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-sm bg-zinc-950 border border-emerald-500/60 rounded-3xl p-5 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Trophy className="w-5 h-5" />
                <span className="text-sm uppercase tracking-wider">Workout Completed</span>
              </div>
              <button
                type="button"
                onClick={() => setCompletionResult(null)}
                className="p-1 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">{completionResult.message}</p>

            {completionResult.adjustments.length > 0 ? (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">
                  Progressive Overload Applied:
                </span>
                {completionResult.adjustments.map((adj, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-zinc-200 capitalize block">
                        {adj.exerciseName.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Avg RPE: {adj.avgRpe} • {adj.reason}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black ${
                        adj.loadDelta > 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {adj.loadDelta > 0 ? `+${adj.loadDelta}` : adj.loadDelta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                All prescribed targets consolidated. Ready for the next block.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCompletionResult(null);
                setViewMode("dashboard");
              }}
              className="w-full py-3 rounded-full bg-[#5850ec] text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

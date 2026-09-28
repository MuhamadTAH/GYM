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
  Trash2,
  Loader2,
  Wand2,
  Edit2,
  Star,
  MessageSquare,
  Lightbulb,
  BookOpen,
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
  getScheduledWorkoutDatesAction,
  generateWorkoutWithAIAction,
  addExerciseToWorkoutAction,
  updateWorkoutExerciseAction,
  deleteWorkoutExerciseAction,
  searchExerciseCatalogAction,
  type LoggedSetResponse,
  type TodaysWorkoutView,
  type AutoregulationAdjustment,
  type DailyGoalsData,
} from "@/app/actions";
import type { ArbitrationResult } from "@/lib/arbitration";
import type { ExecutionDirective } from "@/lib/coach";
import type { PlannedExercise } from "@/lib/planner";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { AudioCuePlayer, useAudioCue } from "./audio-cue";
import { ProfileModal } from "./profile-modal";
import { ExerciseGuideModal } from "./exercise-guide-modal";
import { WorkoutDebriefModal } from "./workout-debrief-modal";
import { ExerciseGuideEditModal } from "./exercise-guide-edit-modal";
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
  const getTodayIso = () => new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkoutView | null>(null);
  const [goals, setGoals] = useState<DailyGoalsData | null>(null);
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
  const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);
  const [editingGuideExerciseIndex, setEditingGuideExerciseIndex] = useState<number | null>(null);
  const [expandedGuideIndices, setExpandedGuideIndices] = useState<number[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<ExerciseGuide | null>(null);
  const [completionResult, setCompletionResult] = useState<{
    message: string;
    adjustments: AutoregulationAdjustment[];
  } | null>(null);

  // AI Workout Builder State
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [aiWorkoutPrompt, setAiWorkoutPrompt] = useState("");
  const [isGeneratingAiWorkout, setIsGeneratingAiWorkout] = useState(false);

  // Exercise Catalog Modal State
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState("all");
  const [catalogResults, setCatalogResults] = useState<CatalogExercise[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  // Edit Exercise State
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editExerciseSets, setEditExerciseSets] = useState(3);
  const [editExerciseReps, setEditExerciseReps] = useState(10);
  const [editExerciseLoad, setEditExerciseLoad] = useState(20);
  const [editExerciseRest, setEditExerciseRest] = useState(60);
  const [editExerciseNotes, setEditExerciseNotes] = useState("");

  const { speakDirective } = useAudioCue(activeDirective, isAudioEnabled);

  // Calculate the 7 days of the week based on weekOffset (Monday through Sunday)
  const getWeekDays = (offsetWeeks: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday + offsetWeeks * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const isToday = dateStr === getTodayIso();
      days.push({
        dateStr,
        dayName,
        dayNum,
        isToday,
      });
    }
    return days;
  };

  // Switch active calendar date and load its workout
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysFromMonday);
    const chosenDate = new Date(dateStr + "T00:00:00");
    const diffDays = Math.floor((chosenDate.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24));
    const targetOffset = Math.floor(diffDays / 7);
    if (targetOffset !== weekOffset) {
      setWeekOffset(targetOffset);
    }

    setStatusMessage(`Loading workout for ${dateStr}...`);
    getTodaysWorkoutAction(dateStr)
      .then((tw) => {
        if (tw) {
          setTodaysWorkout(tw);
          setActiveExIndex(0);
          setStatusMessage("");
          if (tw.exercises.length > 0) {
            const firstEx = tw.exercises[0];
            setCurrentLoad(firstEx.targetLoad);
            setCurrentReps(firstEx.targetReps);
            setCurrentRpe(firstEx.targetRpe || 8);
            setPreferredUnit(firstEx.loadUnit);
          }
        }
      })
      .catch(() => {
        setStatusMessage("Could not load workout for date.");
        setTimeout(() => setStatusMessage(""), 3000);
      });
  };

  // Load workout & metrics (with offline phone caching)
  const refreshWorkout = (targetDate?: string) => {
    const dateToLoad = targetDate || selectedDate;
    getTodaysWorkoutAction(dateToLoad)
      .then((tw) => {
        if (tw) {
          setTodaysWorkout(tw);
          if (dateToLoad === getTodayIso()) {
            try {
              localStorage.setItem("gym_cached_workout", JSON.stringify(tw));
            } catch {}
          }
          if (tw.exercises.length > 0) {
            const firstEx = tw.exercises[activeExIndex] || tw.exercises[0];
            setCurrentLoad(firstEx.targetLoad);
            setCurrentReps(firstEx.targetReps);
            setCurrentRpe(firstEx.targetRpe || 8);
            setPreferredUnit(firstEx.loadUnit);
          }
        }
      })
      .catch(() => {
        // Fallback to local storage when phone has no internet
        try {
          const cached = localStorage.getItem("gym_cached_workout");
          if (cached) {
            const tw = JSON.parse(cached);
            setTodaysWorkout(tw);
          }
        } catch {}
      });

    getScheduledWorkoutDatesAction()
      .then((dates) => {
        if (Array.isArray(dates)) {
          setScheduledDates(dates);
        }
      })
      .catch(() => {});

    getDailyGoalsAction()
      .then((g) => {
        if (g) {
          setGoals(g);
          try {
            localStorage.setItem("gym_cached_goals", JSON.stringify(g));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem("gym_cached_goals");
          if (cached) setGoals(JSON.parse(cached));
        } catch {}
      });

    fetchRecentSetsAction()
      .then((sets) => {
        if (sets && sets.length > 0) {
          setRecentSets(sets as unknown as RecentSetDisplay[]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Instant offline hydration from local cache
    try {
      const cachedW = localStorage.getItem("gym_cached_workout");
      if (cachedW) setTodaysWorkout(JSON.parse(cachedW));
      const cachedG = localStorage.getItem("gym_cached_goals");
      if (cachedG) setGoals(JSON.parse(cachedG));
    } catch {}

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

  // Generate workout using AI / catalog fallback
  const handleGenerateAiWorkout = (promptOverride?: string) => {
    const promptToUse = promptOverride || aiWorkoutPrompt;
    setIsGeneratingAiWorkout(true);
    setStatusMessage(`✨ AI Coach is designing routine for ${selectedDate}...`);

    startTransition(async () => {
      try {
        const res = await generateWorkoutWithAIAction({
          prompt: promptToUse,
          date: selectedDate,
        });
        if (res.success) {
          setStatusMessage(`✨ Generated: ${res.plan.sessionName}`);
          setTodaysWorkout(res.todaysWorkout);
          setActiveExIndex(0);
          setIsAiBuilderOpen(false);
          setAiWorkoutPrompt("");
          refreshWorkout(selectedDate);
        } else {
          setStatusMessage("Could not generate routine. Please try again.");
        }
      } catch (err) {
        setStatusMessage("Error generating workout routine.");
      } finally {
        setIsGeneratingAiWorkout(false);
        setTimeout(() => setStatusMessage(""), 4000);
      }
    });
  };

  // Delete exercise from selected date's routine
  const handleDeleteExercise = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await deleteWorkoutExerciseAction(idx, selectedDate);
      if (res.success) {
        setStatusMessage(res.message);
        setTodaysWorkout(res.todaysWorkout);
        if (activeExIndex >= res.todaysWorkout.exercises.length) {
          setActiveExIndex(Math.max(0, res.todaysWorkout.exercises.length - 1));
        }
        refreshWorkout(selectedDate);
        setTimeout(() => setStatusMessage(""), 3000);
      }
    });
  };

  // Open edit exercise modal
  const handleOpenEditExercise = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!todaysWorkout || !todaysWorkout.exercises[idx]) return;
    const ex = todaysWorkout.exercises[idx];
    setEditingExerciseIndex(idx);
    setEditExerciseName(ex.exerciseName);
    setEditExerciseSets(ex.targetSets);
    setEditExerciseReps(ex.targetReps);
    setEditExerciseLoad(ex.targetLoad);
    setEditExerciseRest(ex.restSeconds || 60);
    setEditExerciseNotes(ex.notes || "");
  };

  // Save updated exercise (checks catalog or preserves custom name)
  const handleSaveEditExercise = () => {
    if (editingExerciseIndex === null) return;
    startTransition(async () => {
      const res = await updateWorkoutExerciseAction({
        exerciseIndex: editingExerciseIndex,
        exerciseName: editExerciseName,
        targetSets: editExerciseSets,
        targetReps: editExerciseReps,
        targetLoad: editExerciseLoad,
        loadUnit: preferredUnit,
        restSeconds: editExerciseRest,
        notes: editExerciseNotes,
        date: selectedDate,
      });

      if (res.success) {
        setStatusMessage(res.message);
        setTodaysWorkout(res.todaysWorkout);
        setEditingExerciseIndex(null);
        refreshWorkout(selectedDate);
        setTimeout(() => setStatusMessage(""), 3500);
      } else {
        setStatusMessage(res.message || "Failed to update exercise");
      }
    });
  };

  // Search 876-exercise catalog from GitHub
  const handleSearchCatalog = (query: string, muscle?: string) => {
    setCatalogSearchQuery(query);
    const m = (muscle !== undefined ? muscle : selectedMuscleFilter) === "all" ? undefined : (muscle || selectedMuscleFilter);
    setIsSearchingCatalog(true);
    searchExerciseCatalogAction(query, { muscle: m, limit: 30 }).then((results) => {
      setCatalogResults(results);
      setIsSearchingCatalog(false);
    });
  };

  // Add exercise from catalog into selected date's workout
  const handleAddExerciseFromCatalog = (exName: string) => {
    startTransition(async () => {
      const res = await addExerciseToWorkoutAction({
        exerciseName: exName,
        loadUnit: preferredUnit,
        date: selectedDate,
      });
      if (res.success) {
        setStatusMessage(res.message);
        setTodaysWorkout(res.todaysWorkout);
        setIsAddExerciseOpen(false);
        refreshWorkout(selectedDate);
        setTimeout(() => setStatusMessage(""), 3000);
      }
    });
  };

  // Initial load of catalog when modal opens
  useEffect(() => {
    if (isAddExerciseOpen && catalogResults.length === 0) {
      setIsSearchingCatalog(true);
      searchExerciseCatalogAction("", { limit: 30 }).then((res) => {
        setCatalogResults(res);
        setIsSearchingCatalog(false);
      });
    }
  }, [isAddExerciseOpen]);

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

      {/* Post-Workout Debrief & Rating Modal */}
      <WorkoutDebriefModal
        isOpen={isDebriefModalOpen}
        onClose={() => setIsDebriefModalOpen(false)}
        sessionName={todaysWorkout?.sessionName}
        targetDate={selectedDate}
        existingRating={todaysWorkout?.athleteRating}
        existingRpe={todaysWorkout?.sessionRpe}
        existingEnergy={todaysWorkout?.energyLevel as any}
        existingSoreness={todaysWorkout?.muscleSoreness as any}
        existingDebrief={todaysWorkout?.athleteDebrief}
        existingCoachFeedback={todaysWorkout?.coachFeedback}
        onSubmitted={(tw) => {
          setTodaysWorkout(tw);
          setStatusMessage("Workout report submitted!");
          setTimeout(() => setStatusMessage(""), 3500);
        }}
      />

      {/* Exercise Benefits & How-To Guide Editor Modal */}
      {editingGuideExerciseIndex !== null && todaysWorkout?.exercises?.[editingGuideExerciseIndex] && (
        <ExerciseGuideEditModal
          isOpen={editingGuideExerciseIndex !== null}
          onClose={() => setEditingGuideExerciseIndex(null)}
          exerciseIndex={editingGuideExerciseIndex}
          exerciseName={todaysWorkout.exercises[editingGuideExerciseIndex].exerciseName}
          targetDate={selectedDate}
          initialBenefits={todaysWorkout.exercises[editingGuideExerciseIndex].benefits}
          initialInstructions={todaysWorkout.exercises[editingGuideExerciseIndex].instructions}
          onSaved={(tw) => {
            setTodaysWorkout(tw);
            setStatusMessage("Updated exercise benefits & guide!");
            setTimeout(() => setStatusMessage(""), 3500);
          }}
        />
      )}

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
            {/* Header: Back, Title & Workout Debrief Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode("dashboard")}
                  className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white capitalize truncate">
                  {todaysWorkout?.sessionName || "Full Body Workout"}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDebriefModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Submit post-workout reflection report and get AI coach feedback"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {todaysWorkout?.athleteRating ? `Report: ${todaysWorkout.athleteRating}⭐` : "Workout Report"}
                  </span>
                </button>

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
            </div>

            {/* Athlete Post-Workout Debrief Summary Banner */}
            {todaysWorkout?.athleteRating && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/40 border border-amber-500/30 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Session Rating: {todaysWorkout.athleteRating}/5 • RPE {todaysWorkout.sessionRpe || 8}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDebriefModalOpen(true)}
                    className="text-[10px] text-amber-300 hover:underline cursor-pointer"
                  >
                    Edit Debrief &gt;
                  </button>
                </div>
                {todaysWorkout.coachFeedback && (
                  <p className="text-zinc-300 font-sans text-xs italic leading-relaxed">
                    "{todaysWorkout.coachFeedback}"
                  </p>
                )}
              </div>
            )}

            {/* Calendar Week Navigation & Date Header */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
                  title="Previous Week"
                  aria-label="Previous Week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
                  title="Next Week"
                  aria-label="Next Week"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {selectedDate !== getTodayIso() && (
                  <button
                    type="button"
                    onClick={() => {
                      setWeekOffset(0);
                      handleSelectDate(getTodayIso());
                    }}
                    className="ml-1 px-2 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 hover:text-white text-[11px] font-mono font-semibold transition cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Selected Date display + native datepicker */}
              <div className="flex items-center gap-1.5 relative">
                <label
                  htmlFor="workout-date-picker"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:border-zinc-700 transition cursor-pointer font-mono text-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold text-zinc-200">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {selectedDate === getTodayIso() && (
                    <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/30">
                      Today
                    </span>
                  )}
                </label>
                <input
                  id="workout-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) handleSelectDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer w-full"
                />
              </div>
            </div>

            {/* Horizontal Dynamic Date Selector Pills (Mon 28, Tue 29, etc.) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {getWeekDays(weekOffset).map((day) => {
                const isSelected = selectedDate === day.dateStr;
                const hasWorkout = scheduledDates.includes(day.dateStr);

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => handleSelectDate(day.dateStr)}
                    className={`relative py-2.5 sm:py-3 rounded-2xl flex flex-col items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? "bg-[#5850ec] text-white shadow-lg shadow-indigo-600/30 scale-105"
                        : "bg-zinc-900/70 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono tracking-tight font-medium ${
                        isSelected ? "text-indigo-100" : day.isToday ? "text-indigo-400 font-bold" : "text-zinc-400"
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono">
                      {day.dayNum}
                    </span>
                    {/* Indicator dot if workout exists for this date */}
                    {hasWorkout && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-indigo-400 animate-pulse"
                        }`}
                        title="Workout scheduled"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* AI Workout Builder Section */}
            <div className="rounded-3xl p-4 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4 fill-indigo-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      AI Workout Builder
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                        876 Catalog
                      </span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Let AI program your workout or tap a split
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAiBuilderOpen(!isAiBuilderOpen)}
                  className="text-xs font-bold text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/60 hover:bg-indigo-800/80 transition cursor-pointer flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3 text-indigo-400" />
                  <span>{isAiBuilderOpen ? "Close" : "✨ Program"}</span>
                </button>
              </div>

              {/* Quick 1-Tap Preset Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {[
                  { label: "🔥 Push", prompt: "Push day chest, shoulders and triceps" },
                  { label: "⚡ Pull", prompt: "Pull day lats, upper back and biceps" },
                  { label: "🦵 Legs", prompt: "Heavy quad and hamstring leg workout" },
                  { label: "🌟 Full Body", prompt: "Full body athletic hypertrophy 45m" },
                  { label: "💪 Arms & Delts", prompt: "Arm and shoulder hypertrophy focus" },
                  { label: "🎯 Core & Abs", prompt: "Core stability, obliques and abs burner" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isGeneratingAiWorkout}
                    onClick={() => handleGenerateAiWorkout(preset.prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-indigo-900/50 border border-zinc-800 hover:border-indigo-500/50 text-zinc-300 hover:text-white transition disabled:opacity-50 cursor-pointer text-[11px] font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Expanded Custom AI Prompt Form */}
              {isAiBuilderOpen && (
                <div className="pt-2 space-y-2.5 border-t border-zinc-800/80 animate-in fade-in duration-150">
                  <div className="relative">
                    <input
                      type="text"
                      value={aiWorkoutPrompt}
                      onChange={(e) => setAiWorkoutPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isGeneratingAiWorkout) {
                          handleGenerateAiWorkout();
                        }
                      }}
                      placeholder="e.g. 40 min dumbbell chest and arms, or squat & core focus..."
                      className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-indigo-500 rounded-2xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      Target Date:{" "}
                      <span className="text-zinc-200 font-semibold">
                        {selectedDate === getTodayIso()
                          ? `Today (${selectedDate})`
                          : selectedDate}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={isGeneratingAiWorkout}
                      onClick={() => handleGenerateAiWorkout()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingAiWorkout ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Routine</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Routine Summary with Add Exercise Action */}
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1">
              <div>
                <span className="font-bold text-zinc-200">
                  {todaysWorkout?.exercises.length || 0} Exercises, ~45 Mins
                </span>
                <span className="text-zinc-500 ml-2">
                  Week {todaysWorkout?.weekNumber || 1} • Overload
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Exercise</span>
              </button>
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                >
                  Skip Rest &amp; Start Workout
                </button>
              </div>
            ) : exercisesList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-4">
                <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">
                  No Planned Exercises for{" "}
                  {selectedDate === getTodayIso()
                    ? "Today"
                    : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Choose a split, have the AI program your session, or browse 876 exercises.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateAiWorkout("Full body workout")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      ✨ AI Generate Routine (
                      {selectedDate === getTodayIso()
                        ? "Today"
                        : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                      )
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddExerciseOpen(true)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Browse 876 Exercises</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickStart}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium text-xs cursor-pointer"
                  >
                    ⚡ Quick Start (Skip Setup)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exercisesList.map((ex, idx) => {
                  const guide = getExerciseGuide(ex.exerciseName);
                  const isCurrent = activeExIndex === idx;
                  const isGuideExpanded = expandedGuideIndices.includes(idx);

                  return (
                    <div
                      key={idx}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition ${
                        isCurrent
                          ? "bg-zinc-900/90 border-indigo-500/50 shadow-md shadow-indigo-600/10"
                          : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        onClick={() => {
                          setActiveExIndex(idx);
                          setViewMode("player");
                        }}
                        className="flex items-center justify-between gap-3 cursor-pointer"
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

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditExercise(idx, e)}
                            title="Edit exercise targets"
                            className="p-2 rounded-xl text-zinc-500 hover:text-indigo-400 hover:bg-indigo-950/40 transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteExercise(idx, e)}
                            title="Remove exercise"
                            className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
                        </div>
                      </div>

                      {/* Benefits & How-To (Why and How) Section */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGuideIndices((prev) =>
                              prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                            );
                          }}
                          className="font-mono text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition cursor-pointer font-semibold"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>
                            {isGuideExpanded ? "Hide Benefits & How-To" : "💡 Why & How To Do It"}
                          </span>
                          {(ex.benefits || (ex.instructions && ex.instructions.length > 0)) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGuideExerciseIndex(idx);
                          }}
                          className="font-mono text-[10px] text-zinc-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 transition cursor-pointer"
                          title="Write or edit benefits and execution steps"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Why/How</span>
                        </button>
                      </div>

                      {isGuideExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2.5 text-xs font-sans animate-in fade-in duration-150">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
                              Why do this workout (Benefits):
                            </span>
                            <p className="text-zinc-300 text-xs leading-relaxed">
                              {ex.benefits || guide.instructions || "Target compound hypertrophy, mechanical tension, and neurological strength adaptation."}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
                              How to do it (Execution Instructions):
                            </span>
                            {ex.instructions && ex.instructions.length > 0 ? (
                              <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-xs font-mono">
                                {ex.instructions.map((step, sIdx) => (
                                  <li key={sIdx} className="leading-snug">{step}</li>
                                ))}
                              </ol>
                            ) : guide.coachingCues && guide.coachingCues.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-zinc-300 text-xs font-mono">
                                {guide.coachingCues.map((cue, cIdx) => (
                                  <li key={cIdx} className="leading-snug">{cue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-zinc-500 italic text-xs">
                                Tap "Edit Why/How" to add step-by-step instructions.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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

      {/* Exercise Catalog Modal (876 Exercises from GitHub) */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Exercise Catalog</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">876 Exercises from GitHub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Muscle Group Filters */}
            <div className="p-4 space-y-3 border-b border-zinc-800/60 bg-zinc-900/40">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={catalogSearchQuery}
                  onChange={(e) => handleSearchCatalog(e.target.value)}
                  placeholder="Search 876 exercises by name, muscle, equipment..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition shadow-inner"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  { id: "all", label: "All" },
                  { id: "chest", label: "Chest" },
                  { id: "middle back", label: "Back" },
                  { id: "quadriceps", label: "Quads" },
                  { id: "hamstrings", label: "Hamstrings" },
                  { id: "biceps", label: "Biceps" },
                  { id: "triceps", label: "Triceps" },
                  { id: "shoulders", label: "Shoulders" },
                  { id: "abdominals", label: "Abs & Core" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMuscleFilter(m.id);
                      handleSearchCatalog(catalogSearchQuery, m.id);
                    }}
                    className={`shrink-0 px-2.5 py-1 rounded-lg font-mono transition cursor-pointer ${
                      selectedMuscleFilter === m.id
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Results List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {isSearchingCatalog ? (
                <div className="py-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-xs font-mono">Searching catalog...</span>
                </div>
              ) : catalogResults.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <p className="text-xs">No exercises found matching your search.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogSearchQuery("");
                      setSelectedMuscleFilter("all");
                      handleSearchCatalog("", "all");
                    }}
                    className="text-xs text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                catalogResults.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white capitalize truncate">{ex.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                        {ex.primaryMuscles?.[0] && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 capitalize">
                            {ex.primaryMuscles[0]}
                          </span>
                        )}
                        {ex.equipment && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 capitalize">
                            {ex.equipment}
                          </span>
                        )}
                        {ex.level && (
                          <span className="text-zinc-500 capitalize">{ex.level}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddExerciseFromCatalog(ex.name)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExerciseIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Exercise</h3>
                  <p className="text-[11px] font-mono text-zinc-400">Update training parameters & targets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingExerciseIndex(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={editExerciseName}
                  onChange={(e) => setEditExerciseName(e.target.value)}
                  placeholder="e.g. Incline Dumbbell Press, Bench Press, Custom..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition shadow-inner font-medium"
                />
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  Standardizes to catalog package if matched, otherwise writes custom name.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Target Sets
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editExerciseSets}
                    onChange={(e) => setEditExerciseSets(Number(e.target.value) || 1)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Target Reps
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editExerciseReps}
                    onChange={(e) => setEditExerciseReps(Number(e.target.value) || 1)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Target Load ({preferredUnit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={editExerciseLoad}
                    onChange={(e) => setEditExerciseLoad(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Rest Seconds
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={5}
                    value={editExerciseRest}
                    onChange={(e) => setEditExerciseRest(Number(e.target.value) || 60)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Coaching Notes
                  </label>
                  <input
                    type="text"
                    value={editExerciseNotes}
                    onChange={(e) => setEditExerciseNotes(e.target.value)}
                    placeholder="e.g. Focus on tempo, pause at bottom"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingExerciseIndex(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !editExerciseName.trim()}
                onClick={handleSaveEditExercise}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

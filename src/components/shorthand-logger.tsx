"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  Plus,
  Minus,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Play,
  Calendar,
  Dumbbell,
  ArrowLeftRight,
  FastForward,
  User,
  Sparkles,
  Trophy,
  X,
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
  type LoggedSetResponse,
  type TodaysWorkoutView,
  type AutoregulationAdjustment,
} from "@/app/actions";
import type { ArbitrationResult } from "@/lib/arbitration";
import type { ExecutionDirective } from "@/lib/coach";
import type { PlannedExercise } from "@/lib/planner";
import { AudioCuePlayer, useAudioCue } from "./audio-cue";
import { ProfileModal } from "./profile-modal";

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
  const [input, setInput] = useState("");
  const [activeExercise, setActiveExercise] = useState("bench_press");
  const [currentLoad, setCurrentLoad] = useState<number>(0);
  const [preferredUnit, setPreferredUnit] = useState<"kg" | "lb">("kg");
  const [userOverride, setUserOverride] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkoutView | null>(null);
  const [lastResponse, setLastResponse] = useState<LoggedSetResponse | null>(null);
  const [activeDirective, setActiveDirective] = useState<ExecutionDirective | null>(null);
  const [arbitrationState, setArbitrationState] = useState<ArbitrationResult | null>(null);
  const [recentSets, setRecentSets] = useState<RecentSetDisplay[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Profile Modal & Session Completion State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [completionResult, setCompletionResult] = useState<{
    message: string;
    adjustments: AutoregulationAdjustment[];
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const { speakDirective } = useAudioCue(activeDirective, isAudioEnabled);

  // Reload today's workout
  const refreshWorkout = () => {
    getTodaysWorkoutAction().then((tw) => {
      if (tw) {
        setTodaysWorkout(tw);
        if (tw.exercises.length > 0) {
          const firstEx = tw.exercises[0];
          setActiveExercise(firstEx.exerciseName);
          setCurrentLoad(firstEx.targetLoad);
          setPreferredUnit(firstEx.loadUnit);
        }
      }
    });
  };

  // Quick Start Training immediately (Skip Setup)
  const handleQuickStart = () => {
    startTransition(async () => {
      const res = await quickStartWorkoutAction();
      if (res.success && res.todaysWorkout) {
        setTodaysWorkout(res.todaysWorkout);
        if (res.todaysWorkout.exercises.length > 0) {
          const firstEx = res.todaysWorkout.exercises[0];
          setActiveExercise(firstEx.exerciseName);
          setCurrentLoad(firstEx.targetLoad);
          setPreferredUnit(firstEx.loadUnit);
        }
        setStatusMessage("Workout loaded! You are actively in training.");
        setTimeout(() => setStatusMessage(""), 3500);
      }
    });
  };

  // Load today's workout and recent sets on mount
  useEffect(() => {
    fetchRecentSetsAction().then((sets) => {
      if (sets && sets.length > 0) {
        setRecentSets(sets as unknown as RecentSetDisplay[]);
        setActiveExercise(sets[0].exerciseName);
        setCurrentLoad(sets[0].loadValue);
        setPreferredUnit(sets[0].loadUnit as "kg" | "lb");
      }
    });

    refreshWorkout();
  }, []);

  // Handler to pre-populate shorthand input with next prescribed set
  const handleStartNextSet = (ex: PlannedExercise) => {
    setActiveExercise(ex.exerciseName);
    setCurrentLoad(ex.targetLoad);
    setPreferredUnit(ex.loadUnit);
    setInput(
      `${ex.exerciseName.replace(/_/g, " ")} ${ex.targetLoad}${ex.loadUnit} 1x${ex.targetReps} @ ${ex.targetRpe}`
    );
    inputRef.current?.focus();
  };

  // Quick adjust load
  const adjustLoad = (delta: number) => {
    const next = Math.max(0, Math.round((currentLoad + delta) * 10) / 10);
    setCurrentLoad(next);
    setInput((prev) => {
      if (!prev) {
        return `${activeExercise.replace(/_/g, " ")} ${next}${preferredUnit} 1x5 rpe8`;
      }
      return prev.replace(/\b\d+(\.\d+)?(kg|lb)?\b/i, `${next}${preferredUnit}`);
    });
    inputRef.current?.focus();
  };

  // Submit shorthand set
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isPending) return;

    startTransition(async () => {
      const res = await submitShorthandSetAction(input, userOverride);
      setLastResponse(res);

      if (res.success && res.parsed) {
        setActiveExercise(res.parsed.exercise_name);
        setCurrentLoad(res.parsed.load_value);
        setPreferredUnit(res.parsed.load_unit);
        setArbitrationState(res.arbitration ?? null);

        if (res.coachDirective) {
          setActiveDirective(res.coachDirective);
        }

        setInput(""); // auto-clear on success
        inputRef.current?.focus();

        // Refresh recent sets
        const updatedSets = await fetchRecentSetsAction();
        setRecentSets(updatedSets as unknown as RecentSetDisplay[]);
      } else if (res.arbitration) {
        setArbitrationState(res.arbitration);
      }
    });
  };

  // Complete session & trigger progressive overload once
  const handleCompleteSession = () => {
    if (!todaysWorkout) return;
    startTransition(async () => {
      const res = await completeWorkoutSessionAction(todaysWorkout.sessionId);
      if (res.success) {
        setCompletionResult({
          message: res.message,
          adjustments: res.adjustmentsMade,
        });
        refreshWorkout();
      }
    });
  };

  // Day Swapping: Swap order with next session
  const handleSwapOrder = () => {
    if (!todaysWorkout || !todaysWorkout.nextSession) return;
    startTransition(async () => {
      const res = await swapSessionOrderAction(
        todaysWorkout.sessionId,
        todaysWorkout.nextSession!.sessionId
      );
      if (res.success) {
        setStatusMessage(res.message);
        setTimeout(() => setStatusMessage(""), 3000);
        refreshWorkout();
      }
    });
  };

  // Skip rest day and activate next workout
  const handleSkipRest = () => {
    if (!todaysWorkout) return;
    startTransition(async () => {
      const res = await skipRestDayAction(todaysWorkout.sessionId);
      if (res.success) {
        setStatusMessage(res.message);
        setTimeout(() => setStatusMessage(""), 3000);
        refreshWorkout();
      }
    });
  };

  // Trigger manual Hard Stop
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
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-2 sm:p-4 pb-20 select-none">
      {/* Profile & 1RMs Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={refreshWorkout}
      />

      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">
            Gym HUD • Live Gym Floor
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={() => setIsAudioEnabled((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition ${
              isAudioEnabled
                ? "bg-zinc-800 border-zinc-700 text-emerald-400 hover:text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400"
            }`}
            title={isAudioEnabled ? "Mute audio cues" : "Unmute audio cues"}
          >
            {isAudioEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Athlete Profile / 1RMs Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1 transition cursor-pointer"
          >
            <User className="w-3 h-3 text-emerald-400" />
            1RMs
          </button>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {preferredUnit.toUpperCase()}
          </span>

          {userOverride && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              OVERRIDE
            </span>
          )}
        </div>
      </header>

      {/* STATUS BANNER */}
      {statusMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs font-mono text-center font-bold">
          {statusMessage}
        </div>
      )}

      {/* 2-COLUMN RESPONSIVE LAPTOP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* LEFT COLUMN: Prescribed Session, Active Movement, Shorthand Form & Sets (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* TODAY'S PRESCRIBED SESSION CARD */}
          {todaysWorkout && (
            <section className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-mono font-black uppercase tracking-wider text-zinc-300">
                    Today&apos;s Prescribed Session
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold uppercase">
                  {todaysWorkout.sessionName}
                </span>
              </div>

              {/* REST DAY CARD */}
              {todaysWorkout.isRestDay ? (
                <div className="mt-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3 font-mono">
                  <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Scheduled Rest & Recovery Day</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Muscular recovery and glycogen resynthesis are active.
                    {todaysWorkout.nextSession && (
                      <span className="block mt-1 text-zinc-300">
                        Next up: <strong>{todaysWorkout.nextSession.sessionName}</strong> ({todaysWorkout.nextSession.exerciseCount} exercises)
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleSkipRest}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition"
                  >
                    <FastForward className="w-4 h-4" />
                    Skip Rest & Start Next Workout
                  </button>
                </div>
              ) : todaysWorkout.exercises.length === 0 ? (
                <div className="mt-3 p-5 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3 font-mono">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Ready to Start Training?</span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    No forms or boxes to fill out. Jump straight into training with adaptive baseline weights that auto-adjust to your performance.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleQuickStart}
                      disabled={isPending}
                      className="py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Training Now (Skip Setup)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen(true)}
                      className="py-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-bold transition cursor-pointer"
                    >
                      Custom 1RM Setup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Controls bar: Swap order & Finish workout */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 font-mono">
                    {todaysWorkout.nextSession ? (
                      <button
                        type="button"
                        onClick={handleSwapOrder}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded-lg flex items-center gap-1.5 transition"
                        title={`Swap order with: ${todaysWorkout.nextSession.sessionName}`}
                      >
                        <ArrowLeftRight className="w-3 h-3 text-indigo-400" />
                        <span>Swap with Next: {todaysWorkout.nextSession.sessionName.slice(0, 16)}...</span>
                      </button>
                    ) : <div />}

                    <button
                      type="button"
                      onClick={handleCompleteSession}
                      className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Finish Workout
                    </button>
                  </div>

                  {/* Exercises List */}
                  <div className="mt-3 space-y-2">
                    {todaysWorkout.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-zinc-200 capitalize block">
                            {ex.exerciseName.replace(/_/g, " ")}
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            Target: <strong className="text-white">{ex.targetLoad}{ex.loadUnit}</strong> • {ex.targetSets} sets × {ex.targetReps} reps @ RPE {ex.targetRpe}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartNextSet(ex)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ACTIVE MOVEMENT CARD */}
          <section className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>CURRENT MOVEMENT</span>
              <span className="text-emerald-400 font-bold uppercase">Ready</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <h2 className="text-2xl font-black tracking-tight text-white capitalize">
                {activeExercise.replace(/_/g, " ")}
              </h2>
              <div className="text-xl font-mono font-bold text-zinc-200">
                {currentLoad} <span className="text-sm text-zinc-400">{preferredUnit}</span>
              </div>
            </div>

            {/* Previous Set Reference */}
            {recentSets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Last Set:</span>
                <span className="text-zinc-300">
                  Set #{recentSets[0].setNumber}: {recentSets[0].loadValue}
                  {recentSets[0].loadUnit} × {recentSets[0].reps} reps
                  {recentSets[0].loggedRpe ? ` @ RPE ${recentSets[0].loggedRpe}` : ""}
                </span>
              </div>
            )}
          </section>

          {/* QUICK-ACTION INCREMENT BUTTONS */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => adjustLoad(-5)}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-mono font-bold text-sm border border-zinc-800 flex items-center justify-center gap-0.5 transition cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-zinc-500" />5
            </button>
            <button
              type="button"
              onClick={() => adjustLoad(-2.5)}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-mono font-bold text-sm border border-zinc-800 flex items-center justify-center gap-0.5 transition cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-zinc-500" />2.5
            </button>
            <button
              type="button"
              onClick={() => adjustLoad(+2.5)}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-emerald-400 font-mono font-bold text-sm border border-zinc-800 flex items-center justify-center gap-0.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />2.5
            </button>
            <button
              type="button"
              onClick={() => adjustLoad(+5)}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-emerald-400 font-mono font-bold text-sm border border-zinc-800 flex items-center justify-center gap-0.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />5
            </button>
          </div>

          {/* SHORTHAND INPUT FORM */}
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-mono">
              <label htmlFor="shorthand-input" className="uppercase tracking-wider font-bold text-zinc-300">
                Shorthand Telemetry Log
              </label>
              <span className="text-zinc-500 text-[11px]">e.g. sq 140 5,5,5 @ 8.5</span>
            </div>
            <div className="relative">
              <input
                id="shorthand-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="bench 100kg 3x5 rpe8"
                className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-white font-mono text-base placeholder:text-zinc-600 shadow-inner"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-mono font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Log
              </button>
            </div>
          </form>

          {/* RECENT SETS FEED */}
          <section className="pt-2">
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2 font-bold">
              Recent Logged Sets
            </h3>
            {recentSets.length === 0 ? (
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                No sets logged yet today. Use the shorthand bar above to log your working weights.
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentSets.slice(0, 6).map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-[11px]">
                        #{set.setNumber}
                      </span>
                      <span className="font-bold text-zinc-200 capitalize">
                        {set.exerciseName.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">
                        {set.loadValue}
                        {set.loadUnit} × {set.reps}
                      </span>
                      {set.loggedRpe && (
                        <span className="text-zinc-500 text-[11px]">@{set.loggedRpe}</span>
                      )}
                      {set.hasAcutePain && (
                        <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-bold">
                          PAIN
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: AI Coaching Directive, Layer 0 Alerts & Safety (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* LAYER 0 ARBITRATION ALERT BANNER */}
          {arbitrationState && arbitrationState.hard_stop_active && (
            <div className="p-4 rounded-xl bg-red-950/90 border-2 border-red-600 text-red-100 animate-bounce">
              <div className="flex items-center gap-3">
                <AlertOctagon className="w-8 h-8 text-red-400 shrink-0" />
                <div>
                  <div className="text-sm font-black tracking-wide uppercase text-red-200">
                    Layer 0 Hard Stop Abort
                  </div>
                  <p className="text-xs font-medium text-red-300 mt-1">
                    {arbitrationState.abort_reason || "Acute pain flag forces immediate exercise abort."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {arbitrationState &&
            !arbitrationState.hard_stop_active &&
            arbitrationState.arbitration_decision === "DOWN_REGULATE" && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500 text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Layer 0 Down-Regulator Active
                    </span>
                    <p className="text-xs text-amber-200/90 mt-0.5">
                      {arbitrationState.action_summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* EXECUTION COACH DIRECTIVE CARD */}
          {activeDirective ? (
            <section className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-zinc-900 border border-indigo-500/40 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-900/60 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span className="font-bold uppercase tracking-wider">Coach Execution Cue</span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {activeDirective.word_count} words • {activeDirective.urgency}
                </span>
              </div>

              <div className="mt-2.5 text-sm font-medium text-zinc-100 leading-snug">
                &ldquo;{activeDirective.directive_text}&rdquo;
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-indigo-900/40">
                <span className="text-[11px] text-indigo-300 font-mono">
                  Category: {activeDirective.cue_category}
                </span>

                <AudioCuePlayer
                  directive={activeDirective}
                  isEnabled={isAudioEnabled}
                />
              </div>
            </section>
          ) : (
            <section className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Coach Audio Intercom</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Live auditory cues and sub-30-word execution directives will stream here as working sets are recorded.
              </p>
            </section>
          )}

          {/* HUMAN OVERRIDE TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-200 font-mono">Human Override Mandate</span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Subjective biofeedback overrides AI load cuts
              </span>
            </div>
            <button
              type="button"
              onClick={() => setUserOverride((prev) => !prev)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                userOverride ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  userOverride ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* QUICK TELEMETRY SYNTAX GUIDE */}
          <section className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 font-mono text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Shorthand Telemetry Syntax</span>
            </div>
            <div className="space-y-1 text-[11px] text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-300 font-bold">bench 100kg 3x5 rpe8</span>
                <span className="text-zinc-500">Standard sets</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-300 font-bold">sq 140 5,5,5 @ 8.5</span>
                <span className="text-zinc-500">Cluster reps</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-300 font-bold">dl 180 1x5 pain:knee sharp 7</span>
                <span className="text-zinc-500">Pain telemetry</span>
              </div>
            </div>
          </section>

          {/* BIG RED SAFETY BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleEmergencyHardStop}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:from-red-700 active:to-red-800 text-white font-black text-xs sm:text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 active:scale-[0.98] transition border border-red-500/30 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              REPORT PAIN / EMERGENCY HARD STOP
            </button>
          </div>
        </div>
      </div>

      {/* AUTOREGULATION PROGRESSION COMPLETION MODAL */}
      {completionResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-sm bg-zinc-900 border border-emerald-500/60 rounded-2xl p-5 shadow-2xl space-y-3">
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
                    className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between"
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
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                All prescribed targets consolidated. Ready for the next block.
              </div>
            )}

            <button
              type="button"
              onClick={() => setCompletionResult(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition"
            >
              Continue to Next Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

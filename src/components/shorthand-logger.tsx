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
} from "lucide-react";
import {
  submitShorthandSetAction,
  triggerManualHardStopAction,
  fetchRecentSetsAction,
  type LoggedSetResponse,
} from "@/app/actions";
import type { ArbitrationResult } from "@/lib/arbitration";
import type { ExecutionDirective } from "@/lib/coach";
import { AudioCuePlayer, useAudioCue } from "./audio-cue";

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
  const [currentLoad, setCurrentLoad] = useState<number>(100);
  const [preferredUnit, setPreferredUnit] = useState<"kg" | "lb">("kg");
  const [userOverride, setUserOverride] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const [lastResponse, setLastResponse] = useState<LoggedSetResponse | null>(null);
  const [activeDirective, setActiveDirective] = useState<ExecutionDirective | null>(null);
  const [arbitrationState, setArbitrationState] = useState<ArbitrationResult | null>(null);
  const [recentSets, setRecentSets] = useState<RecentSetDisplay[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const { speakDirective } = useAudioCue(activeDirective, isAudioEnabled);

  // Load recent sets on mount
  useEffect(() => {
    fetchRecentSetsAction().then((sets) => {
      if (sets && sets.length > 0) {
        setRecentSets(sets as unknown as RecentSetDisplay[]);
        setActiveExercise(sets[0].exerciseName);
        setCurrentLoad(sets[0].loadValue);
        setPreferredUnit(sets[0].loadUnit as "kg" | "lb");
      }
    });
  }, []);

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

  // One-tap Manual Hard Stop (Big Red Button)
  const handleEmergencyHardStop = () => {
    startTransition(async () => {
      const arb = await triggerManualHardStopAction("Emergency Gym Floor Manual Stop");
      setArbitrationState(arb);
      const emergencyDirective: ExecutionDirective = {
        urgency: "CRITICAL",
        directive_text: "HALT EXERCISE IMMEDIATELY. Unrack safely. Do not continue this movement.",
        word_count: 10,
        audio_cue_text: "HALT EXERCISE IMMEDIATELY. Unrack safely. Do not continue this movement.",
        cue_category: "safety",
        timestamp: new Date().toISOString(),
      };
      setActiveDirective(emergencyDirective);
      setLastResponse({
        success: false,
        message: "EMERGENCY HARD STOP ACTIVATED. Session paused. Do not lift.",
        arbitration: arb,
        coachDirective: emergencyDirective,
      });
    });
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 pb-20 select-none">
      {/* Audio Dispatcher */}
      <AudioCuePlayer directive={activeDirective} isEnabled={isAudioEnabled} />

      {/* Top Telemetry Header */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">
            Gym HUD • Telemetry Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAudioEnabled((prev) => !prev)}
            aria-label={isAudioEnabled ? "Mute audio cues" : "Unmute audio cues"}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-mono ${
              isAudioEnabled
                ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            {isAudioEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold">Audio ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold">Mute</span>
              </>
            )}
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

      {/* LAYER 0 ARBITRATION ALERT BANNER */}
      {arbitrationState && arbitrationState.hard_stop_active && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/90 border-2 border-red-600 text-red-100 animate-bounce">
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
          <div className="mt-4 p-3 rounded-xl bg-amber-950/80 border border-amber-500 text-amber-200">
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

      {/* ACTIVE EXERCISE CARD */}
      <section className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
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
      <div className="mt-4 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => adjustLoad(-5)}
          className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 text-zinc-300 font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
        >
          <Minus className="w-3.5 h-3.5" /> 5
        </button>
        <button
          type="button"
          onClick={() => adjustLoad(-2.5)}
          className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 text-zinc-300 font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
        >
          <Minus className="w-3.5 h-3.5" /> 2.5
        </button>
        <button
          type="button"
          onClick={() => adjustLoad(2.5)}
          className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 text-emerald-400 font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" /> 2.5
        </button>
        <button
          type="button"
          onClick={() => adjustLoad(5)}
          className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 text-emerald-400 font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" /> 5
        </button>
      </div>

      {/* LARGE SHORTHAND INPUT FIELD */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <label className="text-xs font-mono text-zinc-400 flex items-center justify-between">
          <span>SHORTHAND TELEMETRY LOG</span>
          <span className="text-[10px] text-zinc-500">e.g. sq 140 5,5,5 @ 8.5</span>
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="bench 100kg 3x5 rpe8"
            autoFocus
            disabled={isPending}
            className="w-full text-lg font-mono font-bold bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-2xl px-4 py-4 text-white placeholder-zinc-600 outline-none transition shadow-inner"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-zinc-950 font-black text-sm tracking-wide uppercase transition flex items-center gap-1.5 shadow-lg"
          >
            <Zap className="w-4 h-4 fill-current" />
            Log
          </button>
        </div>
      </form>

      {/* SUB-30-WORD ACTIVE COACHING DIRECTIVE CARD */}
      {activeDirective && (
        <section
          className={`mt-4 p-4 rounded-2xl border transition-all shadow-lg ${
            activeDirective.urgency === "CRITICAL"
              ? "bg-red-950/80 border-red-500 text-red-100"
              : activeDirective.urgency === "ADAPT"
              ? "bg-amber-950/70 border-amber-500 text-amber-100"
              : "bg-zinc-900/95 border-emerald-500/70 text-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-4 h-4 animate-pulse ${
                  activeDirective.urgency === "CRITICAL"
                    ? "text-red-400"
                    : activeDirective.urgency === "ADAPT"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              />
              <span className="text-[11px] font-mono font-black uppercase tracking-wider">
                Execution Directive • {activeDirective.urgency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                {activeDirective.word_count} words
              </span>
              <button
                type="button"
                onClick={() => speakDirective(activeDirective)}
                title="Speak directive"
                className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm font-mono font-bold leading-relaxed">
            {activeDirective.directive_text}
          </p>
        </section>
      )}

      {/* FEEDBACK STATUS MESSAGE */}
      {lastResponse && (
        <div
          className={`mt-3 p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
            lastResponse.success
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-red-950/60 border-red-800 text-red-300"
          }`}
        >
          {lastResponse.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertOctagon className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{lastResponse.message}</span>
          {lastResponse.oneRepMax && (
            <span className="ml-auto font-bold text-zinc-200">
              e1RM: {lastResponse.oneRepMax}
              {preferredUnit}
            </span>
          )}
        </div>
      )}

      {/* HUMAN OVERRIDE TOGGLE */}
      <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-200">Human Override Mandate</span>
          <span className="text-[11px] text-zinc-500">
            Subjective biofeedback overrides AI load cuts
          </span>
        </div>
        <button
          type="button"
          onClick={() => setUserOverride((prev) => !prev)}
          className={`w-12 h-6 rounded-full transition-colors relative ${
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

      {/* RECENT SETS FEED */}
      <section className="mt-5 flex-1">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
          Session Set Feed
        </h3>
        {recentSets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center text-xs text-zinc-500 font-mono">
            No sets logged in current session. Enter shorthand above.
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentSets.slice(0, 5).map((set) => (
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

      {/* BIG RED SAFETY BUTTON */}
      <footer className="mt-6 pt-4 border-t border-zinc-900">
        <button
          type="button"
          onClick={handleEmergencyHardStop}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 active:from-red-700 active:to-red-800 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 active:scale-[0.98] transition border border-red-500/30"
        >
          <ShieldAlert className="w-5 h-5" />
          REPORT PAIN / EMERGENCY HARD STOP
        </button>
      </footer>
    </div>
  );
}

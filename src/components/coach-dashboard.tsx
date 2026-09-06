"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  Apple,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { sendCoachMessageAction, type CoachActionResult, getUserProfileAction, getTodaysWorkoutAction } from "@/app/actions";

interface ChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
  badge?: {
    type: string;
    summary: string;
    color: "emerald" | "amber" | "red" | "indigo" | "zinc";
  };
}

export function CoachDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [athleteName, setAthleteName] = useState("Athlete");
  const [activeSessionName, setActiveSessionName] = useState("Loading session...");
  const [isHardStop, setIsHardStop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize coach dashboard with live state
  useEffect(() => {
    Promise.all([getUserProfileAction(), getTodaysWorkoutAction()]).then(
      ([profile, workout]) => {
        if (profile) setAthleteName(profile.name);
        if (workout) {
          setActiveSessionName(workout.sessionName);
          setIsHardStop(workout.status === "aborted");
        }

        // Add initial greeting from coach
        setMessages([
          {
            id: "welcome",
            sender: "coach",
            text: `Welcome back, ${profile?.name || "Athlete"}. I am your dedicated Autoregulated S&C Coach. I have full real-time access to your 1RMs, active mesocycle (${workout?.sessionName}), and nutrition targets. Ask me anything, or type shorthand commands to log sets.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            badge: {
              type: "COACH_ADVICE",
              summary: "Connected to gym.db • Layer 0 Active",
              color: "emerald",
            },
          },
        ]);
      }
    );
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsgId = crypto.randomUUID();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text,
        timestamp: now,
      },
    ]);

    if (!textToSend) setInputText("");
    setLoading(true);

    try {
      const res: CoachActionResult = await sendCoachMessageAction(text, true);

      // Check if session status updated
      if (res.currentWorkout) {
        setActiveSessionName(res.currentWorkout.sessionName);
        setIsHardStop(res.currentWorkout.status === "aborted");
      }

      const coachMsgId = crypto.randomUUID();
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setMessages((prev) => [
        ...prev,
        {
          id: coachMsgId,
          sender: "coach",
          text: res.replyText,
          timestamp: replyTime,
          badge: res.actionReceipt
            ? {
                type: res.actionReceipt.type,
                summary: res.actionReceipt.summary,
                color: res.actionReceipt.badgeColor,
              }
            : undefined,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "coach",
          text: `Error connecting to engine: ${err.message || "Failed to process request."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          badge: {
            type: "ERROR",
            summary: "Execution error",
            color: "red",
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: "📋 Today's Workout", prompt: "What is my workout today?" },
    { label: "📊 Show 1RMs", prompt: "Show my 1RMs and strength baselines" },
    { label: "🥩 Cutting Macros", prompt: "What are my daily macros for a cut?" },
    { label: "🔄 Swap Session", prompt: "Swap today's workout with next session" },
    { label: "🚨 Pain Alert", prompt: "I have sharp knee pain during squat!" },
  ];

  const getBadgeClass = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
      case "amber":
        return "bg-amber-950/80 text-amber-400 border-amber-800/60";
      case "red":
        return "bg-red-950/80 text-red-400 border-red-800/60";
      case "indigo":
        return "bg-indigo-950/80 text-indigo-400 border-indigo-800/60";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-135px)] max-h-[820px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl mt-3">
      {/* 1. Live Telemetry & Status Header */}
      <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black font-mono tracking-wider text-zinc-100">
                AI S&C COACH INTERCOM
              </h2>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px]">
              {activeSessionName}
            </p>
          </div>
        </div>

        {/* Layer 0 Safety Indicator */}
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5 ${
            isHardStop
              ? "bg-red-950/80 text-red-400 border-red-700 animate-pulse"
              : "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
          }`}
        >
          {isHardStop ? (
            <>
              <ShieldAlert className="w-3 h-3" />
              HARD-STOP ACTIVE
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              LAYER 0 SAFE
            </>
          )}
        </div>
      </div>

      {/* 2. Quick Action Chips */}
      <div className="px-3 py-2 bg-zinc-900/40 border-b border-zinc-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={loading}
            className="text-[11px] font-mono whitespace-nowrap px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 border border-zinc-800 transition cursor-pointer disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 3. Interactive Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 font-mono text-xs">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isUser ? (
                  <>
                    <span className="text-[10px] text-zinc-500">{m.timestamp}</span>
                    <span className="text-[10px] font-bold text-emerald-400">{athleteName}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> COACH
                    </span>
                    <span className="text-[10px] text-zinc-500">{m.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-emerald-600 text-white font-sans font-medium rounded-tr-none"
                    : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 font-mono rounded-tl-none"
                }`}
              >
                {m.text}

                {/* Structured Action Receipt Badge */}
                {m.badge && (
                  <div
                    className={`mt-2.5 pt-2 border-t text-[10px] font-bold flex items-center gap-1.5 ${getBadgeClass(
                      m.badge.color
                    )} px-2 py-1 rounded-md border`}
                  >
                    <span>[{m.badge.type}]</span>
                    <span className="truncate">{m.badge.summary}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" /> COACH
              </span>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 text-zinc-400 rounded-xl px-4 py-2.5 text-xs rounded-tl-none flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-zinc-500 ml-1">Analyzing telemetry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Input Bar */}
      <div className="p-3 bg-zinc-900/80 border-t border-zinc-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask coach anything or type 'sq 140 5x5 rpe8'..."
            disabled={loading}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold p-2 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] font-mono text-zinc-500 text-center mt-1.5">
          Type freeform questions or shorthand sets • Direct sync with gym.db
        </p>
      </div>
    </div>
  );
}

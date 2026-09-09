"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell, BarChart3, User, Bot, Target } from "lucide-react";
import { ShorthandLogger } from "@/components/shorthand-logger";
import { GoalsDashboard } from "@/components/goals-dashboard";
import { CommandCenter } from "@/components/command-center";
import { CoachDashboard } from "@/components/coach-dashboard";
import { ProfileModal } from "@/components/profile-modal";
import { getUserProfileAction } from "@/app/actions";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"hud" | "goals" | "command_center" | "coach">("hud");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState("Athlete");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load user profile on mount
  useEffect(() => {
    getUserProfileAction().then((p) => {
      if (p) {
        setUserName(p.name);
      }
    });
  }, []);

  const handleProfileSaved = () => {
    getUserProfileAction().then((p) => {
      if (p) setUserName(p.name);
    });
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col items-center">
      {/* Global Profile & Baseline 1RMs Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={handleProfileSaved}
      />

      {/* Top App Bar - Responsive for Laptop and Mobile */}
      <header className="w-full max-w-6xl sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-emerald-400">
              GYM COACH • AUTOREGULATED
            </span>
          </div>

          <div className="sm:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="text-[11px] font-mono px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center gap-1.5 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{userName}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 sm:flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-[10px] sm:text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("hud")}
            className={`py-2 px-2 sm:px-5 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
              activeTab === "hud"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>HUD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`py-2 px-2 sm:px-5 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
              activeTab === "goals"
                ? "bg-amber-400 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Goals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("command_center")}
            className={`py-2 px-2 sm:px-5 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
              activeTab === "command_center"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("coach")}
            className={`py-2 px-2 sm:px-5 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer ${
              activeTab === "coach"
                ? "bg-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Coach</span>
          </button>
        </div>

        {/* Desktop Profile / 1RMs button */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center gap-2 transition cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{userName} / 1RMs</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content View - Responsive Width */}
      <div key={refreshKey} className="w-full max-w-6xl flex-1 px-3 sm:px-6 py-4">
        {activeTab === "hud" && <ShorthandLogger />}
        {activeTab === "goals" && <GoalsDashboard />}
        {activeTab === "command_center" && <CommandCenter />}
        {activeTab === "coach" && <CoachDashboard />}
      </div>
    </main>
  );
}

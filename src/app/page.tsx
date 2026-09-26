"use client";

import React, { useState, useEffect } from "react";
import { Flame, Dumbbell, BarChart3, User, Bot, Target } from "lucide-react";
import { CaloriesDashboard } from "@/components/calories-dashboard";
import { ShorthandLogger } from "@/components/shorthand-logger";
import { GoalsDashboard } from "@/components/goals-dashboard";
import { CommandCenter } from "@/components/command-center";
import { CoachDashboard } from "@/components/coach-dashboard";
import { ProfileModal } from "@/components/profile-modal";
import { ActiveDayBriefing } from "@/components/active-day-briefing";
import { getUserProfileAction } from "@/app/actions";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"cal" | "workout" | "goals" | "command_center" | "coach">("cal");
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

  const navItems = [
    { id: "cal" as const, label: "Nutrition", icon: Flame },
    { id: "workout" as const, label: "Workout", icon: Dumbbell },
    { id: "goals" as const, label: "Targets", icon: Target },
    { id: "command_center" as const, label: "Program", icon: BarChart3 },
    { id: "coach" as const, label: "Coach", icon: Bot },
  ];

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col items-center">
      {/* Global Profile & Baseline 1RMs Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={handleProfileSaved}
      />

      {/* Top App Bar - Clean, unified gym design system */}
      <header className="w-full max-w-5xl sticky top-0 z-40 bg-black/90 backdrop-blur-md px-3 sm:px-6 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs sm:text-sm font-bold font-mono tracking-wider text-zinc-100">
            GYM COACH
          </span>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1.5 px-2.5 sm:px-3.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-[11px] sm:text-xs ${
                  isActive
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className={isActive ? "inline" : "hidden sm:inline"}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Button */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="Profile & Baseline 1RMs"
        >
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline font-semibold">{userName}</span>
        </button>
      </header>

      {/* Main Tab Content View */}
      <div key={refreshKey} className="w-full max-w-5xl flex-1 px-3 sm:px-6 py-4">
        {/* Compact Daily Morning Briefing Banner */}
        <ActiveDayBriefing
          onNavigateToHud={() => setActiveTab("workout")}
          onNavigateToGoals={() => setActiveTab("cal")}
        />

        {activeTab === "cal" && <CaloriesDashboard />}
        {activeTab === "workout" && <ShorthandLogger />}
        {activeTab === "goals" && <GoalsDashboard />}
        {activeTab === "command_center" && <CommandCenter />}
        {activeTab === "coach" && <CoachDashboard />}
      </div>
    </main>
  );
}

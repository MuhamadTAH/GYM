"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell, BarChart3, User } from "lucide-react";
import { ShorthandLogger } from "@/components/shorthand-logger";
import { CommandCenter } from "@/components/command-center";
import { ProfileModal } from "@/components/profile-modal";
import { getUserProfileAction } from "@/app/actions";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"hud" | "command_center">("hud");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState("Athlete");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load user profile on mount
  useEffect(() => {
    getUserProfileAction().then((p) => {
      if (p) {
        setUserName(p.name);
        if (p.isUnconfigured) {
          setIsProfileOpen(true);
        }
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
    <main className="min-h-screen bg-black flex flex-col items-center">
      {/* Global Profile & Baseline 1RMs Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={handleProfileSaved}
      />

      {/* Top Floating App Bar */}
      <div className="w-full max-w-md sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black font-mono tracking-wider text-emerald-400">
            GYM COACH • AUTOREGULATED
          </span>
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center gap-1.5 transition cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{userName} / 1RMs</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("hud")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === "hud"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Gym HUD
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("command_center")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === "command_center"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Command Center
          </button>
        </div>
      </div>

      {/* Tab Content View */}
      <div key={refreshKey} className="w-full max-w-md flex-1">
        {activeTab === "hud" ? <ShorthandLogger /> : <CommandCenter />}
      </div>
    </main>
  );
}

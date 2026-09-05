"use client";

import React, { useState } from "react";
import { Dumbbell, BarChart3 } from "lucide-react";
import { ShorthandLogger } from "@/components/shorthand-logger";
import { CommandCenter } from "@/components/command-center";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"hud" | "command_center">("hud");

  return (
    <main className="min-h-screen bg-black flex flex-col items-center">
      {/* Top Floating App Tab Navigation */}
      <div className="w-full max-w-md sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md px-4 pt-3 pb-2 border-b border-zinc-800">
        <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("hud")}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
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
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
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
      <div className="w-full max-w-md flex-1">
        {activeTab === "hud" ? <ShorthandLogger /> : <CommandCenter />}
      </div>
    </main>
  );
}

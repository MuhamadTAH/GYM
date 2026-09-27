"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, Info, X } from "lucide-react";

export function PWAOfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    // 1. Initial online/offline status
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => {
        setIsOffline(false);
        setShowReconnected(true);
        const timer = setTimeout(() => setShowReconnected(false), 3500);
        return () => clearTimeout(timer);
      };

      const handleOffline = () => {
        setIsOffline(true);
        setShowReconnected(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // 2. Register Service Worker for offline PWA functionality
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Check for updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    // New content available
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[PWA] Service worker registration failed:", err);
          });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return (
    <>
      {children}

      {/* Floating Offline Notification Pill */}
      {isOffline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top-3 duration-200">
          <div className="p-3 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5 font-sans">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block text-white truncate">
                  Offline Mode Active
                </span>
                <span className="text-[11px] text-amber-300/80 block truncate">
                  Workout &amp; 876 catalog exercises ready
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="p-1.5 rounded-lg hover:bg-amber-900/60 text-amber-300 transition"
                title="Offline info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Offline Info Drawer */}
          {isDetailsOpen && (
            <div className="mt-2 p-3.5 rounded-2xl bg-zinc-950/95 border border-zinc-800 text-xs text-zinc-300 shadow-2xl space-y-2 backdrop-blur-md animate-in fade-in">
              <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-zinc-800">
                <span>📱 Phone Offline Support</span>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                You can continue your workout uninterrupted without internet:
              </p>
              <ul className="text-[11px] space-y-1 text-zinc-300 list-disc pl-4">
                <li>Active workout routines and sets load from local storage.</li>
                <li>Rest stopwatch and interval timers function with audio cues.</li>
                <li>All 876 exercises from the GitHub package are stored on device.</li>
                <li>Any completed exercises will sync once connection returns.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reconnected Toast */}
      {showReconnected && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in slide-in-from-top-3 fade-out duration-300">
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 shadow-2xl backdrop-blur-md flex items-center gap-2.5 font-sans">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block text-white">Back Online</span>
              <span className="text-[11px] text-emerald-300/80 block">
                Connected • Cloud synchronization active
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

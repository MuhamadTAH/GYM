"use client";

import { useEffect, useCallback } from "react";
import type { ExecutionDirective } from "@/lib/coach";

interface AudioCueProps {
  directive: ExecutionDirective | null;
  isEnabled: boolean;
}

export function useAudioCue(directive: ExecutionDirective | null, isEnabled: boolean) {
  const speakDirective = useCallback(
    (cue: ExecutionDirective) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const text = cue.audio_cue_text || cue.directive_text;
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";

      if (cue.urgency === "CRITICAL") {
        utterance.rate = 1.15;
        utterance.pitch = 1.2;
      } else {
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
      }

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  useEffect(() => {
    if (isEnabled && directive) {
      speakDirective(directive);
    }
  }, [directive, isEnabled, speakDirective]);

  return { speakDirective };
}

export function AudioCuePlayer({ directive, isEnabled }: AudioCueProps) {
  useAudioCue(directive, isEnabled);
  return null;
}

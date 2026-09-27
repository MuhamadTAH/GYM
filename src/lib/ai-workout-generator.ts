import type { MovementPattern, PreferredUnit } from "../schemas/fitness";
import type { PlannedExercise } from "./planner";
import {
  searchExerciseCatalog,
  findCatalogExercise,
  mapExerciseToMovementPattern,
  type CatalogExercise,
} from "./exercise-catalog";

export interface AIWorkoutPlan {
  sessionName: string;
  sessionType: string;
  focus: string;
  estimatedMinutes: number;
  rationale: string;
  exercises: PlannedExercise[];
  source: "gemini" | "catalog_engine";
}

export interface AIWorkoutGeneratorOptions {
  prompt?: string;
  preferredUnit?: PreferredUnit;
  targetMinutes?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced";
  baselineLifts?: {
    squatKg?: number;
    benchKg?: number;
    deadliftKg?: number;
    overheadPressKg?: number;
  };
}

const SYSTEM_PROMPT = `
You are an elite Strength & Conditioning coach and Exercise Physiologist.
Your task is to generate a personalized, science-based workout routine for the athlete based on their request.

Rules:
1. Select 4 to 6 exercises that match the athlete's requested focus (e.g., Push, Pull, Legs, Full Body, Upper, Arms, Core, Dumbbells, etc.).
2. Prefer standard exercises (e.g., Barbell Bench Press, Incline Dumbbell Press, Barbell Squat, Romanian Deadlift, Pull-ups, Barbell Row, Overhead Press, Bicep Curls, Lateral Raises, Tricep Pushdowns).
3. Assign realistic target loads, sets (3-4 sets), reps (6-15 reps), RPE (7.0 - 8.5), and rest periods (60 - 120 seconds).
4. Assign the physiological movement pattern for each exercise from:
   ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "quad_dominant", "hip_hinge", "isolation", "carry_core"].

Output Schema: Return ONLY a valid JSON object strictly matching this schema with no markdown code fences:
{
  "sessionName": "Upper Body Hypertrophy Blast",
  "sessionType": "upper",
  "focus": "Chest, Back & Shoulders",
  "estimatedMinutes": 45,
  "rationale": "High-yield compound press and row supersets followed by lateral deltoid isolation.",
  "exercises": [
    {
      "exerciseName": "Barbell Bench Press",
      "movementPattern": "horizontal_push",
      "targetLoad": 60,
      "loadUnit": "kg",
      "targetSets": 4,
      "targetReps": 8,
      "targetRpe": 8,
      "restSeconds": 90,
      "notes": "2-second eccentric control, explosive press"
    }
  ]
}
`.trim();

/**
 * Deterministic fallback workout generator using the 876-exercise catalog.
 * Guarantees a science-backed, balanced routine even when offline or without Gemini API key.
 */
export function generateFallbackWorkoutPlan(
  options?: AIWorkoutGeneratorOptions
): AIWorkoutPlan {
  const prompt = (options?.prompt || "").trim().toLowerCase();
  const unit: PreferredUnit = options?.preferredUnit || "kg";
  const targetMins = options?.targetMinutes || 45;

  let sessionName = "Custom AI Workout";
  let sessionType = "custom";
  let focus = "Full Body Training";
  let queryTerms: string[] = [];

  // Determine workout split & focus from user prompt
  if (
    prompt.includes("push") ||
    prompt.includes("chest") ||
    prompt.includes("tricep") ||
    prompt.includes("pec")
  ) {
    sessionName = "AI Push Power & Hypertrophy";
    sessionType = "push";
    focus = "Chest, Shoulders & Triceps";
    queryTerms = ["bench press", "incline dumbbell", "overhead press", "lateral raise", "tricep pushdown"];
  } else if (
    prompt.includes("pull") ||
    prompt.includes("back") ||
    prompt.includes("bicep") ||
    prompt.includes("lat")
  ) {
    sessionName = "AI Pull & Posterior Chain";
    sessionType = "pull";
    focus = "Lats, Upper Back & Biceps";
    queryTerms = ["pull-up", "barbell row", "lat pulldown", "face pull", "bicep curl"];
  } else if (
    prompt.includes("leg") ||
    prompt.includes("quad") ||
    prompt.includes("hamstring") ||
    prompt.includes("squat") ||
    prompt.includes("glute") ||
    prompt.includes("calv")
  ) {
    sessionName = "AI Lower Body & Leg Drive";
    sessionType = "legs";
    focus = "Quadriceps, Hamstrings & Calves";
    queryTerms = ["barbell squat", "romanian deadlift", "leg press", "leg curl", "calf raise"];
  } else if (
    prompt.includes("arm") ||
    prompt.includes("bicep") ||
    prompt.includes("tricep") ||
    prompt.includes("shoulder")
  ) {
    sessionName = "AI Arms & Shoulder Sculpt";
    sessionType = "upper";
    focus = "Biceps, Triceps & Lateral Delts";
    queryTerms = ["overhead press", "dumbbell curl", "skull crusher", "lateral raise", "hammer curl"];
  } else if (
    prompt.includes("core") ||
    prompt.includes("ab") ||
    prompt.includes("belly")
  ) {
    sessionName = "AI Core Strength & Stability";
    sessionType = "core";
    focus = "Abdominals & Core Stability";
    queryTerms = ["plank", "crunch", "hanging leg raise", "russian twist", "ab wheel"];
  } else if (
    prompt.includes("upper")
  ) {
    sessionName = "AI Upper Body Focus";
    sessionType = "upper";
    focus = "Chest, Back & Deltoids";
    queryTerms = ["bench press", "bent over row", "overhead press", "pull-up", "bicep curl"];
  } else if (
    prompt.includes("lower")
  ) {
    sessionName = "AI Lower Body Foundation";
    sessionType = "lower";
    focus = "Quads, Glutes & Hamstrings";
    queryTerms = ["squat", "deadlift", "lunge", "leg extension", "calf raise"];
  } else {
    // Default: Comprehensive Full Body
    sessionName = "AI Full Body Athleticism";
    sessionType = "full_body";
    focus = "Total Body Balance & Conditioning";
    queryTerms = ["squat", "bench press", "barbell row", "overhead press", "romanian deadlift"];
  }

  // Check if dumbbells or specific equipment was requested
  const isDumbbell = prompt.includes("dumbbell");

  const exercises: PlannedExercise[] = [];

  for (const term of queryTerms) {
    let matches = searchExerciseCatalog(term, {
      equipment: isDumbbell ? "dumbbell" : undefined,
      limit: 5,
    });

    if (matches.length === 0) {
      matches = searchExerciseCatalog(term, { limit: 5 });
    }

    const ex: CatalogExercise | undefined = matches[0];
    const exName = ex ? ex.name : term.replace(/\b\w/g, (c) => c.toUpperCase());
    const movement = ex ? mapExerciseToMovementPattern(ex) : "isolation";

    // Set targets based on movement pattern
    let targetLoad = unit === "lb" ? 45 : 20;
    let targetSets = 3;
    let targetReps = 10;
    let restSecs = 60;
    let rpe = 8.0;

    if (movement === "quad_dominant" || movement === "hip_hinge") {
      targetLoad = unit === "lb" ? 135 : 60;
      targetSets = 4;
      targetReps = 6;
      restSecs = 90;
      rpe = 8.0;
    } else if (movement === "horizontal_push" || movement === "horizontal_pull") {
      targetLoad = unit === "lb" ? 95 : 40;
      targetSets = 4;
      targetReps = 8;
      restSecs = 90;
      rpe = 8.0;
    } else if (movement === "vertical_push" || movement === "vertical_pull") {
      targetLoad = unit === "lb" ? 75 : 30;
      targetSets = 3;
      targetReps = 8;
      restSecs = 75;
      rpe = 8.0;
    } else if (movement === "carry_core") {
      targetLoad = 0;
      targetSets = 3;
      targetReps = 15;
      restSecs = 45;
      rpe = 7.5;
    }

    exercises.push({
      exerciseName: exName,
      movementPattern: movement,
      targetLoad,
      loadUnit: unit,
      targetSets,
      targetReps,
      targetRpe: rpe,
      restSeconds: restSecs,
      notes: ex?.instructions?.[0] ? ex.instructions[0].slice(0, 80) : undefined,
    });
  }

  return {
    sessionName,
    sessionType,
    focus,
    estimatedMinutes: targetMins,
    rationale: `Programmed for ${focus} using high-recruitment compound foundations and progressive overload.`,
    exercises,
    source: "catalog_engine",
  };
}

/**
 * Generates an AI-driven workout routine using Gemini AI (when API key is present)
 * with graceful fallback to the 876-exercise catalog engine.
 */
export async function generateWorkoutWithAI(
  options?: AIWorkoutGeneratorOptions
): Promise<AIWorkoutPlan> {
  const prompt = options?.prompt?.trim() || "";
  const unit: PreferredUnit = options?.preferredUnit || "kg";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const userText = `
Athlete's Workout Request: "${prompt || "Balanced strength and hypertrophy training"}"
Preferred Units: ${unit}
Target Duration: ${options?.targetMinutes || 45} minutes
Fitness Level: ${options?.fitnessLevel || "intermediate"}
      `.trim();

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userText}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
            const exercises: PlannedExercise[] = parsed.exercises.map(
              (ex: any) => {
                const catalogMatch = findCatalogExercise(ex.exerciseName);
                const movement: MovementPattern =
                  ex.movementPattern ||
                  (catalogMatch
                    ? mapExerciseToMovementPattern(catalogMatch)
                    : "isolation");

                return {
                  exerciseName: ex.exerciseName || "Exercise",
                  movementPattern: movement,
                  targetLoad: Math.max(0, Number(ex.targetLoad) || 0),
                  loadUnit: ex.loadUnit === "lb" ? "lb" : "kg",
                  targetSets: Math.max(1, Math.min(10, Number(ex.targetSets) || 3)),
                  targetReps: Math.max(1, Math.min(50, Number(ex.targetReps) || 10)),
                  targetRpe: Math.max(6, Math.min(10, Number(ex.targetRpe) || 8)),
                  restSeconds: Math.max(30, Math.min(300, Number(ex.restSeconds) || 60)),
                  notes: ex.notes || undefined,
                };
              }
            );

            return {
              sessionName: parsed.sessionName || "AI Generated Workout",
              sessionType: parsed.sessionType || "custom",
              focus: parsed.focus || "Total Body",
              estimatedMinutes: Number(parsed.estimatedMinutes) || 45,
              rationale: parsed.rationale || "AI-optimized training targets.",
              exercises,
              source: "gemini",
            };
          }
        }
      }
    } catch (err) {
      // In case of network/API error, smoothly fall back to catalog engine
      console.error("[ai-workout-generator] Gemini request failed, using catalog engine fallback:", err);
    }
  }

  // Offline / deterministic catalog engine fallback
  return generateFallbackWorkoutPlan(options);
}

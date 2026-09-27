import {
  calculateMacroTargets,
  type NutritionGoal,
  type ActivityLevel,
  type MacroBreakdown,
} from "./nutrition";

export interface AICaloriePlan {
  goal: NutritionGoal;
  targetCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  tdee: number;
  bmr: number;
  calorieDelta: number;
  explanation: string;
  mealSplitSuggestions: Array<{
    meal: string;
    calories: number;
    proteinGrams: number;
    description: string;
  }>;
  source: "gemini" | "sports_science_engine";
}

export interface AICaloriePlannerOptions {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female" | "other";
  activityLevel?: ActivityLevel;
  goal?: NutritionGoal;
  prompt?: string;
  calorieTargetOverride?: number;
}

const SYSTEM_PROMPT = `
You are an elite sports dietitian and exercise physiologist.
Your task is to plan the athlete's daily caloric targets, macronutrient split (Protein, Carbs, Fats), and daily meal distribution.

Rules:
1. Prioritize protein intake (1.8g - 2.4g per kg of bodyweight) to protect contractile tissue.
2. For "cut", establish a sustainable 300 - 500 kcal deficit (max 20% of TDEE).
3. For "bulk", establish a lean surplus of 250 - 400 kcal.
4. For "maintain", balance at TDEE.
5. Provide a realistic 4-meal distribution with target calories and protein per meal.

Return ONLY a valid JSON object strictly matching this schema with no markdown code fences:
{
  "goal": "cut",
  "targetCalories": 2050,
  "proteinGrams": 165,
  "carbGrams": 200,
  "fatGrams": 65,
  "explanation": "500 kcal deficit targeting ~0.5kg/week fat loss while maintaining 2.2g/kg protein for muscle retention.",
  "mealSplitSuggestions": [
    { "meal": "Breakfast", "calories": 450, "proteinGrams": 35, "description": "High-protein eggs, oats, and berries" },
    { "meal": "Lunch", "calories": 550, "proteinGrams": 45, "description": "Lean chicken or fish with complex carbs and greens" },
    { "meal": "Pre/Post Workout", "calories": 400, "proteinGrams": 35, "description": "Whey protein shake with banana or rice cakes" },
    { "meal": "Dinner", "calories": 650, "proteinGrams": 50, "description": "Lean beef or salmon with sweet potato and avocado" }
  ]
}
`.trim();

/**
 * Deterministic sports science fallback calorie & macro planner.
 * Works 100% offline without API key or internet connection.
 */
export function generateFallbackCaloriePlan(
  options: AICaloriePlannerOptions
): AICaloriePlan {
  const goal: NutritionGoal = options.goal || "cut";
  const activity: ActivityLevel = options.activityLevel || "moderately_active";

  const macros: MacroBreakdown | null = calculateMacroTargets({
    weightKg: options.weightKg,
    heightCm: options.heightCm,
    ageYears: options.ageYears,
    sex: options.sex,
    activityLevel: activity,
    goal,
  });

  const bmr = macros?.bmr || 1700;
  const tdee = macros?.tdee || 2400;
  const targetCalories = options.calorieTargetOverride || macros?.targetCalories || 1900;
  const proteinGrams = macros?.proteinGrams || Math.round(options.weightKg * 2.0);
  const fatGrams = macros?.fatGrams || Math.round((targetCalories * 0.25) / 9);
  const carbGrams =
    macros?.carbGrams ||
    Math.max(50, Math.round((targetCalories - (proteinGrams * 4 + fatGrams * 9)) / 4));
  const calorieDelta = targetCalories - tdee;

  const goalDesc =
    goal === "cut"
      ? `Caloric deficit of ${Math.abs(calorieDelta)} kcal/day for fat loss while preserving lean tissue with ${proteinGrams}g protein.`
      : goal === "bulk"
      ? `Caloric surplus of +${calorieDelta} kcal/day for hypertrophic muscle gain with high protein synthesis.`
      : `Metabolic maintenance at ${targetCalories} kcal/day to support athletic performance and recovery.`;

  // 4-meal distribution
  const mealSplitSuggestions = [
    {
      meal: "Meal 1: Breakfast",
      calories: Math.round(targetCalories * 0.25),
      proteinGrams: Math.round(proteinGrams * 0.25),
      description: "Eggs, Greek yogurt, or protein oatmeal with fruit.",
    },
    {
      meal: "Meal 2: Lunch",
      calories: Math.round(targetCalories * 0.3),
      proteinGrams: Math.round(proteinGrams * 0.3),
      description: "Lean chicken breast, rice, and mixed vegetables.",
    },
    {
      meal: "Meal 3: Pre/Post Workout",
      calories: Math.round(targetCalories * 0.15),
      proteinGrams: Math.round(proteinGrams * 0.2),
      description: "Protein shake with banana or cream of rice.",
    },
    {
      meal: "Meal 4: Dinner",
      calories: Math.round(targetCalories * 0.3),
      proteinGrams: Math.round(proteinGrams * 0.25),
      description: "Lean beef or salmon with potatoes and healthy fats.",
    },
  ];

  return {
    goal,
    targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
    tdee,
    bmr,
    calorieDelta,
    explanation: goalDesc,
    mealSplitSuggestions,
    source: "sports_science_engine",
  };
}

/**
 * Plans daily calorie and macro targets using Gemini AI (when available)
 * with graceful fallback to sports science formulas.
 */
export async function planDailyCaloriesWithAI(
  options: AICaloriePlannerOptions
): Promise<AICaloriePlan> {
  const fallback = generateFallbackCaloriePlan(options);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const userText = `
Athlete Biometrics:
- Weight: ${options.weightKg} kg
- Height: ${options.heightCm} cm
- Age: ${options.ageYears}
- Sex: ${options.sex}
- Activity Level: ${options.activityLevel || "moderately_active"}
- Goal: ${options.goal || "cut"}
- Calculated BMR: ${fallback.bmr} kcal
- Calculated TDEE: ${fallback.tdee} kcal
- Athlete Request / Focus: "${options.prompt || `Optimize calories for ${options.goal || "fat loss cut"}`}"
${options.calorieTargetOverride ? `- Specific Calorie Target Requested: ${options.calorieTargetOverride} kcal` : ""}
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
            temperature: 0.2,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            goal: (parsed.goal as NutritionGoal) || options.goal || "cut",
            targetCalories: Math.max(1000, Number(parsed.targetCalories) || fallback.targetCalories),
            proteinGrams: Math.max(50, Number(parsed.proteinGrams) || fallback.proteinGrams),
            carbGrams: Math.max(30, Number(parsed.carbGrams) || fallback.carbGrams),
            fatGrams: Math.max(20, Number(parsed.fatGrams) || fallback.fatGrams),
            tdee: fallback.tdee,
            bmr: fallback.bmr,
            calorieDelta: (Number(parsed.targetCalories) || fallback.targetCalories) - fallback.tdee,
            explanation: parsed.explanation || fallback.explanation,
            mealSplitSuggestions: Array.isArray(parsed.mealSplitSuggestions) && parsed.mealSplitSuggestions.length > 0
              ? parsed.mealSplitSuggestions
              : fallback.mealSplitSuggestions,
            source: "gemini",
          };
        }
      }
    } catch (err) {
      console.error("[ai-calorie-planner] Gemini call failed, using sports science fallback:", err);
    }
  }

  return fallback;
}

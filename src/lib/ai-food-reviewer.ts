import { estimateFoodMacros } from "./food-parser";

export interface AIFoodReviewResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionGrams: number;
  portionDesc: string;
  explanation: string;
  confidenceScore: number;
  source: "gemini" | "nutrition_engine";
}

const SYSTEM_PROMPT = `
You are an elite certified sports nutritionist and dietary analyst.
Analyze the athlete's described food item.
Your task:
1. Estimate the standard realistic portion size in grams.
2. Calculate the total calories (kcal), protein (g), carbohydrates (g), and dietary fats (g) based on USDA nutritional reference standards.
3. Provide a clear, concise 1-sentence breakdown explanation of your estimation.
4. Provide a confidence score between 0.0 and 1.0.

Return ONLY a valid JSON object strictly matching this schema with no markdown code fences:
{
  "foodName": "Chicken Breast with Rice",
  "calories": 420,
  "protein": 35,
  "carbs": 50,
  "fat": 8,
  "portionGrams": 300,
  "portionDesc": "1 plate (~300g)",
  "explanation": "Estimated 150g cooked chicken breast (245 kcal, 46g P) with 150g white rice (195 kcal, 4g P): ~420 kcal, 35g protein.",
  "confidenceScore": 0.90
}
`.trim();

/**
 * Reviews a food item using Gemini AI (when API key is present)
 * or falls back to the deterministic USDA nutrition engine.
 */
export async function reviewFoodItemWithAI(
  foodDescription: string,
  portionContext?: string
): Promise<AIFoodReviewResult> {
  const trimmed = foodDescription.trim();
  if (!trimmed) {
    return {
      foodName: "Unknown Item",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      portionGrams: 0,
      portionDesc: "N/A",
      explanation: "No food description provided.",
      confidenceScore: 0,
      source: "nutrition_engine",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const userContent = portionContext
        ? `Food Description: "${trimmed}" (Additional Context: ${portionContext})`
        : `Food Description: "${trimmed}"`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userContent}` }],
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
            foodName: parsed.foodName || trimmed,
            calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
            protein: Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10),
            carbs: Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10),
            fat: Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10),
            portionGrams: Math.max(0, Math.round(Number(parsed.portionGrams) || 150)),
            portionDesc: parsed.portionDesc || "Standard serving",
            explanation: parsed.explanation || `AI estimated ${parsed.calories || 0} kcal, ${parsed.protein || 0}g protein.`,
            confidenceScore: Math.min(1, Math.max(0, Number(parsed.confidenceScore) || 0.85)),
            source: "gemini",
          };
        }
      }
    } catch (err) {
      console.warn("[reviewFoodItemWithAI] Gemini API failed, falling back to heuristic engine:", err);
    }
  }

  // Deterministic nutrition engine fallback (offline / tests / no API key)
  const est = estimateFoodMacros(trimmed);
  const portionDesc = est.portionDesc || (est.hasExplicitGrams ? `${est.grams}g` : "1 standard portion");
  const explanation = est.matched
    ? `USDA reference estimate for ${est.name}: ~${est.calories} kcal, ${est.protein}g protein (${portionDesc}).`
    : `Heuristic nutritional estimate for "${trimmed}": ~${est.calories} kcal, ${est.protein}g protein, ${est.carbs}g carbs, ${est.fat}g fat.`;

  return {
    foodName: est.name || trimmed,
    calories: est.calories,
    protein: est.protein,
    carbs: est.carbs,
    fat: est.fat,
    portionGrams: est.grams,
    portionDesc,
    explanation,
    confidenceScore: est.matched ? 0.9 : 0.75,
    source: "nutrition_engine",
  };
}

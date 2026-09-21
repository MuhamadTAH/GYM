import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import type { EstimatedMacroResult } from "./food-parser";

let usdaClient: Client | null = null;

function getUsdaClient(): Client | null {
  if (usdaClient) return usdaClient;

  // Statically scoped path for Turbopack compatibility
  const usdaPath = path.join(process.cwd(), "data", "usda-sqlite", "usda.sql3");
  const fallbackPath = path.join(process.cwd(), "data", "usda.sql3");

  const targetPath = fs.existsSync(usdaPath) ? usdaPath : fs.existsSync(fallbackPath) ? fallbackPath : null;

  if (targetPath) {
    try {
      usdaClient = createClient({ url: `file:${targetPath}` });
      return usdaClient;
    } catch (err) {
      console.warn("[USDA-DB] Failed to open database at", targetPath, err);
    }
  }

  return null;
}

export interface UsdaFoodMatch {
  id: number;
  longDesc: string;
  shortDesc: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  defaultServingGrams?: number;
  defaultServingDesc?: string;
  emoji: string;
}

// Fruit & staple emoji resolver
export function resolveFoodEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("apple")) return "🍎";
  if (d.includes("banana")) return "🍌";
  if (d.includes("grape") || d.includes("raisin")) return "🍇";
  if (d.includes("watermelon")) return "🍉";
  if (d.includes("melon") || d.includes("cantaloupe")) return "🍈";
  if (d.includes("orange") || d.includes("tangerine") || d.includes("mandarin")) return "🍊";
  if (d.includes("lemon")) return "🍋";
  if (d.includes("strawberry") || d.includes("strawberries")) return "🍓";
  if (d.includes("blueberry") || d.includes("blueberries")) return "🫐";
  if (d.includes("cherry") || d.includes("cherries")) return "🍒";
  if (d.includes("peach") || d.includes("nectarine")) return "🍑";
  if (d.includes("mango")) return "🥭";
  if (d.includes("pineapple")) return "🍍";
  if (d.includes("coconut")) return "🥥";
  if (d.includes("kiwi")) return "🥝";
  if (d.includes("avocado")) return "🥑";
  if (d.includes("tomato")) return "🍅";
  if (d.includes("potato")) return "🥔";
  if (d.includes("carrot")) return "🥕";
  if (d.includes("broccoli")) return "🥦";
  if (d.includes("cucumber")) return "🥒";
  if (d.includes("spinach") || d.includes("lettuce")) return "🥬";
  if (d.includes("chicken")) return "🍗";
  if (d.includes("beef") || d.includes("steak")) return "🥩";
  if (d.includes("fish") || d.includes("salmon") || d.includes("tuna")) return "🐟";
  if (d.includes("egg")) return "🍳";
  if (d.includes("rice")) return "🍚";
  if (d.includes("bread")) return "🍞";
  if (d.includes("milk") || d.includes("yogurt")) return "🥛";
  return "🥗";
}

/**
 * Searches the USDA database for food items matching user search query
 */
export async function searchUsdaFoods(query: string, limit = 8): Promise<UsdaFoodMatch[]> {
  const client = getUsdaClient();
  if (!client) return [];

  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Split query into keywords (e.g. "red grapes" -> ["red", "grapes"])
  const words = trimmed
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return [];

  try {
    // Build SQL condition for all keywords
    const whereClauses = words.map(() => "f.long_desc LIKE ?").join(" AND ");
    const params = words.map((w) => `%${w}%`);

    const sql = `
      SELECT 
        f.id,
        f.long_desc,
        f.short_desc,
        MAX(CASE WHEN nu.nutrient_id = 208 THEN nu.amount ELSE NULL END) AS calories,
        MAX(CASE WHEN nu.nutrient_id = 203 THEN nu.amount ELSE NULL END) AS protein,
        MAX(CASE WHEN nu.nutrient_id = 204 THEN nu.amount ELSE NULL END) AS fat,
        MAX(CASE WHEN nu.nutrient_id = 205 THEN nu.amount ELSE NULL END) AS carbs,
        w.amount AS weight_amount,
        w.description AS weight_desc,
        w.gm_weight AS weight_grams
      FROM food f
      LEFT JOIN nutrition nu ON f.id = nu.food_id AND nu.nutrient_id IN (208, 203, 204, 205)
      LEFT JOIN weight w ON f.id = w.food_id AND w.sequence_num = 1
      WHERE ${whereClauses}
      GROUP BY f.id
      ORDER BY 
        CASE 
          WHEN LOWER(f.long_desc) LIKE ? THEN 1
          WHEN LOWER(f.long_desc) LIKE '%, raw%' THEN 2
          ELSE 3
        END,
        LENGTH(f.long_desc) ASC
      LIMIT ?
    `;

    const fullParams = [...params, `${trimmed.toLowerCase()}%`, limit];
    const res = await client.execute({ sql, args: fullParams });

    return res.rows.map((row) => ({
      id: Number(row.id),
      longDesc: String(row.long_desc),
      shortDesc: String(row.short_desc || row.long_desc),
      caloriesPer100g: Math.round(Number(row.calories ?? 0)),
      proteinPer100g: Math.round(Number(row.protein ?? 0) * 10) / 10,
      fatPer100g: Math.round(Number(row.fat ?? 0) * 10) / 10,
      carbsPer100g: Math.round(Number(row.carbs ?? 0) * 10) / 10,
      defaultServingGrams: row.weight_grams ? Math.round(Number(row.weight_grams)) : undefined,
      defaultServingDesc: row.weight_desc ? `${row.weight_amount ?? 1} ${row.weight_desc}` : undefined,
      emoji: resolveFoodEmoji(String(row.long_desc)),
    }));
  } catch (err) {
    console.error("[USDA-DB] searchUsdaFoods error:", err);
    return [];
  }
}

/**
 * Resolves exact nutritional estimation from the USDA database for a given food name
 */
export async function getUsdaFoodNutrition(
  foodName: string,
  grams?: number
): Promise<EstimatedMacroResult | null> {
  const client = getUsdaClient();
  if (!client) return null;

  const results = await searchUsdaFoods(foodName, 3);
  if (results.length === 0) return null;

  // Best match is first sorted result
  const match = results[0];
  const hasExplicitGrams = grams !== undefined && grams > 0;

  // Calculate target grams
  let targetGrams = 100;
  let portionDesc = "";

  if (hasExplicitGrams) {
    targetGrams = grams;
    portionDesc = `${grams}g`;
  } else if (match.defaultServingGrams && match.defaultServingGrams > 0) {
    targetGrams = match.defaultServingGrams;
    portionDesc = match.defaultServingDesc || `1 serving (~${Math.round(targetGrams)}g)`;
  } else {
    targetGrams = 100;
    portionDesc = "100g";
  }

  const factor = targetGrams / 100;
  const calories = Math.round(match.caloriesPer100g * factor);
  const protein = Math.round(match.proteinPer100g * factor * 10) / 10;
  const fat = Math.round(match.fatPer100g * factor * 10) / 10;
  const carbs = Math.round(match.carbsPer100g * factor * 10) / 10;

  // Clean friendly display name: "Grapes, red or green..." -> "Grapes"
  const firstChunk = match.longDesc.split(",")[0].trim();
  const displayName = firstChunk || foodName;

  return {
    matched: true,
    name: displayName,
    emoji: match.emoji,
    grams: targetGrams,
    portionDesc,
    hasExplicitGrams,
    calories,
    protein,
    carbs,
    fat,
  };
}

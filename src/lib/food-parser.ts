/**
 * Natural Language Food, Hydration, Walking & Training Telemetry Parser
 *
 * Deterministically parses natural athlete descriptions like:
 * - "I ate 4 eggs"
 * - "chicken breast 200g with a cup of rice"
 * - "1 scoop of whey protein and a banana"
 * - "drank 500ml water"
 * - "walked 25 minutes"
 * - "completed chest workout"
 * - "ate 450 calories and 40g protein"
 */

export interface ParsedItemResult {
  raw: string;
  name: string;
  category: "food" | "water" | "walk" | "training" | "custom";
  calories: number;
  protein: number;
  waterLiters: number;
  walkMinutes: number;
  trainingCompleted: boolean;
  summary: string;
}

export interface ParseTelemetryResult {
  success: boolean;
  rawInput: string;
  totalCalories: number;
  totalProtein: number;
  totalWaterLiters: number;
  totalWalkMinutes: number;
  trainingCompleted: boolean;
  items: ParsedItemResult[];
  feedbackSummary: string;
}

// Word-to-number mapping
const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  couple: 2,
  few: 3,
  "١": 1,
  "٢": 2,
  "٣": 3,
  "٤": 4,
  "٥": 5,
};

interface FoodReference {
  aliases: string[];
  unitType: "unit" | "100g" | "serving";
  defaultServingGrams?: number;
  defaultServingUnits?: number;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  emoji: string;
  displayName: string;
}

const FOOD_DATABASE: FoodReference[] = [
  // Eggs
  {
    aliases: ["egg", "eggs", "boiled egg", "boiled eggs", "fried egg", "fried eggs", "scrambled egg", "scrambled eggs", "omelet", "omelette", "بيض", "بيضات"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 72,
    proteinPerUnit: 6,
    emoji: "🍳",
    displayName: "Egg",
  },
  {
    aliases: ["egg white", "egg whites", "بياض بيض"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 17,
    proteinPerUnit: 3.6,
    emoji: "🥚",
    displayName: "Egg White",
  },

  // Poultry & Meats
  {
    aliases: ["chicken breast", "chicken breasts", "chicken fillet", "grilled chicken", "صدر دجاج", "صدور دجاج"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 165, // per 100g
    proteinPerUnit: 31,  // per 100g
    emoji: "🥩",
    displayName: "Chicken Breast",
  },
  {
    aliases: ["chicken", "roasted chicken", "chicken thigh", "chicken thighs", "دجاج"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 200,
    proteinPerUnit: 26,
    emoji: "🍗",
    displayName: "Chicken",
  },
  {
    aliases: ["beef", "steak", "ground beef", "minced beef", "mince", "meat", "red meat", "لحم", "لحمة", "ستيك"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 250,
    proteinPerUnit: 26,
    emoji: "🥩",
    displayName: "Beef",
  },
  {
    aliases: ["turkey", "ground turkey", "حبش"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 150,
    proteinPerUnit: 28,
    emoji: "🦃",
    displayName: "Turkey",
  },

  // Seafood
  {
    aliases: ["tuna", "canned tuna", "can of tuna", "تونا", "تونة"],
    unitType: "serving", // 1 can / serving
    defaultServingUnits: 1,
    caloriesPerUnit: 120,
    proteinPerUnit: 26,
    emoji: "🐟",
    displayName: "Tuna",
  },
  {
    aliases: ["salmon", "salmon fillet", "سلمون"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 205,
    proteinPerUnit: 22,
    emoji: "🐟",
    displayName: "Salmon",
  },
  {
    aliases: ["fish", "white fish", "cod", "سمك"],
    unitType: "100g",
    defaultServingGrams: 150,
    caloriesPerUnit: 130,
    proteinPerUnit: 24,
    emoji: "🐟",
    displayName: "Fish",
  },

  // Protein Supplements & Dairy
  {
    aliases: ["whey", "whey protein", "protein powder", "protein shake", "scoop whey", "scoop of whey", "بروتين"],
    unitType: "unit", // 1 scoop
    defaultServingUnits: 1,
    caloriesPerUnit: 120,
    proteinPerUnit: 24,
    emoji: "🥤",
    displayName: "Whey Protein",
  },
  {
    aliases: ["greek yogurt", "greek yoghurt", "لبن يوناني", "زبادي يوناني"],
    unitType: "serving", // 1 cup / 170g
    defaultServingUnits: 1,
    caloriesPerUnit: 100,
    proteinPerUnit: 15,
    emoji: "🥣",
    displayName: "Greek Yogurt",
  },
  {
    aliases: ["yogurt", "yoghurt", "لبن", "زبادي"],
    unitType: "serving",
    defaultServingUnits: 1,
    caloriesPerUnit: 90,
    proteinPerUnit: 6,
    emoji: "🥣",
    displayName: "Yogurt",
  },
  {
    aliases: ["milk", "glass of milk", "cup of milk", "حليب"],
    unitType: "unit", // 1 cup / 240ml
    defaultServingUnits: 1,
    caloriesPerUnit: 125,
    proteinPerUnit: 8,
    emoji: "🥛",
    displayName: "Milk",
  },
  {
    aliases: ["cottage cheese", "جبن قريش"],
    unitType: "serving", // 1 cup
    defaultServingUnits: 1,
    caloriesPerUnit: 160,
    proteinPerUnit: 24,
    emoji: "🧀",
    displayName: "Cottage Cheese",
  },
  {
    aliases: ["cheese", "cheddar", "slice of cheese", "جبن", "جبنة"],
    unitType: "unit", // 1 slice (30g)
    defaultServingUnits: 1,
    caloriesPerUnit: 110,
    proteinPerUnit: 7,
    emoji: "🧀",
    displayName: "Cheese",
  },

  // Carbohydrates & Staples
  {
    aliases: ["rice", "white rice", "brown rice", "cooked rice", "bowl of rice", "cup of rice", "رز", "تمن"],
    unitType: "serving", // 1 cooked cup / bowl ~150g
    defaultServingUnits: 1,
    caloriesPerUnit: 205,
    proteinPerUnit: 4.5,
    emoji: "🍚",
    displayName: "Rice",
  },
  {
    aliases: ["bread", "toast", "slice of bread", "slice of toast", "خبز", "توست"],
    unitType: "unit", // 1 slice
    defaultServingUnits: 1,
    caloriesPerUnit: 80,
    proteinPerUnit: 3,
    emoji: "🍞",
    displayName: "Bread Slice",
  },
  {
    aliases: ["oats", "oatmeal", "bowl of oats", "شوفان"],
    unitType: "serving", // 1 bowl (40g dry)
    defaultServingUnits: 1,
    caloriesPerUnit: 150,
    proteinPerUnit: 5,
    emoji: "🥣",
    displayName: "Oatmeal",
  },
  {
    aliases: ["potato", "potatoes", "boiled potato", "baked potato", "بطاطا", "بتيتة"],
    unitType: "unit", // 1 medium potato
    defaultServingUnits: 1,
    caloriesPerUnit: 130,
    proteinPerUnit: 3,
    emoji: "🥔",
    displayName: "Potato",
  },
  {
    aliases: ["sweet potato", "sweet potatoes", "بطاطا حلوة"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 140,
    proteinPerUnit: 2.5,
    emoji: "🍠",
    displayName: "Sweet Potato",
  },
  {
    aliases: ["pasta", "spaghetti", "macaroni", "معكرونة", "باستا"],
    unitType: "serving", // 1 bowl cooked
    defaultServingUnits: 1,
    caloriesPerUnit: 220,
    proteinPerUnit: 8,
    emoji: "🍝",
    displayName: "Pasta",
  },
  {
    aliases: ["lentils", "lentil soup", "beans", "chickpeas", "عدس", "فاصوليا", "حمص"],
    unitType: "serving", // 1 cup cooked
    defaultServingUnits: 1,
    caloriesPerUnit: 150,
    proteinPerUnit: 10,
    emoji: "🍲",
    displayName: "Legumes/Lentils",
  },

  // Fruits & Healthy Fats
  {
    aliases: ["banana", "bananas", "موز", "موزة"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 105,
    proteinPerUnit: 1.3,
    emoji: "🍌",
    displayName: "Banana",
  },
  {
    aliases: ["apple", "apples", "تفاح", "تفاحة"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 95,
    proteinPerUnit: 0.5,
    emoji: "🍎",
    displayName: "Apple",
  },
  {
    aliases: ["orange", "oranges", "برتقال"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 65,
    proteinPerUnit: 1,
    emoji: "🍊",
    displayName: "Orange",
  },
  {
    aliases: ["dates", "date", "تمر", "تمرات"],
    unitType: "unit",
    defaultServingUnits: 1,
    caloriesPerUnit: 60,
    proteinPerUnit: 0.5,
    emoji: "🌴",
    displayName: "Date",
  },
  {
    aliases: ["peanut butter", "زبادي الفول السوداني", "فول سوداني"],
    unitType: "unit", // 1 tbsp (16g)
    defaultServingUnits: 1,
    caloriesPerUnit: 95,
    proteinPerUnit: 4,
    emoji: "🥜",
    displayName: "Peanut Butter (tbsp)",
  },
  {
    aliases: ["nuts", "almonds", "walnuts", "مكسرات", "لوز", "جوز"],
    unitType: "serving", // 1 handful (30g)
    defaultServingUnits: 1,
    caloriesPerUnit: 170,
    proteinPerUnit: 6,
    emoji: "🥜",
    displayName: "Nuts (handful)",
  },
];

/**
 * Extracts numeric quantity from text or word numbers
 */
function extractQuantity(clause: string): number | null {
  // 1. Direct digits (e.g. "4", "4.5", "200")
  const digitMatch = clause.match(/\b(\d+(?:\.\d+)?)\b/);
  if (digitMatch) {
    return parseFloat(digitMatch[1]);
  }

  // 2. Word numbers (e.g. "four", "two", "half")
  const tokens = clause.toLowerCase().split(/[\s,]+/);
  for (const t of tokens) {
    if (WORD_NUMBERS[t] !== undefined) {
      return WORD_NUMBERS[t];
    }
  }

  return null;
}

/**
 * Check for direct calorie and protein mentions in the text
 * e.g. "450 kcal", "450 calories", "30g protein", "25g p"
 */
function extractDirectMacros(text: string): { calories: number; protein: number } {
  let calories = 0;
  let protein = 0;

  const calMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cal|كالوري|سعرة)/i);
  if (calMatch) {
    calories = parseFloat(calMatch[1]);
  }

  const proMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g\s*protein|grams?\s*of\s*protein|g\s*p\b|غرام\s*بروتين)/i);
  if (proMatch) {
    protein = parseFloat(proMatch[1]);
  } else {
    // If just "30g" and no other nutrient specified and text mentions protein or gym
    const altPro = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (altPro && /protein|بروتين/i.test(text)) {
      protein = parseFloat(altPro[1]);
    }
  }

  return { calories, protein };
}

/**
 * Parses hydration telemetry (e.g. "500ml water", "1.5L", "2 glasses of water")
 */
function parseWaterTelemetry(clause: string): ParsedItemResult | null {
  const isWater = /\b(water|hydration|ماء|مي)\b/i.test(clause);
  const mlMatch = clause.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  const lMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litre|litres|لتر)\b/i);
  const glassMatch = clause.match(/(\d+|one|two|three|four)?\s*(?:glass|glasses|cup|cups|كوب|كاس)\s*(?:of\s*)?(?:water|ماء)?/i);
  const bottleMatch = clause.match(/(\d+|one|two|three|four)?\s*(?:bottle|bottles|قنينة|بطل)\s*(?:of\s*)?(?:water|ماء)?/i);

  let liters = 0;
  let summary = "";

  if (lMatch) {
    liters = parseFloat(lMatch[1]);
    summary = `${liters}L Water`;
  } else if (mlMatch) {
    liters = parseFloat(mlMatch[1]) / 1000;
    summary = `${mlMatch[1]}ml Water`;
  } else if (glassMatch && isWater) {
    const qty = extractQuantity(glassMatch[0]) || 1;
    liters = qty * 0.25; // 250ml per glass
    summary = `${qty} Glass${qty > 1 ? "es" : ""} Water (${liters}L)`;
  } else if (bottleMatch && (isWater || /bottle/i.test(clause))) {
    const qty = extractQuantity(bottleMatch[0]) || 1;
    liters = qty * 0.5; // 500ml per standard bottle
    summary = `${qty} Bottle${qty > 1 ? "s" : ""} Water (${liters}L)`;
  } else if (isWater) {
    const qty = extractQuantity(clause);
    if (qty) {
      liters = qty >= 100 ? qty / 1000 : qty;
      summary = `${liters}L Water`;
    }
  }

  if (liters > 0) {
    return {
      raw: clause,
      name: "Water",
      category: "water",
      calories: 0,
      protein: 0,
      waterLiters: Math.round(liters * 100) / 100,
      walkMinutes: 0,
      trainingCompleted: false,
      summary: `💧 ${summary} (+${Math.round(liters * 100) / 100}L)`,
    };
  }

  return null;
}

/**
 * Parses walking telemetry (e.g. "walked 25 minutes", "20 min walk", "5000 steps")
 */
function parseWalkTelemetry(clause: string): ParsedItemResult | null {
  const isWalk = /\b(walk|walked|walking|steps|مشي|خطوة|خطوات)\b/i.test(clause);
  if (!isWalk) return null;

  const minMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minutes|دقيقة)\b/i);
  const stepsMatch = clause.match(/(\d{3,6})\s*(?:steps|خطوة)\b/i);

  let minutes = 0;
  let summary = "";

  if (minMatch) {
    minutes = parseFloat(minMatch[1]);
    summary = `${minutes} min walk`;
  } else if (stepsMatch) {
    const steps = parseInt(stepsMatch[1], 10);
    minutes = Math.round(steps / 120); // ~120 steps per minute brisk walk
    summary = `${steps.toLocaleString()} steps (~${minutes}m walk)`;
  } else {
    const qty = extractQuantity(clause);
    if (qty && qty <= 180) {
      minutes = qty;
      summary = `${minutes} min walk`;
    }
  }

  if (minutes > 0) {
    return {
      raw: clause,
      name: "Daily Walk",
      category: "walk",
      calories: 0,
      protein: 0,
      waterLiters: 0,
      walkMinutes: minutes,
      trainingCompleted: false,
      summary: `👟 ${summary} (+${minutes}m)`,
    };
  }

  return null;
}

/**
 * Parses workout completion telemetry
 */
function parseTrainingTelemetry(clause: string): ParsedItemResult | null {
  const isTraining =
    /\b(workout|gym|trained|lifted|finished training|done training|completed session|تمرنت|تمرين|خلصت تمرين)\b/i.test(clause);

  if (isTraining && !/\b(plan|goal|schedule)\b/i.test(clause)) {
    return {
      raw: clause,
      name: "Workout Session",
      category: "training",
      calories: 0,
      protein: 0,
      waterLiters: 0,
      walkMinutes: 0,
      trainingCompleted: true,
      summary: "🏋️ Today's Workout Completed",
    };
  }

  return null;
}

/**
 * Parses a single food clause against the FOOD_DATABASE
 */
function parseSingleFoodClause(clause: string): ParsedItemResult | null {
  const normalized = clause.toLowerCase().trim();
  if (!normalized) return null;

  // Direct grams match e.g. "200g chicken breast" or "chicken 150g"
  const gramsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|غرام)\b/i);
  const gramsSpecified = gramsMatch ? parseFloat(gramsMatch[1]) : null;

  // Match known food items
  for (const food of FOOD_DATABASE) {
    for (const alias of food.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(normalized)) {
        let quantity = extractQuantity(normalized);
        let calculatedCalories = 0;
        let calculatedProtein = 0;
        let portionDesc = "";

        if (food.unitType === "100g") {
          const grams = gramsSpecified || (quantity && quantity >= 30 ? quantity : food.defaultServingGrams || 150);
          calculatedCalories = Math.round((grams / 100) * food.caloriesPerUnit);
          calculatedProtein = Math.round((grams / 100) * food.proteinPerUnit * 10) / 10;
          portionDesc = `${grams}g`;
        } else if (food.unitType === "unit") {
          const units = quantity && quantity < 30 ? quantity : (food.defaultServingUnits || 1);
          calculatedCalories = Math.round(units * food.caloriesPerUnit);
          calculatedProtein = Math.round(units * food.proteinPerUnit * 10) / 10;
          portionDesc = `${units}x`;
        } else {
          // serving
          const servings = quantity && quantity < 10 ? quantity : (food.defaultServingUnits || 1);
          calculatedCalories = Math.round(servings * food.caloriesPerUnit);
          calculatedProtein = Math.round(servings * food.proteinPerUnit * 10) / 10;
          portionDesc = servings === 1 ? "1 serving" : `${servings} servings`;
        }

        return {
          raw: clause,
          name: food.displayName,
          category: "food",
          calories: calculatedCalories,
          protein: calculatedProtein,
          waterLiters: 0,
          walkMinutes: 0,
          trainingCompleted: false,
          summary: `${food.emoji} ${portionDesc} ${food.displayName} (+${calculatedCalories} kcal, +${calculatedProtein}g protein)`,
        };
      }
    }
  }

  // Fallback: Check if direct macros were mentioned in this clause without matching a food item
  // e.g. "burger 500 kcal 30g protein" or "pizza 600 cal"
  const direct = extractDirectMacros(clause);
  if (direct.calories > 0 || direct.protein > 0) {
    // Extract a friendly name from the text
    const cleanName = clause
      .replace(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cal|g\s*protein|grams?\s*protein|g\s*p|g\b)/gi, "")
      .replace(/\b(i\s*ate|i\s*had|ate|had|eating|and|with)\b/gi, "")
      .trim() || "Food Entry";

    return {
      raw: clause,
      name: cleanName,
      category: "food",
      calories: direct.calories,
      protein: direct.protein,
      waterLiters: 0,
      walkMinutes: 0,
      trainingCompleted: false,
      summary: `🍽️ ${cleanName} (+${direct.calories} kcal, +${direct.protein}g protein)`,
    };
  }

  return null;
}

/**
 * Main Entry Point: Decomposes natural language string into items and aggregates totals
 */
export function parseNaturalTelemetry(input: string): ParseTelemetryResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      rawInput: input,
      totalCalories: 0,
      totalProtein: 0,
      totalWaterLiters: 0,
      totalWalkMinutes: 0,
      trainingCompleted: false,
      items: [],
      feedbackSummary: "Please enter what you ate or did (e.g. '4 eggs', '500ml water', 'walked 20m').",
    };
  }

  // Split into clauses by 'and', '+', ',', ';', 'with', 'also'
  const clauses = trimmed
    .split(/\b(?:and|with|also|\+)\b|[,;]/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const items: ParsedItemResult[] = [];

  for (const clause of clauses) {
    // 1. Water check
    const water = parseWaterTelemetry(clause);
    if (water) {
      items.push(water);
      continue;
    }

    // 2. Walk check
    const walk = parseWalkTelemetry(clause);
    if (walk) {
      items.push(walk);
      continue;
    }

    // 3. Training check
    const training = parseTrainingTelemetry(clause);
    if (training) {
      items.push(training);
      continue;
    }

    // 4. Food check
    const food = parseSingleFoodClause(clause);
    if (food) {
      items.push(food);
      continue;
    }
  }

  // If clauses didn't match individually, test the whole input for direct macros
  if (items.length === 0) {
    const direct = extractDirectMacros(trimmed);
    if (direct.calories > 0 || direct.protein > 0) {
      items.push({
        raw: trimmed,
        name: "Custom Meal",
        category: "food",
        calories: direct.calories,
        protein: direct.protein,
        waterLiters: 0,
        walkMinutes: 0,
        trainingCompleted: false,
        summary: `🍽️ Custom Meal (+${direct.calories} kcal, +${direct.protein}g protein)`,
      });
    }
  }

  // Aggregate totals
  const totalCalories = items.reduce((acc, i) => acc + i.calories, 0);
  const totalProtein = Math.round(items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
  const totalWaterLiters = Math.round(items.reduce((acc, i) => acc + i.waterLiters, 0) * 100) / 100;
  const totalWalkMinutes = items.reduce((acc, i) => acc + i.walkMinutes, 0);
  const trainingCompleted = items.some((i) => i.trainingCompleted);

  if (items.length === 0) {
    return {
      success: false,
      rawInput: input,
      totalCalories: 0,
      totalProtein: 0,
      totalWaterLiters: 0,
      totalWalkMinutes: 0,
      trainingCompleted: false,
      items: [],
      feedbackSummary: `Could not identify calories or items in "${input}". Try typing something like "4 eggs", "chicken breast", "500ml water", or include numbers like "burger 500 kcal".`,
    };
  }

  const summaries = items.map((i) => i.summary).join(" • ");
  const feedbackSummary = `Logged: ${summaries}`;

  return {
    success: true,
    rawInput: input,
    totalCalories,
    totalProtein,
    totalWaterLiters,
    totalWalkMinutes,
    trainingCompleted,
    items,
    feedbackSummary,
  };
}

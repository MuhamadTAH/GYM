import type { MovementPattern } from "../schemas/fitness";
import exercisesData from "../data/exercises.json";

export interface CatalogExercise {
  id: string;
  name: string;
  force?: "push" | "pull" | null | string;
  level?: "beginner" | "intermediate" | "expert" | string;
  mechanic?: "compound" | "isolation" | null | string;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images?: string[];
}

// Cast loaded exercises once
const catalog: CatalogExercise[] = exercisesData as CatalogExercise[];

/**
 * Returns all exercises in the downloaded GitHub catalog (876 exercises)
 */
export function getAllCatalogExercises(): CatalogExercise[] {
  return catalog;
}

/**
 * Searches the 876-exercise catalog by free text, with optional muscle/category/equipment filters.
 */
export function searchExerciseCatalog(
  query: string,
  options?: {
    muscle?: string;
    category?: string;
    equipment?: string;
    limit?: number;
  }
): CatalogExercise[] {
  const cleanQ = query.trim().toLowerCase();
  const limit = options?.limit ?? 30;

  return catalog
    .filter((ex) => {
      // 1. Text search match on name, category, or muscles
      if (cleanQ) {
        const nameMatch = ex.name.toLowerCase().includes(cleanQ);
        const catMatch = ex.category?.toLowerCase().includes(cleanQ);
        const muscleMatch =
          ex.primaryMuscles.some((m) => m.toLowerCase().includes(cleanQ)) ||
          ex.secondaryMuscles.some((m) => m.toLowerCase().includes(cleanQ));
        const eqMatch = ex.equipment?.toLowerCase().includes(cleanQ);

        if (!nameMatch && !catMatch && !muscleMatch && !eqMatch) {
          return false;
        }
      }

      // 2. Specific muscle filter
      if (options?.muscle) {
        const targetMuscle = options.muscle.toLowerCase();
        const hasMuscle =
          ex.primaryMuscles.some((m) => m.toLowerCase().includes(targetMuscle)) ||
          ex.secondaryMuscles.some((m) => m.toLowerCase().includes(targetMuscle));
        if (!hasMuscle) return false;
      }

      // 3. Category filter
      if (options?.category) {
        if (ex.category?.toLowerCase() !== options.category.toLowerCase()) {
          return false;
        }
      }

      // 4. Equipment filter
      if (options?.equipment) {
        const targetEq = options.equipment.toLowerCase();
        if (!ex.equipment?.toLowerCase().includes(targetEq)) {
          return false;
        }
      }

      return true;
    })
    .slice(0, limit);
}

/**
 * Finds an exercise by exact ID or case-insensitive name.
 */
export function findCatalogExercise(idOrName: string): CatalogExercise | undefined {
  const clean = idOrName.trim().toLowerCase();
  return catalog.find(
    (ex) =>
      ex.id.toLowerCase() === clean ||
      ex.name.toLowerCase() === clean ||
      ex.name.toLowerCase().replace(/[^a-z0-9]/g, "_") === clean
  );
}

/**
 * Maps a catalog exercise to a physiological MovementPattern for load calculations and mesocycle tracking.
 */
export function mapExerciseToMovementPattern(ex: CatalogExercise): MovementPattern {
  const primary = (ex.primaryMuscles[0] || "").toLowerCase();
  const isCompound = ex.mechanic === "compound";
  const force = ex.force?.toLowerCase();

  // Quadriceps
  if (primary.includes("quadricep")) {
    return isCompound ? "quad_dominant" : "isolation";
  }

  // Hamstrings / Glutes / Lower Back
  if (primary.includes("hamstring") || primary.includes("glute") || primary.includes("lower back")) {
    return isCompound ? "hip_hinge" : "isolation";
  }

  // Chest
  if (primary.includes("chest")) {
    return isCompound ? "horizontal_push" : "isolation";
  }

  // Shoulders
  if (primary.includes("shoulder") || primary.includes("deltoid")) {
    if (force === "push" || isCompound) return "vertical_push";
    return "isolation";
  }

  // Lats / Middle Back
  if (primary.includes("lat") || primary.includes("middle back") || primary.includes("trap")) {
    if (force === "pull") {
      if (ex.name.toLowerCase().includes("pull") || ex.name.toLowerCase().includes("chin") || ex.name.toLowerCase().includes("lat pull")) {
        return "vertical_pull";
      }
      return "horizontal_pull";
    }
    return isCompound ? "horizontal_pull" : "isolation";
  }

  // Core / Abdominals
  if (primary.includes("abdominal") || primary.includes("core") || primary.includes("oblique")) {
    return "carry_core";
  }

  // Default isolation for arms, calves, neck, forearms, etc.
  return "isolation";
}

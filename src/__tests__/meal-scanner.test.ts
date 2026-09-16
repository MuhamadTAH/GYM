import { describe, it, expect } from "vitest";
import {
  validateMealImage,
  scanMealImage,
  getFallbackHeuristicEstimation,
  ScannedMealSchema,
} from "@/lib/meal-scanner";
import { POST } from "@/app/api/nutrition/scan-meal/route";
import { NextRequest } from "next/server";

describe("Multimodal Meal Scanner & Macronutrient Estimation", () => {
  it("validates allowed image formats (JPEG, PNG, WebP)", () => {
    expect(validateMealImage("image/jpeg", 500_000).valid).toBe(true);
    expect(validateMealImage("image/png", 1_000_000).valid).toBe(true);
    expect(validateMealImage("image/webp", 2_000_000).valid).toBe(true);

    // Rejection of invalid types
    const invalidType = validateMealImage("image/gif", 500_000);
    expect(invalidType.valid).toBe(false);
    expect(invalidType.error).toContain("Unsupported media format");

    const pdfType = validateMealImage("application/pdf", 100_000);
    expect(pdfType.valid).toBe(false);
  });

  it("enforces 10MB file size limit", () => {
    const oversized = validateMealImage("image/jpeg", 11 * 1024 * 1024);
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain("exceeds 10MB");
  });

  it("returns a strictly validated meal schema via fallback estimation", () => {
    const meal = getFallbackHeuristicEstimation();

    const validation = ScannedMealSchema.safeParse(meal);
    expect(validation.success).toBe(true);
    expect(meal.items.length).toBeGreaterThanOrEqual(2);
    expect(meal.totalCalories).toBeGreaterThan(300);
    expect(meal.totalProteinGrams).toBeGreaterThan(25);
    expect(meal.confidenceScore).toBeGreaterThanOrEqual(0.7);
  });

  it("scans meal image and returns structured response", async () => {
    const fakeBase64 = Buffer.from("fake-meal-image-bytes").toString("base64");
    const meal = await scanMealImage(fakeBase64, "image/jpeg");

    expect(meal).toBeDefined();
    expect(meal.mealName).toBeDefined();
    expect(meal.items.length).toBeGreaterThan(0);
    expect(meal.totalCalories).toBeGreaterThan(0);
    expect(meal.totalProteinGrams).toBeGreaterThan(0);
  });

  it("handles POST /api/nutrition/scan-meal with base64 payload", async () => {
    const fakeBase64 = Buffer.from("meal-test-pixel").toString("base64");
    const req = new NextRequest("http://localhost:3000/api/nutrition/scan-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: fakeBase64,
        mimeType: "image/jpeg",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.meal).toBeDefined();
    expect(data.meal.items.length).toBeGreaterThan(0);
    expect(data.meal.totalCalories).toBeGreaterThan(0);
  });

  it("rejects invalid input on POST /api/nutrition/scan-meal", async () => {
    const req = new NextRequest("http://localhost:3000/api/nutrition/scan-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing image field
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

import { NextRequest, NextResponse } from "next/server";
import { scanMealImage, validateMealImage } from "@/lib/meal-scanner";

// Simple in-memory rate limiter (max 20 scans per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for") || "local_client";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment before scanning another meal." },
      { status: 429 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let base64Data = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No image file provided in form data field 'image'." },
          { status: 400 }
        );
      }

      const validation = validateMealImage(file.type, file.size);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.image || typeof body.image !== "string") {
        return NextResponse.json(
          { error: "Missing or invalid 'image' string (base64) in JSON payload." },
          { status: 400 }
        );
      }

      mimeType = body.mimeType || "image/jpeg";
      base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");

      // Validate base64 size (approx 4/3 of byte size)
      const approxBytes = (base64Data.length * 3) / 4;
      const validation = validateMealImage(mimeType, approxBytes);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Expected Content-Type 'multipart/form-data' or 'application/json'." },
        { status: 415 }
      );
    }

    const meal = await scanMealImage(base64Data, mimeType);

    return NextResponse.json({
      success: true,
      meal,
    });
  } catch (err: unknown) {
    console.error("[API /api/nutrition/scan-meal] Error processing image:", err);
    return NextResponse.json(
      { error: "Failed to scan meal image due to an internal server error." },
      { status: 500 }
    );
  }
}

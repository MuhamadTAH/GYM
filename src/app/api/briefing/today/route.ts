import { NextResponse } from "next/server";
import { getDailyMorningBriefing } from "@/lib/briefing";

export async function GET() {
  try {
    const briefing = await getDailyMorningBriefing();
    return NextResponse.json({
      success: true,
      briefing,
    });
  } catch (err: unknown) {
    console.error("[API /api/briefing/today] Error generating briefing:", err);
    return NextResponse.json(
      { error: "Failed to generate today's morning briefing." },
      { status: 500 }
    );
  }
}

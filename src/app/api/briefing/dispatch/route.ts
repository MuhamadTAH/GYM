import { NextRequest, NextResponse } from "next/server";
import { getDailyMorningBriefing, dispatchDailyMorningBriefing } from "@/lib/briefing";

export async function POST(req: NextRequest) {
  try {
    let options: { webhookUrl?: string; telegramToken?: string; telegramChatId?: string } | undefined;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      options = {
        webhookUrl: body.webhookUrl,
        telegramToken: body.telegramToken,
        telegramChatId: body.telegramChatId,
      };
    }

    const briefing = await getDailyMorningBriefing();
    const result = await dispatchDailyMorningBriefing(briefing, options);

    return NextResponse.json({
      success: true,
      briefing,
      dispatchResult: result,
    });
  } catch (err: unknown) {
    console.error("[API /api/briefing/dispatch] Error dispatching briefing:", err);
    return NextResponse.json(
      { error: "Failed to dispatch morning briefing." },
      { status: 500 }
    );
  }
}

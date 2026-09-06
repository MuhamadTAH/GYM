import { db } from "../src/db";
import { coachMessages } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const messageId = process.argv[2];
  const replyText = process.argv[3];
  const badgeSummary = process.argv[4] || "Coach Response";

  if (!messageId || !replyText) {
    console.error("Usage: pnpm exec tsx scripts/reply-athlete.ts <messageId> <replyText> [badgeSummary]");
    process.exit(1);
  }

  const now = new Date().toISOString();
  await db
    .update(coachMessages)
    .set({
      status: "replied",
      replyContent: replyText,
      actionReceipt: {
        type: "COACH_ADVICE",
        summary: badgeSummary,
        badgeColor: "emerald",
      },
      repliedAt: now,
    })
    .where(eq(coachMessages.id, messageId));

  console.log(`[SUCCESS] Replied to message ${messageId}`);
}

main().catch((err) => {
  console.error("Error replying:", err);
  process.exit(1);
});

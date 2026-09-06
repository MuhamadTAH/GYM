import { db } from "../src/db";
import { coachMessages, userProfiles } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateCoachResponse } from "../src/lib/coach-chat";
import {
  getUserProfileAction,
  getTodaysWorkoutAction,
  fetchRecentSetsAction,
  submitShorthandSetAction,
  triggerManualHardStopAction,
  swapSessionOrderAction,
  postChatReplyAction,
} from "../src/app/actions";

console.log("=== GYM MCP BRIDGE DAEMON RUNNING ===");
console.log("Listening on gym.db coach_messages queue for incoming athlete messages...");

let isProcessing = false;

async function checkPending() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pending = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.status, "pending"))
      .orderBy(asc(coachMessages.createdAt));

    for (const msg of pending) {
      const users = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, msg.userId))
        .limit(1);

      const athleteName = users.length > 0 ? users[0].name : "Marcus Aurelius";

      console.log("\n================================================================");
      console.log(`🔔 [INCOMING ATHLETE MESSAGE OVER MCP]`);
      console.log(`MESSAGE ID : ${msg.id}`);
      console.log(`ATHLETE    : ${athleteName}`);
      console.log(`MESSAGE    : "${msg.content}"`);
      console.log(`TIME       : ${msg.createdAt}`);
      console.log("================================================================");

      // Load full context for AI Coach reasoning
      const profile = await getUserProfileAction();
      const activeWorkout = await getTodaysWorkoutAction();
      const recentSets = await fetchRecentSetsAction();

      const coachResponse = generateCoachResponse(msg.content, {
        profile,
        activeWorkout,
        recentSets: recentSets.map((s) => ({
          exerciseName: s.exerciseName,
          loadValue: s.loadValue,
          loadUnit: s.loadUnit,
          reps: s.reps,
          loggedRpe: s.loggedRpe,
        })),
      });

      // Execute suggested mutations if applicable
      if (coachResponse.suggestedAction) {
        const { type, payload } = coachResponse.suggestedAction;
        if (type === "log_set" && payload?.rawInput) {
          console.log(`[MCP AUTO-ACTION] Logging set: ${payload.rawInput}`);
          await submitShorthandSetAction(payload.rawInput);
        } else if (type === "safety_abort") {
          console.log(`[MCP AUTO-ACTION] Safety abort: ${payload?.reason}`);
          await triggerManualHardStopAction(payload?.reason || "Chat safety trigger");
        } else if (type === "swap_session" && payload?.currentId && payload?.nextId) {
          console.log(`[MCP AUTO-ACTION] Swapping session: ${payload.currentId} <-> ${payload.nextId}`);
          await swapSessionOrderAction(payload.currentId, payload.nextId);
        }
      }

      // Commit reply to SQLite and update status to 'replied'
      await postChatReplyAction(
        msg.id,
        coachResponse.replyText,
        coachResponse.actionReceipt
      );

      console.log(`✅ [AI COACH REPLIED OVER MCP]`);
      console.log(`REPLY TO ${athleteName}: "${coachResponse.replyText}"`);
      console.log("================================================================\n");
    }
  } catch (err) {
    console.error("[MCP Bridge Error]:", err);
  } finally {
    isProcessing = false;
  }
}

// Poll every 800ms for near-instant sub-second responses
setInterval(checkPending, 800);

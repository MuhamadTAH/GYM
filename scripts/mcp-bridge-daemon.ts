import { db } from "../src/db";
import { coachMessages, userProfiles } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";

console.log("=== GYM MCP BRIDGE DAEMON RUNNING ===");
console.log("Monitoring gym.db coach_messages queue for athlete messages over MCP...");

const seenPendingIds = new Set<string>();

async function checkPending() {
  try {
    const pending = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.status, "pending"))
      .orderBy(asc(coachMessages.createdAt));

    for (const msg of pending) {
      if (!seenPendingIds.has(msg.id)) {
        seenPendingIds.add(msg.id);

        const users = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.id, msg.userId))
          .limit(1);

        const athleteName = users.length > 0 ? users[0].name : "Marcus Aurelius";

        console.log("\n================================================================");
        console.log(`[INCOMING ATHLETE MESSAGE OVER MCP]`);
        console.log(`MESSAGE ID : ${msg.id}`);
        console.log(`ATHLETE    : ${athleteName}`);
        console.log(`MESSAGE    : "${msg.content}"`);
        console.log(`TIME       : ${msg.createdAt}`);
        console.log(`STATUS     : PENDING AI COACH RESPONSE`);
        console.log("================================================================\n");
      }
    }
  } catch (err) {
    console.error("[MCP Bridge Error]:", err);
  }
}

// Poll every 1000ms
setInterval(checkPending, 1000);

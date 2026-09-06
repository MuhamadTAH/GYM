import { db } from "../src/db";
import { coachMessages, userProfiles } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";

async function main() {
  const pending = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.status, "pending"))
    .orderBy(asc(coachMessages.createdAt));

  console.log(`PENDING_COUNT: ${pending.length}`);
  for (const m of pending) {
    const user = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, m.userId))
      .limit(1);
    const userName = user.length > 0 ? user[0].name : "Athlete";

    console.log(`----------------------------------------`);
    console.log(`ID: ${m.id}`);
    console.log(`ATHLETE: ${userName}`);
    console.log(`TIME: ${m.createdAt}`);
    console.log(`MESSAGE: "${m.content}"`);
  }
}

main().catch(console.error);

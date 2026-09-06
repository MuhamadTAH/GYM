import { db } from "../src/db";
import { coachMessages } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const msgs = await db
    .select()
    .from(coachMessages)
    .orderBy(desc(coachMessages.createdAt))
    .limit(10);

  for (const m of msgs) {
    console.log(`----------------------------------------`);
    console.log(`ID: ${m.id}`);
    console.log(`STATUS: ${m.status}`);
    console.log(`CREATED: ${m.createdAt}`);
    console.log(`CONTENT: "${m.content}"`);
    console.log(`REPLY: "${m.replyContent}"`);
  }
}

main().catch(console.error);

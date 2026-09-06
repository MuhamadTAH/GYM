import { db } from "../src/db";
import { userProfiles, workoutSessions, exerciseSets, coachMessages } from "../src/db/schema";

async function main() {
  const users = await db.select().from(userProfiles);
  const sessions = await db.select().from(workoutSessions);
  const sets = await db.select().from(exerciseSets);
  const msgs = await db.select().from(coachMessages);

  console.log("=== GYM.DB INSPECTION ===");
  console.log(`Users (${users.length}):`, users.map((u) => ({
    id: u.id,
    name: u.name,
    weight: u.currentWeightValue,
    lifts: u.baselineLifts,
  })));
  console.log(`Workout Sessions (${sessions.length})`);
  console.log(`Exercise Sets (${sets.length})`);
  console.log(`Coach Messages (${msgs.length})`);
}

main().catch(console.error);

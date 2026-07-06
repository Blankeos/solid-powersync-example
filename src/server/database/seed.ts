import { getDb } from "./client"
import { users } from "./schema"

async function seed() {
  const db = getDb()

  await db
    .insert(users)
    .values([
      { id: "account-a", name: "Account A" },
      { id: "account-b", name: "Account B" },
    ])
    .onConflictDoNothing()

  console.log("✅ Seed data inserted")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})

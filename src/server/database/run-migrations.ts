import { readFileSync } from "fs"
import { join } from "path"
import postgres from "postgres"
import { serverEnv } from "@/env.server"

const sql = postgres(serverEnv.DATABASE_URL)

async function runMigrations() {
  const migrationFile = join(process.cwd(), "migrations/001_init.sql")
  const migrationSQL = readFileSync(migrationFile, "utf-8")

  console.log("Running migrations...")

  try {
    await sql.unsafe(migrationSQL)
    console.log("Migrations completed successfully")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()

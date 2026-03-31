import postgres from "postgres"
import { serverEnv } from "@/env.server"

let sql: postgres.Sql | null = null

export function getDb() {
  if (!sql) {
    sql = postgres(serverEnv.DATABASE_URL)
  }
  return sql
}

export async function closeDb() {
  if (sql) {
    await sql.end()
    sql = null
  }
}

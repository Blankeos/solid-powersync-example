import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { serverEnv } from "@/env.server"
import * as schema from "./schema"

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!dbInstance) {
    const client = postgres(serverEnv.DATABASE_URL)
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

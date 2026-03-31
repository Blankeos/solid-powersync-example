import { PowerSyncDatabase } from "@powersync/web"
import { AppSchema } from "./schema"

let db: PowerSyncDatabase | null = null

export async function getPowerSyncDb(): Promise<PowerSyncDatabase> {
  if (db) {
    return db
  }

  db = new PowerSyncDatabase({
    database: {
      dbFilename: "solid-notes.db",
    },
    schema: AppSchema,
    flags: {
      disableSSRWarning: true,
    },
  })

  await db.init()

  return db
}

export function resetPowerSyncDb() {
  db = null
}

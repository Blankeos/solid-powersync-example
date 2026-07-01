import { PowerSyncDatabase } from "@powersync/web"
import { AppSchema, POWERSYNC_DB_FILENAME } from "./schema"

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: POWERSYNC_DB_FILENAME,
  },
  schema: AppSchema,
  flags: {
    disableSSRWarning: true,
  },
})

let initPromise: Promise<void> | null = null

export function initPowerSyncDb() {
  initPromise ??= powerSyncDb.init()
  return initPromise
}

import { powerSyncCollectionOptions } from "@tanstack/powersync-db-collection"
import { createCollection } from "@tanstack/solid-db"
import { powerSyncDb } from "./database"
import { AppSchema, noteSchema } from "./schema"

export const notesCollection = createCollection(
  powerSyncCollectionOptions({
    database: powerSyncDb,
    table: AppSchema.props.notes,
    schema: noteSchema,
    onDeserializationError: (error) => {
      console.error("Invalid note synced from PowerSync", error)
    },
  })
)

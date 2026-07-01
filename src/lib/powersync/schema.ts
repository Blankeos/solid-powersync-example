import { column, Schema, Table } from "@powersync/web"
import { z } from "zod"

export const POWERSYNC_DB_FILENAME = "solid-notes.db"

export const AppSchema = new Schema({
  notes: new Table({
    id: column.text,
    title: column.text,
    content: column.text,
    is_public: column.integer,
    owner_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
})

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  is_public: z.number(),
  owner_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Note = z.infer<typeof noteSchema>

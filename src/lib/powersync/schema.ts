import { column, Schema, Table } from "@powersync/web"

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

export type Note = {
  id: string
  title: string
  content: string
  is_public: number
  owner_id: string
  created_at: string
  updated_at: string
}

export type CreateNoteInput = Omit<Note, "id" | "created_at" | "updated_at" | "is_public"> & {
  is_public: boolean
}

export type UpdateNoteInput = Pick<Note, "id" | "title" | "content"> & {
  is_public: boolean
}

import { getDb } from "@/server/database/client"

export type Note = {
  id: string
  title: string
  content: string
  is_public: boolean
  owner_id: string
  created_at: Date
  updated_at: Date
}

export type NoteInput = {
  id?: string
  title: string
  content?: string
  is_public?: boolean
  owner_id: string
  created_at?: Date
  updated_at?: Date
}

export async function createNote(input: NoteInput) {
  const db = getDb()
  const id = input.id ?? crypto.randomUUID()
  const now = new Date()
  const notes = await db<Note[]>`
    INSERT INTO notes (id, title, content, is_public, owner_id, created_at, updated_at)
    VALUES (${id}, ${input.title}, ${input.content ?? ""}, ${input.is_public ?? false}, ${input.owner_id}, ${input.created_at ?? now}, ${input.updated_at ?? now})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      is_public = EXCLUDED.is_public,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `
  return notes[0]
}

export async function updateNote(id: string, input: Partial<NoteInput> & { owner_id: string }) {
  const db = getDb()
  const title = input.title ?? null
  const content = input.content ?? null
  const isPublic = input.is_public ?? null
  const updatedAt = input.updated_at ?? null

  const notes = await db<Note[]>`
    UPDATE notes
    SET
      title = COALESCE(${title}, title),
      content = COALESCE(${content}, content),
      is_public = COALESCE(${isPublic}, is_public),
      updated_at = COALESCE(${updatedAt}, updated_at)
    WHERE id = ${id} AND owner_id = ${input.owner_id}
    RETURNING *
  `
  return notes[0]
}

export async function deleteNote(id: string, ownerId: string) {
  const db = getDb()
  const results =
    await db`DELETE FROM notes WHERE id = ${id} AND owner_id = ${ownerId} RETURNING id`
  return results[0]
}

export async function getNoteById(id: string) {
  const db = getDb()
  const notes = await db<Note[]>`SELECT * FROM notes WHERE id = ${id}`
  return notes[0]
}

export async function getPublicNotes() {
  const db = getDb()
  return db<Note[]>`SELECT * FROM notes WHERE is_public = true ORDER BY updated_at DESC`
}

export async function getUserNotes(ownerId: string) {
  const db = getDb()
  return db<Note[]>`SELECT * FROM notes WHERE owner_id = ${ownerId} ORDER BY updated_at DESC`
}

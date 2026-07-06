import { and, desc, eq } from "drizzle-orm"
import { getDb } from "@/server/database/client"
import { notes } from "@/server/database/schema"

export type Note = typeof notes.$inferSelect
export type NoteInput = typeof notes.$inferInsert

/** PowerSync sends timestamps as epoch ms numbers — Drizzle needs Date objects. */
function toDate(v: unknown): Date {
  if (v instanceof Date) return v
  if (typeof v === "number") return new Date(v)
  if (typeof v === "string") return new Date(v)
  return new Date()
}

export async function createNote(input: NoteInput) {
  const db = getDb()
  const id = input.id ?? crypto.randomUUID()
  const now = new Date()

  const result = await db
    .insert(notes)
    .values({
      ...input,
      id,
      created_at: input.created_at ? toDate(input.created_at) : now,
      updated_at: input.updated_at ? toDate(input.updated_at) : now,
    })
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        title: input.title,
        content: input.content ?? "",
        is_public: input.is_public ?? false,
        updated_at: input.updated_at ? toDate(input.updated_at) : now,
      },
    })
    .returning()

  return result[0]
}

export async function updateNote(id: string, input: Partial<NoteInput> & { owner_id: string }) {
  const db = getDb()

  const result = await db
    .update(notes)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.is_public !== undefined && { is_public: input.is_public }),
      ...(input.updated_at !== undefined && { updated_at: toDate(input.updated_at) }),
    })
    .where(and(eq(notes.id, id), eq(notes.owner_id, input.owner_id)))
    .returning()

  return result[0]
}

export async function deleteNote(id: string, ownerId: string) {
  const db = getDb()

  const result = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.owner_id, ownerId)))
    .returning({ id: notes.id })

  return result[0]
}

export async function getNoteById(id: string) {
  const db = getDb()
  const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1)
  return result[0]
}

export async function getPublicNotes() {
  const db = getDb()
  return db.select().from(notes).where(eq(notes.is_public, true)).orderBy(desc(notes.updated_at))
}

export async function getUserNotes(ownerId: string) {
  const db = getDb()
  return db.select().from(notes).where(eq(notes.owner_id, ownerId)).orderBy(desc(notes.updated_at))
}

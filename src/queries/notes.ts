import { eq, or, useLiveQuery } from "@tanstack/solid-db"
import type { Accessor } from "solid-js"
import { notesCollection } from "@/lib/powersync"

type CreateNoteInput = {
  title: string
  content: string
  isPublic: boolean
  ownerId: string
}

type UpdateNoteInput = {
  id: string
  title: string
  content: string
  isPublic: boolean
}

export function useVisibleNotesQuery(userId: Accessor<string | undefined>) {
  return useLiveQuery((q) => {
    const id = userId()

    if (!id) {
      return null
    }

    return q
      .from({ note: notesCollection })
      .where(({ note }) => or(eq(note.owner_id, id), eq(note.is_public, 1)))
      .orderBy(({ note }) => note.updated_at, "desc")
  })
}

export function useNoteQuery(noteId: Accessor<string | undefined>) {
  return useLiveQuery((q) => {
    const id = noteId()

    if (!id) {
      return null
    }

    return q
      .from({ note: notesCollection })
      .where(({ note }) => eq(note.id, id))
      .findOne()
  })
}

export async function createNote(input: CreateNoteInput) {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  const tx = notesCollection.insert({
    id,
    title: input.title,
    content: input.content,
    is_public: input.isPublic ? 1 : 0,
    owner_id: input.ownerId,
    created_at: now,
    updated_at: now,
  })

  await tx.isPersisted.promise
  return id
}

export async function updateNote(input: UpdateNoteInput) {
  const now = new Date().toISOString()

  const tx = notesCollection.update(input.id, (draft) => {
    draft.title = input.title
    draft.content = input.content
    draft.is_public = input.isPublic ? 1 : 0
    draft.updated_at = now
  })

  await tx.isPersisted.promise
}

export async function deleteNote(id: string) {
  const tx = notesCollection.delete(id)

  await tx.isPersisted.promise
}

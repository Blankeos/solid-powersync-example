import type { Accessor } from "solid-js"
import {
  usePowerSyncExecute,
  usePowerSyncGetOne,
  usePowerSyncQuery,
} from "@/lib/powersync"
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/lib/powersync/schema"

export function useVisibleNotesQuery(userId: Accessor<string | undefined>) {
  return usePowerSyncQuery<Note>(
    () => "SELECT * FROM notes WHERE owner_id = ? OR is_public = 1 ORDER BY updated_at DESC",
    () => [userId()]
  )
}

export function useNoteQuery(noteId: Accessor<string | undefined>) {
  return usePowerSyncGetOne<Note>(
    () => "SELECT * FROM notes WHERE id = ?",
    () => [noteId()]
  )
}

export function useNoteMutations() {
  const execute = usePowerSyncExecute()

  const createNote = async (input: CreateNoteInput) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    await execute(
      `INSERT INTO notes (id, title, content, is_public, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.content, input.is_public ? 1 : 0, input.owner_id, now, now]
    )

    return id
  }

  const updateNote = async (input: UpdateNoteInput) => {
    const now = new Date().toISOString()

    await execute(
      "UPDATE notes SET title = ?, content = ?, is_public = ?, updated_at = ? WHERE id = ?",
      [input.title, input.content, input.is_public ? 1 : 0, now, input.id]
    )
  }

  const deleteNote = async (id: string) => {
    await execute("DELETE FROM notes WHERE id = ?", [id])
  }

  return {
    createNote,
    updateNote,
    deleteNote,
  }
}

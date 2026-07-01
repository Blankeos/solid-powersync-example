import { createMemo, createSignal, Show } from "solid-js"
import { navigate } from "vike/client/router"
import { useMetadata } from "vike-metadata-solid"
import { useAuthContext } from "@/context/auth.context"
import { deleteNote, updateNote, useNoteQuery } from "@/queries/notes"
import { useParams } from "@/route-tree.gen"
import getTitle from "@/utils/get-title"

export default function NoteEditorPage() {
  useMetadata({
    title: getTitle("Note Editor"),
  })

  const params = useParams({ from: "/notes/@id" })
  const noteId = createMemo(() => params().id)
  const { user } = useAuthContext()
  const userId = createMemo(() => user()?.id)

  const note = useNoteQuery(noteId)

  const [title, setTitle] = createSignal("")
  const [content, setContent] = createSignal("")
  const [isPublic, setIsPublic] = createSignal<boolean | null>(null)
  const [isSaving, setIsSaving] = createSignal(false)

  const canEdit = createMemo(() => {
    const n = note()
    const uid = userId()
    return n ? n.owner_id === uid : true
  })

  const isLoading = createMemo(() => note.isLoading)
  const notFound = createMemo(() => !note.isLoading && !note() && !note.isError)
  const hasError = createMemo(() => !note.isLoading && note.isError)

  const derivedTitle = createMemo(() => {
    const n = note()
    return n?.title ?? ""
  })
  const derivedContent = createMemo(() => {
    const n = note()
    return n?.content ?? ""
  })
  const derivedIsPublic = createMemo(() => {
    const n = note()
    return n?.is_public === 1
  })

  const handleSave = async () => {
    if (isSaving()) return

    setIsSaving(true)
    const currentUserId = userId()

    try {
      const existingNote = note()
      if (existingNote && existingNote.owner_id === currentUserId) {
        await updateNote({
          id: noteId(),
          title: title() || derivedTitle(),
          content: content() || derivedContent(),
          isPublic: isPublic() === null ? derivedIsPublic() : isPublic() === true,
        })
      }
      navigate("/notes")
    } catch (err) {
      console.error("Error saving note:", err)
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const existingNote = note()
    if (!existingNote || existingNote.owner_id !== userId()) return

    if (!confirm("Are you sure you want to delete this note?")) {
      return
    }

    try {
      await deleteNote(noteId())
      navigate("/notes")
    } catch (err) {
      console.error("Error deleting note:", err)
    }
  }

  return (
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a
            href="/notes"
            class="flex items-center gap-2 text-gray-500 text-sm transition hover:text-gray-900"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Notes
          </a>
        </div>

        <div class="flex items-center gap-2">
          <Show when={canEdit()}>
            <button
              type="button"
              onClick={handleDelete}
              class="rounded-lg px-4 py-2 font-medium text-red-600 text-sm transition hover:bg-red-50"
            >
              Delete
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving()}
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Show when={isSaving()} fallback="Save">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </Show>
            </button>
          </Show>
        </div>
      </div>

      <Show when={isLoading()}>
        <div class="flex items-center justify-center py-20">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      </Show>

      <Show when={notFound()}>
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="mb-4 rounded-full bg-gray-100 p-4">
            <svg
              class="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 class="mb-2 font-semibold text-gray-900 text-xl">Note not found</h2>
          <p class="mb-6 text-gray-500">
            The note you're looking for doesn't exist or has been deleted.
          </p>
          <a
            href="/notes"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
          >
            Back to Notes
          </a>
        </div>
      </Show>

      <Show when={hasError()}>
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="mb-4 rounded-full bg-red-100 p-4">
            <svg class="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 class="mb-2 font-semibold text-gray-900 text-xl">Error loading note</h2>
          <p class="mb-6 text-gray-500">Something went wrong while loading this note.</p>
          <a
            href="/notes"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
          >
            Back to Notes
          </a>
        </div>
      </Show>

      <Show when={!isLoading() && !notFound() && !hasError()}>
        <div class="mx-auto max-w-2xl">
          <input
            type="text"
            placeholder="Note title"
            value={title() || derivedTitle()}
            onInput={(e) => setTitle(e.currentTarget.value)}
            disabled={!canEdit()}
            class="mb-4 w-full border-0 bg-transparent font-semibold text-3xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0 disabled:text-gray-500"
          />

          <div class="mb-6 flex items-center gap-3 text-gray-400 text-sm">
            <span>Owner: {note()?.owner_id.slice(0, 8)}...</span>
            <span>•</span>
            <span>Created {note() ? new Date(note()!.created_at).toLocaleDateString() : ""}</span>
          </div>

          <textarea
            placeholder="Start writing..."
            value={content() || derivedContent()}
            onInput={(e) => setContent(e.currentTarget.value)}
            disabled={!canEdit()}
            class="mb-6 min-h-[300px] w-full resize-none border-0 bg-transparent text-base text-gray-700 leading-relaxed placeholder-gray-300 focus:outline-none focus:ring-0 disabled:text-gray-500"
          />

          <Show when={canEdit()}>
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <svg
                    class="h-5 w-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <Show
                      when={isPublic() ?? derivedIsPublic()}
                      fallback={
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={1.5}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      }
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={1.5}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </Show>
                  </svg>
                  <span class="font-medium text-gray-900">
                    {(isPublic() ?? derivedIsPublic()) ? "Public" : "Private"}
                  </span>
                </div>
                <p class="ml-7 text-gray-500 text-sm">
                  {(isPublic() ?? derivedIsPublic())
                    ? "This note is visible to all users"
                    : "Only you can see this note"}
                </p>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isPublic() ?? derivedIsPublic()}
                  onChange={(e) => setIsPublic(e.currentTarget.checked)}
                  class="peer sr-only"
                />
                <div class="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-green-500 peer-focus:ring-2 peer-focus:ring-green-300" />
                <div class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
              </label>
            </div>
          </Show>

          <Show when={!canEdit()}>
            <div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span class="text-sm">
                This is a public note owned by another user. You can only view it.
              </span>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

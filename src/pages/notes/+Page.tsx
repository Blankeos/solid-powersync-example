import { createMemo, For, Show } from "solid-js"
import { navigate } from "vike/client/router"
import { useAuthContext } from "@/context/auth.context"
import { usePowerSyncQuery } from "@/context/powersync.context"
import { formatDistanceToNow } from "@/utils/format-distance"

interface Note {
  id: string
  title: string
  content: string
  is_public: number
  owner_id: string
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const { user } = useAuthContext()

  const [notes] = usePowerSyncQuery<Note>(
    () => `SELECT * FROM notes WHERE owner_id = ? OR is_public = 1 ORDER BY updated_at DESC`,
    () => [user()?.id]
  )

  const truncateContent = (content: string, maxLength = 100) => {
    if (!content) return "No content"
    if (content.length <= maxLength) return content
    return `${content.slice(0, maxLength).trim()}...`
  }

  return (
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="font-semibold text-2xl text-gray-900">My Notes</h1>
        <button
          type="button"
          onClick={() => navigate("/notes/new")}
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Note
        </button>
      </div>

      <Show when={notes().length === 0}>
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 class="mb-2 font-medium text-gray-900 text-lg">No notes yet</h3>
          <p class="mb-6 text-gray-500">Create your first note to get started</p>
          <button
            type="button"
            onClick={() => navigate("/notes/new")}
            class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Note
          </button>
        </div>
      </Show>

      <Show when={notes().length > 0}>
        <div class="grid gap-3">
          <For each={notes()}>
            {(note) => (
              <a
                href={`/notes/${note.id}`}
                class="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="mb-1 flex items-center gap-2">
                      <h3 class="truncate font-medium text-gray-900">
                        {note.title || "Untitled Note"}
                      </h3>
                      <span
                        class={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${
                          note.is_public
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {note.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                    <p class="line-clamp-2 text-gray-500 text-sm">
                      {truncateContent(note.content)}
                    </p>
                    <div class="mt-2 flex items-center gap-3 text-gray-400 text-xs">
                      <span>Owner: {note.owner_id.slice(0, 8)}...</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(note.updated_at)}</span>
                    </div>
                  </div>
                  <svg
                    class="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </a>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

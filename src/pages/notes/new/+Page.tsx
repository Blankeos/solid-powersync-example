import { createMemo, createSignal, Show } from "solid-js"
import { navigate } from "vike/client/router"
import { useMetadata } from "vike-metadata-solid"
import { useAuthContext } from "@/context/auth.context"
import { usePowerSyncExecute } from "@/context/powersync.context"
import getTitle from "@/utils/get-title"

export default function NewNotePage() {
  useMetadata({
    title: getTitle("New Note"),
  })

  const { user } = useAuthContext()
  const userId = createMemo(() => user()?.id)
  const execute = usePowerSyncExecute()

  const [title, setTitle] = createSignal("")
  const [content, setContent] = createSignal("")
  const [isPublic, setIsPublic] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)

  const handleSave = async () => {
    if (isSaving()) return

    setIsSaving(true)
    const now = new Date().toISOString()
    const currentUserId = userId()

    try {
      const newId = crypto.randomUUID()
      await execute(
        `INSERT INTO notes (id, title, content, is_public, owner_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId, title(), content(), isPublic() ? 1 : 0, currentUserId, now, now]
      )
      navigate("/notes")
    } catch (err) {
      console.error("Error saving note:", err)
      setIsSaving(false)
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
      </div>

      <div class="mx-auto max-w-2xl">
        <input
          type="text"
          placeholder="Note title"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          class="mb-4 w-full border-0 bg-transparent font-semibold text-3xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
        />

        <textarea
          placeholder="Start writing..."
          value={content()}
          onInput={(e) => setContent(e.currentTarget.value)}
          class="mb-6 min-h-[300px] w-full resize-none border-0 bg-transparent text-base text-gray-700 leading-relaxed placeholder-gray-300 focus:outline-none focus:ring-0"
        />

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
                  when={isPublic()}
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
              <span class="font-medium text-gray-900">{isPublic() ? "Public" : "Private"}</span>
            </div>
            <p class="ml-7 text-gray-500 text-sm">
              {isPublic()
                ? "This note will be visible to all users"
                : "Only you will see this note"}
            </p>
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isPublic()}
              onChange={(e) => setIsPublic(e.currentTarget.checked)}
              class="peer sr-only"
            />
            <div class="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-green-500 peer-focus:ring-2 peer-focus:ring-green-300" />
            <div class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
          </label>
        </div>
      </div>
    </div>
  )
}

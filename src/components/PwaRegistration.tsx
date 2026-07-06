import { useRegisterSW } from "virtual:pwa-register/solid"
import { Show } from "solid-js"

/**
 * Registers the Workbox service worker and surfaces offline / update state.
 * Data offline behavior is handled by PowerSync + SQLite; this caches the app shell.
 */
export function PwaRegistration() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (import.meta.env.DEV) {
        console.info("[PWA] service worker registered:", swUrl, registration)
      }
    },
    onRegisterError(error) {
      console.error("[PWA] service worker registration failed:", error)
    },
  })

  const close = () => {
    offlineReady[1](false)
    needRefresh[1](false)
  }

  const reload = () => {
    void updateServiceWorker(true)
  }

  return (
    <Show when={offlineReady[0]() || needRefresh[0]()}>
      <div
        aria-live="polite"
        class="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
      >
        <Show when={offlineReady[0]()}>
          <p class="mb-3 text-gray-700 text-sm">App ready to work offline.</p>
        </Show>
        <Show when={needRefresh[0]()}>
          <p class="mb-3 text-gray-700 text-sm">New version available.</p>
        </Show>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100"
            onClick={close}
          >
            Dismiss
          </button>
          <Show when={needRefresh[0]()}>
            <button
              type="button"
              class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              onClick={reload}
            >
              Reload
            </button>
          </Show>
        </div>
      </div>
    </Show>
  )
}

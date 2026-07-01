import { createEffect, createMemo, type FlowProps, Show, Suspense } from "solid-js"
import { navigate } from "vike/client/router"
import { useMetadata } from "vike-metadata-solid"
import { useAuthContext } from "@/context/auth.context"
import { usePowerSync } from "@/lib/powersync"
import { getRoute } from "@/route-tree.gen"
import getTitle from "@/utils/get-title"

function NotesLayoutContent(props: FlowProps) {
  useMetadata({
    title: getTitle("Notes"),
  })
  const { user, loading, logout } = useAuthContext()
  const { syncStatus, isReady } = usePowerSync()

  const isAuthenticated = createMemo(() => !!user())

  const statusColor = createMemo(() => {
    const status = syncStatus()
    if (status === "connected") return "bg-green-500"
    if (status === "connecting") return "bg-yellow-500"
    if (status === "error") return "bg-red-500"
    return "bg-gray-400"
  })

  const statusText = createMemo(() => {
    const status = syncStatus()
    if (status === "connected") return "Connected"
    if (status === "connecting") return "Connecting..."
    if (status === "error") return "Connection Error"
    return "Disconnected"
  })

  createEffect(() => {
    if (!loading() && !isAuthenticated()) {
      navigate(getRoute("/login"))
    }
  })

  const handleLogout = async () => {
    await logout()
    navigate(getRoute("/login"))
  }

  return (
    <Show
      when={!loading() && isAuthenticated()}
      fallback={
        <div class="flex min-h-screen items-center justify-center">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      }
    >
      <div class="min-h-screen bg-gray-50">
        <header class="sticky top-0 z-10 border-gray-200 border-b bg-white/80 backdrop-blur-md">
          <div class="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <div class="flex items-center gap-4">
              <a href={getRoute("/notes")} class="font-semibold text-gray-900 hover:text-blue-600">
                Solid Notes
              </a>
              <div class="flex items-center gap-2">
                <div class={`h-2 w-2 rounded-full ${statusColor()}`} />
                <span class="text-gray-500 text-sm">{statusText()}</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-gray-500 text-sm">User: {user()?.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                class="text-gray-500 text-sm transition hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-4xl">
          <Suspense
            fallback={
              <div class="flex items-center justify-center py-20">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            }
          >
            <Show
              when={isReady()}
              fallback={
                <div class="flex flex-col items-center justify-center py-20 text-gray-500">
                  <div class="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                  <p>Initializing local database...</p>
                </div>
              }
            >
              {props.children}
            </Show>
          </Suspense>
        </main>
      </div>
    </Show>
  )
}

export default function NotesLayout(props: FlowProps) {
  return <NotesLayoutContent>{props.children}</NotesLayoutContent>
}

import { createResource, createSignal, For, Show } from "solid-js"
import { navigate } from "vike/client/router"
import { useMetadata } from "vike-metadata-solid"
import { useAuthContext } from "@/context/auth.context"
import { getRoute } from "@/route-tree.gen"
import getTitle from "@/utils/get-title"

function LoginPageContent() {
  useMetadata({
    title: getTitle("Login"),
  })

  const auth = useAuthContext()
  const [isLoading, setIsLoading] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  const [accounts] = createResource(() => auth.accounts())

  const handleLogin = async (accountId: string) => {
    setIsLoading(accountId)
    setError(null)

    try {
      await auth.login(accountId)
      navigate(getRoute("/notes"))
    } catch (err) {
      setError("Login failed. Please try again.")
      setIsLoading(null)
    }
  }

  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div class="mb-8 text-center">
        <h1 class="mb-2 font-semibold text-3xl text-gray-900">Welcome to Solid Notes</h1>
        <p class="text-gray-500">Select an account to get started</p>
      </div>

      <Show when={error()}>
        <div class="mb-6 w-full max-w-sm rounded-lg bg-red-50 px-4 py-3 text-red-600 text-sm">
          {error()}
        </div>
      </Show>

      <div class="grid w-full max-w-sm gap-4">
        <For each={accounts()}>
          {(account) => (
            <button
              type="button"
              onClick={() => handleLogin(account.id)}
              disabled={isLoading() !== null}
              class={`group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isLoading() === account.id ? "opacity-60" : ""
              }`}
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 font-semibold text-white">
                <Show when={isLoading() === account.id} fallback={account.name[0]}>
                  <div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </Show>
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{account.name}</h3>
                <p class="text-gray-400 text-sm">{account.id}</p>
              </div>
              <div class="opacity-0 transition-opacity group-hover:opacity-100">
                <svg
                  class="h-5 w-5 text-gray-400"
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
            </button>
          )}
        </For>
      </div>

      <a href={getRoute("/")} class="mt-8 text-gray-400 text-sm hover:text-gray-600">
        Back to home
      </a>
    </div>
  )
}

export default function LoginPage() {
  return <LoginPageContent />
}

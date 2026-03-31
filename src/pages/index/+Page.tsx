import { useMetadata } from "vike-metadata-solid"
import getTitle from "@/utils/get-title"

export default function Page() {
  useMetadata({
    title: getTitle("Home"),
  })

  return (
    <div class="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 class="mb-4 font-bold text-4xl">Solid Notes</h1>
      <p class="mb-8 text-gray-600 text-lg">Local-first notes with PowerSync</p>
      <a
        href="/login"
        class="rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
      >
        Get Started
      </a>
    </div>
  )
}

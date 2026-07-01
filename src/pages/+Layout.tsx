import type { FlowProps } from "solid-js"
import { useMetadata } from "vike-metadata-solid"
import { AuthContextProvider } from "@/context/auth.context"
import { PowerSyncProvider } from "@/lib/powersync"
import getTitle from "@/utils/get-title"
import "@/app.css"

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Local-first notes app with PowerSync",
})

export default function RootLayout(props: FlowProps) {
  return (
    <AuthContextProvider>
      <PowerSyncProvider>{props.children}</PowerSyncProvider>
    </AuthContextProvider>
  )
}

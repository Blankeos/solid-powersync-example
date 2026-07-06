import type { FlowProps } from "solid-js"
import { useMetadata } from "vike-metadata-solid"
import { PwaRegistration } from "@/components/PwaRegistration"
import { AuthContextProvider } from "@/context/auth.context"
import { PowerSyncProvider } from "@/context/powersync.context"
import getTitle from "@/utils/get-title"
import "@/app.css"

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Local-first notes app with PowerSync",
  manifest: "/manifest.webmanifest",
  viewport: {
    themeColor: "#2563eb",
  },
})

export default function RootLayout(props: FlowProps) {
  return (
    <AuthContextProvider>
      <PowerSyncProvider>
        {props.children}
        <PwaRegistration />
      </PowerSyncProvider>
    </AuthContextProvider>
  )
}

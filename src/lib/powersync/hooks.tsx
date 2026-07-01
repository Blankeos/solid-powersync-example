import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  type ParentComponent,
  useContext,
} from "solid-js"
import { useAuthContext } from "@/context/auth.context"
import { getBackendConnector, resetBackendConnector } from "./connector"
import { initPowerSyncDb, powerSyncDb } from "./database"

export type PowerSyncStatus = "offline" | "syncing" | "synced" | "error"

type PowerSyncContextValue = {
  isReady: () => boolean
  syncStatus: () => PowerSyncStatus
}

const PowerSyncContext = createContext<PowerSyncContextValue>()

export function usePowerSync(): PowerSyncContextValue {
  const context = useContext(PowerSyncContext)
  if (!context) {
    throw new Error("usePowerSync must be used within a PowerSyncProvider")
  }
  return context
}

function getSyncStatusMessage(
  connected: boolean,
  connecting: boolean,
  downloadError?: Error,
  uploadError?: Error
): PowerSyncStatus {
  if (downloadError || uploadError) return "error"
  if (connected) return "synced"
  if (connecting) return "syncing"
  return "offline"
}

export const PowerSyncProvider: ParentComponent = (props) => {
  const { user } = useAuthContext()
  const [isReady, setIsReady] = createSignal(false)
  const [syncStatus, setSyncStatus] = createSignal<PowerSyncStatus>("offline")

  let hasConnected = false
  let connecting = false
  let disposeStatusListener: (() => void) | undefined

  createEffect(() => {
    const currentUser = user()
    const token = sessionStorage.getItem("powersync_token")
    const currentSessionId = sessionStorage.getItem("session_id") ?? undefined

    if (!currentUser || !token) {
      setIsReady(false)
      setSyncStatus("offline")
      return
    }

    if (hasConnected || connecting) {
      return
    }

    connecting = true
    setSyncStatus("syncing")

    ;(async () => {
      try {
        const connector = getBackendConnector()
        connector.updateAuth(
          {
            userId: currentUser.id,
            powersyncToken: token,
          },
          currentSessionId
        )

        await initPowerSyncDb()

        disposeStatusListener = powerSyncDb.registerListener({
          statusChanged: (status) => {
            const dataFlow = status.dataFlowStatus
            setSyncStatus(
              getSyncStatusMessage(
                status.connected,
                status.connecting,
                dataFlow?.downloadError,
                dataFlow?.uploadError
              )
            )
          },
        })

        await powerSyncDb.connect(connector)

        hasConnected = true
        setIsReady(true)
      } catch (error) {
        console.error("PowerSync connection error:", error)
        setSyncStatus("error")
      } finally {
        connecting = false
      }
    })()
  })

  onCleanup(() => {
    disposeStatusListener?.()
    resetBackendConnector()
  })

  return (
    <PowerSyncContext.Provider value={{ isReady, syncStatus }}>
      {props.children}
    </PowerSyncContext.Provider>
  )
}

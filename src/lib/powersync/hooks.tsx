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
  let connectedUserId: string | undefined
  let connectionRun = 0
  let disposeStatusListener: (() => void) | undefined

  const disposeConnectionState = () => {
    disposeStatusListener?.()
    disposeStatusListener = undefined
    resetBackendConnector()
    hasConnected = false
    connecting = false
    connectedUserId = undefined
  }

  const disconnectPowerSync = async () => {
    if (!powerSyncDb.connected && !powerSyncDb.connecting) {
      return
    }

    try {
      await powerSyncDb.disconnect()
    } catch (error) {
      console.error("PowerSync disconnect error:", error)
    }
  }

  createEffect(() => {
    const currentUser = user()
    const token = sessionStorage.getItem("powersync_token")
    const currentSessionId = sessionStorage.getItem("session_id") ?? undefined

    if (!currentUser || !token) {
      connectionRun += 1
      disposeConnectionState()
      void disconnectPowerSync()
      setIsReady(false)
      setSyncStatus("offline")
      return
    }

    if (hasConnected && connectedUserId === currentUser.id) {
      return
    }

    if (connecting) return

    const currentRun = ++connectionRun
    connecting = true
    setSyncStatus("syncing")

    ;(async () => {
      try {
        if (hasConnected && connectedUserId !== currentUser.id) {
          disposeConnectionState()
          await disconnectPowerSync()
        }

        if (currentRun !== connectionRun) return

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
            if (currentRun !== connectionRun) return

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

        if (currentRun !== connectionRun) return

        hasConnected = true
        connectedUserId = currentUser.id
        setIsReady(true)
      } catch (error) {
        if (currentRun !== connectionRun) return

        console.error("PowerSync connection error:", error)
        setSyncStatus("error")
      } finally {
        if (currentRun === connectionRun) {
          connecting = false
        }
      }
    })()
  })

  onCleanup(() => {
    connectionRun += 1
    disposeConnectionState()
    void disconnectPowerSync()
  })

  return (
    <PowerSyncContext.Provider value={{ isReady, syncStatus }}>
      {props.children}
    </PowerSyncContext.Provider>
  )
}

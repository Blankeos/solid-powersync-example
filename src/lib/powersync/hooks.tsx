import type { PowerSyncDatabase } from "@powersync/web"
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  type ParentComponent,
  useContext,
} from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { useAuthContext } from "@/context/auth.context"
import { getBackendConnector, resetBackendConnector } from "./connector"
import { getPowerSyncDb, resetPowerSyncDb } from "./database"

type PowerSyncContextValue = {
  db: () => PowerSyncDatabase | null
  isReady: () => boolean
  syncStatus: () => string
}

const PowerSyncContext = createContext<PowerSyncContextValue>()

export function usePowerSync(): PowerSyncContextValue {
  const context = useContext(PowerSyncContext)
  if (!context) {
    throw new Error("usePowerSync must be used within a PowerSyncProvider")
  }
  return context
}

export type QueryResult<T> = [() => T[], () => boolean, () => Error | null]

export function usePowerSyncQuery<T = unknown>(
  query: () => string,
  params?: () => unknown[]
): QueryResult<T> {
  const { db, isReady } = usePowerSync()

  const [state, setState] = createStore<{
    data: T[]
    loading: boolean
    error: Error | null
  }>({
    data: [],
    loading: true,
    error: null,
  })

  let abortController: AbortController | null = null

  createEffect(() => {
    const database = db()
    const ready = isReady()

    if (!database || !ready) {
      setState({ data: [], loading: false, error: null })
      return
    }

    const sql = query()
    const queryParams = params?.() ?? []

    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()

    setState({ loading: true, error: null })

    database.watch(
      sql,
      queryParams,
      {
        onResult: (result) => {
          try {
            const rows = result.rows?._array ?? []
            setState("data", reconcile(rows))
            setState({ loading: false })
          } catch (err) {
            setState({
              error: err instanceof Error ? err : new Error(String(err)),
              loading: false,
            })
          }
        },
        onError: (error) => {
          setState({
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          })
        },
      },
      { signal: abortController.signal }
    )
  })

  onCleanup(() => {
    if (abortController) {
      abortController.abort()
    }
  })

  return [() => state.data, () => state.loading, () => state.error]
}

export type GetOneResult<T> = [() => T | null, () => boolean, () => Error | null]

export function usePowerSyncGetOne<T = unknown>(
  query: () => string,
  params?: () => unknown[]
): GetOneResult<T> {
  const { db, isReady } = usePowerSync()

  const [state, setState] = createStore<{
    data: T | null
    loading: boolean
    error: Error | null
  }>({
    data: null,
    loading: true,
    error: null,
  })

  createEffect(async () => {
    const database = db()
    const ready = isReady()

    if (!database || !ready) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const sql = query()
    const queryParams = params?.() ?? []

    setState({ loading: true, error: null })

    try {
      const result = await database.get<T | null>(sql, queryParams)
      setState({ data: result ?? null, loading: false })
    } catch (err) {
      setState({
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      })
    }
  })

  return [() => state.data, () => state.loading, () => state.error]
}

export function usePowerSyncExecute(): (sql: string, params?: unknown[]) => Promise<void> {
  const { db } = usePowerSync()

  return async (sql: string, params?: unknown[]) => {
    const database = db()
    if (!database) {
      throw new Error("Database not connected")
    }
    await database.execute(sql, params ?? [])
  }
}

async function getPowerSyncToken(
  userId: string
): Promise<{ token: string; sessionId: string } | null> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: userId }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      token: data.powersync_token,
      sessionId: data.session_id,
    }
  } catch {
    return null
  }
}

function getSyncStatusMessage(
  connected: boolean,
  connecting: boolean,
  downloadError?: Error,
  uploadError?: Error
): string {
  if (downloadError) return "error"
  if (uploadError) return "error"
  if (connecting) return "connecting"
  if (connected) return "connected"
  return "disconnected"
}

export const PowerSyncProvider: ParentComponent = (props) => {
  const auth = useAuthContext()
  const [db, setDb] = createSignal<PowerSyncDatabase | null>(null)
  const [isReady, setIsReady] = createSignal(false)
  const [syncStatus, setSyncStatus] = createSignal("disconnected")

  let hasConnected = false
  let connecting = false
  let statusListener: (() => void) | null = null

  createEffect(() => {
    const currentUser = auth.user()

    if (!currentUser) {
      if (db() && hasConnected) {
        if (statusListener) {
          statusListener()
          statusListener = null
        }
        setDb(null)
        setIsReady(false)
        setSyncStatus("disconnected")
        resetPowerSyncDb()
        resetBackendConnector()
        hasConnected = false
        connecting = false
      }
      return
    }

    if (connecting || db()) {
      return
    }

    connecting = true

    ;(async () => {
      try {
        setSyncStatus("connecting")

        let powersyncToken: string | null = null
        let sessionId: string | null = null

        if (typeof window !== "undefined") {
          powersyncToken = window.sessionStorage.getItem("powersync_token")
          sessionId = window.sessionStorage.getItem("session_id")
        }

        if (!powersyncToken || !sessionId) {
          const tokenData = await getPowerSyncToken(currentUser.id)
          if (!tokenData) {
            throw new Error("Failed to get PowerSync token")
          }
          powersyncToken = tokenData.token
          sessionId = tokenData.sessionId
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("powersync_token", powersyncToken)
            window.sessionStorage.setItem("session_id", sessionId)
          }
        }

        const connector = getBackendConnector()
        connector.updateAuth(
          {
            userId: currentUser.id,
            powersyncToken,
          },
          sessionId
        )

        const database = await getPowerSyncDb()

        statusListener = database.registerListener({
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

        await database.connect(connector)

        hasConnected = true
        setDb(database)
        setIsReady(true)
      } catch (error) {
        console.error("PowerSync connection error:", error)
        setSyncStatus("error")
        connecting = false
      }
    })()
  })

  onCleanup(() => {
    if (statusListener) {
      statusListener()
    }
    if (db()) {
      resetPowerSyncDb()
      resetBackendConnector()
    }
  })

  return (
    <PowerSyncContext.Provider value={{ db, isReady, syncStatus }}>
      {props.children}
    </PowerSyncContext.Provider>
  )
}

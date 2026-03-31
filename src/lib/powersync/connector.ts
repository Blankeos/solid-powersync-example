import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from "@powersync/web"
import { publicEnv } from "@/env.public"

export type AuthState = {
  userId: string | null
  powersyncToken: string | null
}

export class BackendConnector implements PowerSyncBackendConnector {
  private currentAuth: AuthState = {
    userId: null,
    powersyncToken: null,
  }

  private backendUrl: string
  private accessToken: string | null = null

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || publicEnv.PUBLIC_POWERSYNC_URL
  }

  async fetchCredentials() {
    if (!this.currentAuth.powersyncToken || !this.currentAuth.userId) {
      return null
    }

    return {
      endpoint: this.backendUrl,
      token: this.currentAuth.powersyncToken,
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(100)

    if (!batch) {
      return
    }

    try {
      for (const entry of batch.crud) {
        const serialized = {
          op: entry.op,
          table: entry.table,
          id: entry.id,
          opData: entry.opData,
        }

        const response = await fetch("/api/notes/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": this.accessToken || "",
            "X-User-ID": this.currentAuth.userId || "",
          },
          body: JSON.stringify({ operation: serialized }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Upload failed: ${response.statusText} - ${errorText}`)
        }
      }

      await batch.complete()
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  updateAuth(auth: AuthState, accessToken?: string): void {
    this.currentAuth = auth
    this.accessToken = accessToken || null
  }

  get currentAuthState(): AuthState {
    return { ...this.currentAuth }
  }
}

let connector: BackendConnector | null = null

export function getBackendConnector(): BackendConnector {
  if (!connector) {
    connector = new BackendConnector()
  }
  return connector
}

export function resetBackendConnector(): void {
  connector = null
}

import { hc } from "hono/client"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppRouter } from "@/server/_app"
import type { ApiErrorResponse } from "@/server/lib/error"
import { formatZodIssues } from "@/utils/format-zod-issues"

/** Use this on ssr. */
export const initHonoClient = (
  baseUrl: string,
  ssrProxyParams?: {
    requestHeaders?: Record<string, string>
    responseHeaders?: Headers
  }
) =>
  hc<AppRouter>(`${baseUrl}/api`, {
    headers: ssrProxyParams?.requestHeaders ?? {},
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await fetch(input, { ...init, cache: "no-store" })

      if (!response.ok) {
        const json: ApiErrorResponse = await response.json()

        const errorMessage: string | undefined = (() => {
          // Attempt to parse ZodError as a readable message
          if ((json as any)?.error?.name === "ZodError")
            return formatZodIssues((json as any).error.issues)

          return json.error.message
        })()

        throw new HTTPException(response.status as ContentfulStatusCode, {
          message: errorMessage || response.statusText,
          cause: json.error.cause,
          res: response,
        })
      }

      // This is where we proxy it back.
      for (const [key, value] of response.headers) {
        const lowerKey = key.toLowerCase()

        // 🟢 ONLY copy cookies. Everything else belongs to the internal request.
        if (lowerKey === "set-cookie") {
          ssrProxyParams?.responseHeaders?.append(key, value) // Use append, not set, for multiple cookies
        }

        // If you specifically need to proxy specific custom headers, add them here.
        // if (lowerKey === "x-my-custom-header") { ... }
      }

      return response
    },
  })

const getSessionHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {}
  const sessionId = window.sessionStorage.getItem("session_id")
  const userId = window.sessionStorage.getItem("user_id")
  const headers: Record<string, string> = {}
  if (sessionId) headers["X-Session-ID"] = sessionId
  if (userId) headers["X-User-ID"] = userId
  return headers
}

const baseurl = typeof window === "undefined" ? "" : (window?.location?.origin ?? "")
/** Use this on the client. */
export const honoClient = initHonoClient(baseurl)
export const honoClientWithSession = () =>
  hc<AppRouter>(`${baseurl}/api`, {
    headers: () => getSessionHeaders(),
  })

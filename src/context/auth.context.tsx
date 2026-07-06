import { type Accessor, createSignal, type FlowComponent, onMount } from "solid-js"
import { honoClientWithSession } from "@/lib/hono-client"
import { createStrictContext } from "@/utils/create-strict-context"

export type User = {
  id: string
  name: string
}

export type Account = {
  id: string
  name: string
}

type AuthContextValue = {
  user: Accessor<User | null>
  loading: Accessor<boolean>
  accounts: () => Promise<Account[]>
  login: (accountId: string) => Promise<void>
  logout: () => Promise<void>
}

const [useAuthContext, Provider] = createStrictContext<AuthContextValue>("AuthContext")

export { useAuthContext }

function readStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null
  }
  const id = sessionStorage.getItem("user_id")
  const name = sessionStorage.getItem("user_name")
  if (id && name) {
    return { id, name }
  }
  return null
}

export const AuthContextProvider: FlowComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(readStoredUser())
  const [loading, setLoading] = createSignal(false)

  onMount(() => {
    const stored = readStoredUser()
    if (stored) {
      setUser(stored)
    }
    setLoading(false)
  })

  const accounts = async (): Promise<Account[]> => {
    const response = await honoClientWithSession().auth.accounts.$get()
    const result = await response.json()
    return result.accounts
  }

  const login = async (accountId: string): Promise<void> => {
    const response = await honoClientWithSession().auth.login.$post({
      json: { account_id: accountId },
    })
    const result = await response.json()

    if ("user" in result) {
      setUser(result.user)
      sessionStorage.setItem("session_id", result.session_id)
      sessionStorage.setItem("user_id", result.user.id)
      sessionStorage.setItem("user_name", result.user.name)
      sessionStorage.setItem("powersync_token", result.powersync_token)
      setLoading(false)
    } else {
      throw new Error(result.error || "Login failed")
    }
  }

  const logout = async (): Promise<void> => {
    await honoClientWithSession().auth.logout.$post()
    setUser(null)
    sessionStorage.removeItem("session_id")
    sessionStorage.removeItem("user_id")
    sessionStorage.removeItem("user_name")
    sessionStorage.removeItem("powersync_token")
  }

  return (
    <Provider
      value={{
        user,
        loading,
        accounts,
        login,
        logout,
      }}
    >
      {props.children}
    </Provider>
  )
}

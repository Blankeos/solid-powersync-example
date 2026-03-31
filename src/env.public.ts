// Public environment variables - safe for browser and server
// These are exposed to the client via Vite's import.meta.env

export const publicEnv = {
  get PUBLIC_BASE_ORIGIN() {
    return (import.meta.env.PUBLIC_BASE_ORIGIN as string | undefined) ?? "http://localhost:3000"
  },
  get PUBLIC_POWERSYNC_URL() {
    return (import.meta.env.PUBLIC_POWERSYNC_URL as string | undefined) ?? "http://localhost:8080"
  },
}

export type Env = typeof publicEnv

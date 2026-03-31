// Server-only environment variables
// NEVER import this file in client-side code (pages, components, lib/powersync/*)
// These use process.env which only exists in Node.js/Bun runtime

export const serverEnv = {
  get PORT(): number {
    if (typeof process === "undefined") {
      throw new Error("serverEnv can only be used on the server side")
    }
    return process.env.PORT ? parseInt(process.env.PORT) : 3000
  },
  get NODE_ENV(): "development" | "production" | "test" {
    if (typeof process === "undefined") {
      throw new Error("serverEnv can only be used on the server side")
    }
    return (process.env.NODE_ENV as "development" | "production" | "test") ?? "development"
  },
  get DATABASE_URL(): string {
    if (typeof process === "undefined") {
      throw new Error("serverEnv can only be used on the server side")
    }
    return process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/solid_notes"
  },
}

// Legacy export for backwards compatibility
export const privateEnv = serverEnv

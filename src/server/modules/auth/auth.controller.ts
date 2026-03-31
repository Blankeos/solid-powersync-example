import { Hono } from "hono"
import { SignJWT } from "jose"
import { nanoid } from "nanoid"

const DEMO_ACCOUNTS = [
  { id: "account-a", name: "Account A" },
  { id: "account-b", name: "Account B" },
]

const sessions = new Map<string, { userId: string; name: string }>()

const POWERSYNC_JWT_SECRET_BASE64 = "UXzkfL7cdG2DcRk510iF_BVjPA0hYc8jdLCVH_wju30"
const POWERSYNC_JWT_SECRET = Uint8Array.from(
  atob(POWERSYNC_JWT_SECRET_BASE64.replace(/_/g, "/").replace(/-/g, "+")),
  (c) => c.charCodeAt(0)
)
const POWERSYNC_JWT_AUDIENCE = "http://localhost:8080"

export const authController = new Hono()
  .get("/accounts", async (c) => {
    return c.json({ accounts: DEMO_ACCOUNTS })
  })
  .post("/login", async (c) => {
    const body = await c.req.json()
    const { account_id } = body

    const account = DEMO_ACCOUNTS.find((a) => a.id === account_id)
    if (!account) {
      return c.json({ error: "Invalid account" }, 400)
    }

    const sessionId = nanoid(32)
    sessions.set(sessionId, { userId: account.id, name: account.name })

    const token = await generatePowerSyncToken(account.id)

    return c.json({
      user: { id: account.id, name: account.name },
      session_id: sessionId,
      powersync_token: token,
    })
  })
  .post("/logout", async (c) => {
    const sessionId = c.req.header("X-Session-ID")
    if (sessionId) {
      sessions.delete(sessionId)
    }
    return c.json({ success: true })
  })
  .get("/session", async (c) => {
    const sessionId = c.req.header("X-Session-ID")
    if (!sessionId) {
      return c.json({ user: null })
    }

    const session = sessions.get(sessionId)
    if (!session) {
      return c.json({ user: null })
    }

    return c.json({
      user: { id: session.userId, name: session.name },
    })
  })

async function generatePowerSyncToken(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256", kid: "dev-key-1" })
    .setIssuedAt()
    .setAudience(POWERSYNC_JWT_AUDIENCE)
    .setSubject(userId)
    .setExpirationTime("12h")
    .sign(POWERSYNC_JWT_SECRET)

  return token
}

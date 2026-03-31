import { apply, serve } from "@photonjs/hono"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { serverEnv } from "@/env.server"
import { appRouter } from "./_app"
import type { ApiErrorResponse } from "./lib/error"

const app = new Hono()

app.get("/up", async (c) => {
  return c.json({ status: "UP", timestamp: new Date().toISOString() })
})

app.route("/api", appRouter)

apply(app)

app.onError((error, c) => {
  const {
    status = 500,
    message = "Internal Server Error",
    cause,
  } = error instanceof HTTPException
    ? error
    : { status: 500, message: "Internal Server Error", cause: error }

  const errorResponse = {
    error: {
      message,
      code: status,
      cause: serverEnv.NODE_ENV === "production" ? undefined : cause,
      stack: serverEnv.NODE_ENV === "production" ? undefined : error.stack,
    },
  } as ApiErrorResponse

  console.error({
    ...errorResponse,
    endpoint: c.req.path,
    method: c.req.method,
  })

  return c.json(errorResponse, status)
})

export default serve(app, { port: serverEnv.PORT })

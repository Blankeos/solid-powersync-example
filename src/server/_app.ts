import { Hono } from "hono"
import { cors } from "hono/cors"
import { csrf } from "hono/csrf"
import { authController } from "./modules/auth/auth.controller"
import { notesController } from "./modules/notes/notes.controller"

const app = new Hono()

app.use(cors())
app.use(csrf())

export const appRouter = app.route("/auth", authController).route("/notes", notesController)

export type AppRouter = typeof appRouter

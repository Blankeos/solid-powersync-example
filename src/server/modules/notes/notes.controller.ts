import { Hono } from "hono"
import * as notesDao from "./notes.dao"

export const notesController = new Hono()
  .post("/", async (c) => {
    const body = await c.req.json()
    const { title, content, is_public, owner_id } = body

    if (!title || !owner_id) {
      return c.json({ error: "title and owner_id are required" }, 400)
    }

    const note = await notesDao.createNote({
      title,
      content,
      is_public,
      owner_id,
    })

    return c.json({ note }, 201)
  })
  .post("/sync", async (c) => {
    const body = await c.req.json()
    const { operation } = body

    const userId = c.req.header("X-User-ID")
    if (!userId) {
      return c.json({ error: "User ID required" }, 401)
    }

    try {
      if (operation.op === "PUT" && operation.table === "notes") {
        const data = operation.opData
        const now = new Date()
        const note = await notesDao.createNote({
          id: operation.id,
          title: data.title || "",
          content: data.content || "",
          is_public: data.is_public === 1,
          owner_id: userId,
          created_at: data.created_at || now,
          updated_at: data.updated_at || now,
        })
        console.log("Created note:", note.id)
      } else if (
        (operation.op === "UPDATE" || operation.op === "PATCH") &&
        operation.table === "notes"
      ) {
        const data = operation.opData
        await notesDao.updateNote(operation.id, {
          title: data.title,
          content: data.content,
          is_public: data.is_public === undefined ? undefined : data.is_public === 1,
          owner_id: userId,
          updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
        })
        console.log("Updated note:", operation.id)
      } else if (operation.op === "DELETE" && operation.table === "notes") {
        await notesDao.deleteNote(operation.id, userId)
        console.log("Deleted note:", operation.id)
      }

      return c.json({ success: true })
    } catch (error) {
      console.error("Sync error:", error)
      return c.json({ error: "Sync failed" }, 500)
    }
  })
  .put("/:id", async (c) => {
    const id = c.req.param("id")
    const body = await c.req.json()
    const { title, content, is_public, owner_id } = body

    if (!owner_id) {
      return c.json({ error: "owner_id is required" }, 400)
    }

    const note = await notesDao.updateNote(id, {
      title,
      content,
      is_public,
      owner_id,
    })

    if (!note) {
      return c.json({ error: "Note not found or not owned by user" }, 404)
    }

    return c.json({ note })
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const owner_id = c.req.query("owner_id")

    if (!owner_id) {
      return c.json({ error: "owner_id is required" }, 400)
    }

    const result = await notesDao.deleteNote(id, owner_id)

    if (!result) {
      return c.json({ error: "Note not found or not owned by user" }, 404)
    }

    return c.json({ success: true })
  })

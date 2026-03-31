# PowerSync Local-First Sync Guide

PowerSync enables local-first apps with automatic sync to a remote database. Data is stored locally in SQLite (WA-SQLite on web) and synced bidirectionally with PostgreSQL.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser/App   │         │ PowerSync       │         │   PostgreSQL    │
│                 │         │   Service       │         │                 │
│  ┌───────────┐  │         │                 │         │                 │
│  │ Local     │  │  WS     │  - Sync Rules   │  Replication │  Notes     │
│  │ SQLite    │◄─┼────────►│  - Auth (JWT)   │◄────────────►│  Users     │
│  │ (WA-SQLite)│ │         │  - Bucket Mgr   │         │     any tables│
│  └───────────┘  │         │                 │         │                 │
│        │        │         └─────────────────┘         └─────────────────┘
│        │ uploads│                │
│        ▼        │                │
│  ┌───────────┐  │                │
│  │ Your API  │  │                │
│  │ /sync     │◄─┼────────────────┘
│  │ endpoint  │  │
│  └───────────┘  │
└─────────────────┘
```

**Flow:**
1. Client writes to local SQLite via `db.execute()` or `db.watch()`
2. PowerSync tracks changes (CRUD operations)
3. Connector's `uploadData()` flushes changes to your API
4. Your API writes to PostgreSQL
5. PostgreSQL replication notifies PowerSync service
6. PowerSync service pushes changes via WebSocket to connected clients

## Key Components

### 1. Schema Definition

Define your tables with column types:

```typescript
import { column, Schema, Table } from "@powersync/web"

export const AppSchema = new Schema({
  notes: new Table({
    id: column.text,
    title: column.text,
    content: column.text,
    is_public: column.integer, // SQLite doesn't have boolean, use 0/1
    owner_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
})

export type Note = {
  id: string
  title: string
  content: string
  is_public: number
  owner_id: string
  created_at: string
  updated_at: string
}
```

### 2. Database Singleton

```typescript
import { PowerSyncDatabase } from "@powersync/web"
import { AppSchema } from "./schema"

let db: PowerSyncDatabase | null = null

export async function getPowerSyncDb(): Promise<PowerSyncDatabase> {
  if (db) return db

  db = new PowerSyncDatabase({
    database: { dbFilename: "app.db" },
    schema: AppSchema,
    flags: { disableSSRWarning: true },
  })

  await db.init()
  return db
}
```

### 3. Backend Connector

The connector handles auth credentials and uploading local changes:

```typescript
import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector, CrudEntry } from "@powersync/web"

export class BackendConnector implements PowerSyncBackendConnector {
  private auth: { userId: string | null; token: string | null } = { userId: null, token: null }

  async fetchCredentials() {
    if (!this.auth.token || !this.auth.userId) return null
    
    return {
      endpoint: "http://localhost:8080",
      token: this.auth.token,
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(100)
    if (!batch) return

    try {
      for (const entry of batch.crud) {
        await this.uploadEntry(entry)
      }
      await batch.complete()
    } catch (error) {
      console.error("Upload error:", error)
      throw error // Will retry
    }
  }

  private async uploadEntry(entry: CrudEntry) {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.auth.token}`,
      },
      body: JSON.stringify({
        op: entry.op,        // "PUT" | "PATCH" | "DELETE"
        table: entry.table,  // "notes"
        id: entry.id,
        data: entry.opData,
      }),
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
  }

  updateAuth(userId: string, token: string) {
    this.auth = { userId, token }
  }
}
```

### 4. Sync Rules Configuration

Sync rules define WHAT data syncs to WHICH users. This is a YAML file loaded by the PowerSync service.

**File: `powersync/sync-config.yaml`**

```yaml
config:
  edition: 3

streams:
  # All users receive public notes
  public_notes:
    auto_subscribe: true
    queries:
      - SELECT id, title, content, is_public, owner_id, created_at, updated_at 
        FROM notes 
        WHERE is_public = true

  # Users only see their own private notes
  user_notes:
    parameters:
      - SELECT request.user_id() AS user_id
    queries:
      - SELECT id, title, content, is_public, owner_id, created_at, updated_at 
        FROM notes 
        WHERE owner_id = bucket.user_id
```

**Key concepts:**
- `auto_subscribe: true` - all users get this bucket automatically
- `bucket.user_id` - references the JWT subject (`sub` claim)
- `request.user_id()` - extracts user ID from the auth token
- Use `queries:` (plural, list) for edition 3

**Simplest config (sync everything):**

```yaml
config:
  edition: 3

streams:
  all_data:
    auto_subscribe: true
    queries:
      - SELECT * FROM notes
      - SELECT * FROM users
```

### 5. PowerSync Service Configuration

**File: `powersync/service.yaml`**

```yaml
replication:
  connections:
    - type: postgresql
      uri: postgresql://user:pass@postgres:5432/dbname
      sslmode: disable

storage:
  type: postgresql
  uri: postgresql://postgres:postgres@postgres:5432/dbname

port: 8080

client_auth:
  audience:
    - http://localhost:8080
  jwks:
    keys:
      - kty: oct
        alg: HS256
        k: YOUR_BASE64_SECRET
        kid: dev-key-1

sync_config:
  path: /config/sync-config.yaml
```

**For development JWT auth:**
- Use a shared secret (HS256) with `kty: oct`
- In production, use RS256 with a JWKS endpoint

## Local Writes & Sync

### Write Locally (Instant UI)

```typescript
const db = await getPowerSyncDb()

// INSERT
await db.execute(
  `INSERT INTO notes (id, title, content, owner_id, created_at, updated_at) 
   VALUES (?, ?, ?, ?, ?, ?)`,
  [id, title, content, userId, now, now]
)

// UPDATE
await db.execute(
  `UPDATE notes SET title = ?, updated_at = ? WHERE id = ?`,
  [title, now, id]
)

// DELETE
await db.execute(`DELETE FROM notes WHERE id = ?`, [id])
```

### Watch for Changes (Reactive Queries)

```typescript
const abortController = new AbortController()

db.watch(
  `SELECT * FROM notes WHERE owner_id = ? ORDER BY updated_at DESC`,
  [userId],
  {
    onResult: (result) => {
      const notes = result.rows._array
      setNotes(notes)
    },
    onError: (error) => {
      console.error("Watch error:", error)
    },
  },
  { signal: abortController.signal }
)

// Cleanup: abortController.abort()
```

## Server-Side Sync Endpoint

Your API endpoint receives CRUD operations from the connector's `uploadData()`:

```typescript
// Hono example
app.post("/api/sync", async (c) => {
  const { op, table, id, data } = await c.req.json()
  const userId = getUserIdFromAuth(c) // From JWT/session

  try {
    if (op === "PUT") {
      // UPSERT - handle both insert and update
      await db`
        INSERT INTO ${table} (id, title, content, owner_id, created_at, updated_at)
        VALUES (${id}, ${data.title}, ${data.content}, ${userId}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updated_at = EXCLUDED.updated_at
      `
    } else if (op === "PATCH") {
      await db`
        UPDATE ${table} 
        SET title = ${data.title}, content = ${data.content}, updated_at = NOW()
        WHERE id = ${id} AND owner_id = ${userId}
      `
    } else if (op === "DELETE") {
      await db`DELETE FROM ${table} WHERE id = ${id} AND owner_id = ${userId}`
    }

    return c.json({ success: true })
  } catch (error) {
    console.error("Sync error:", error)
    return c.json({ error: "Sync failed" }, 500)
  }
})
```

**Use UPSERT for PUT** - PowerSync may retry operations, so `INSERT ... ON CONFLICT` prevents duplicate key errors.

## Connection Status Tracking

```typescript
const statusListener = database.registerListener({
  statusChanged: (status) => {
    // status.connected - true when streaming
    // status.connecting - true during connection attempt
    // status.dataFlowStatus.downloadError - Error from server
    // status.dataFlowStatus.uploadError - Error uploading

    if (status.connected) {
      console.log("Connected and syncing")
    } else if (status.connecting) {
      console.log("Connecting...")
    } else if (status.dataFlowStatus.downloadError) {
      console.log("Download error:", status.dataFlowStatus.downloadError)
    }
  },
})

// Cleanup: statusListener()
```

## Auth Flow

1. User logs in → your backend generates JWT
2. JWT passed to connector via `updateAuth(userId, token)`
3. Connector returns credentials in `fetchCredentials()`
4. PowerSync connects to sync service with JWT
5. Sync service validates JWT and determines user_id

```typescript
// Backend JWT generation (jose library)
async function generatePowerSyncToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.POWERSYNC_JWT_SECRET)
  
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256", kid: "dev-key-1" })
    .setIssuedAt()
    .setAudience("http://localhost:8080")
    .setSubject(userId)
    .setExpirationTime("12h")
    .sign(secret)
}
```

## PostgreSQL Setup

```sql
-- Enable logical replication
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_wal_senders = 4;
ALTER SYSTEM SET max_replication_slots = 4;

-- Create replication user
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'secret';

-- Grant access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create publication
CREATE PUBLICATION powersync FOR ALL TABLES;
```

## Common Issues

### Notes not syncing down to client

**Cause:** Sync rules filter incorrectly (e.g., `WHERE is_public = true` but all notes are private)

**Fix:** Check sync rules match your data:
```yaml
streams:
  all_notes:
    auto_subscribe: true
    queries:
      - SELECT * FROM notes  # No filters for testing
```

### Notes getting deleted

**Cause:** UPSERT missing - duplicate key errors in sync endpoint

**Fix:** Always use `ON CONFLICT (id) DO UPDATE` for PUT operations.

### `operations_synced: 0` in logs

**Cause:** 
1. Sync rules use `query:` instead of `queries:` (edition 3 requires plural)
2. Auth filters don't match data

**Fix:** Use `queries:` and verify sync rules after restart:
```bash
docker logs powersync-service --tail 20
# Should show: "Loaded sync rules"
```

### Connection status shows "connected" but no data

**Cause:** `database.connect()` resolves before streaming starts. The `connected` flag is about WebSocket connection, not data availability.

**Fix:** Use `registerListener({ statusChanged })` to track actual sync status, or wait for data in `watch()` callback.

### `getCrudBatch` vs `getNextCrudTransaction`

- `getCrudBatch(maxOps)` - Gets up to `maxOps` operations, simpler API
- `getNextCrudTransaction()` - Gets a transaction with all pending ops, call `transaction.complete()` after processing

Both work, but `getCrudBatch` is simpler.

## Restart PowerSync after config changes

```bash
docker compose restart powersync
docker logs powersync-service --tail 20
```

## Useful Commands

```bash
# Check PowerSync logs
docker logs powersync-service --tail 50

# Check PostgreSQL data
docker exec powersync-postgres psql -U postgres -d solid_notes -c "SELECT * FROM notes;"

# Clear browser local database
# DevTools > Application > Storage > Clear site data
```

## Full Minimal Example

See the reference implementations:
- `src/lib/powersync/database.ts` - Database singleton
- `src/lib/powersync/connector.ts` - Backend connector
- `src/context/powersync.context.tsx` - React/Solid context with status tracking
- `src/pages/notes/+Page.tsx` - Watch query example
- `src/pages/notes/new/+Page.tsx` - Local write + dual-upload pattern
- `src/server/modules/notes/notes.controller.ts` - Sync endpoint
- `powersync/service.yaml` - PowerSync service config
- `powersync/sync-config.yaml` - Sync rules

## No Schema-Specific Extension Code Needed

PowerSync handles sync automatically for any table in your schema. You only need:

1. **Generic sync endpoint** - handles `PUT/PATCH/DELETE` for any table
2. **Sync rules** - define what data users can see
3. **Schema** - define local table structure

You do NOT need per-entity endpoints like `addNote`, `deleteNote`. The connector's `uploadData()` sends generic operations, your API handles them generically.

## Solid.js Hooks Pattern

For Solid.js apps, create reactive hooks similar to SpacetimeDB's pattern:

### `usePowerSyncQuery` - Reactive Watch Queries

```typescript
// src/lib/powersync/hooks.tsx
export function usePowerSyncQuery<T>(
  query: () => string,
  params?: () => unknown[]
): [() => T[], () => boolean, () => Error | null] {
  const { db, isReady } = usePowerSync()

  const [state, setState] = createStore<{
    data: T[]
    loading: boolean
    error: Error | null
  }>({ data: [], loading: true, error: null })

  let abortController: AbortController | null = null

  createEffect(() => {
    const database = db()
    const ready = isReady()
    if (!database || !ready) {
      setState({ data: [], loading: false })
      return
    }

    const sql = query()
    const queryParams = params?.() ?? []

    if (abortController) abortController.abort()
    abortController = new AbortController()

    setState({ loading: true, error: null })

    database.watch(sql, queryParams, {
      onResult: (result) => {
        const rows = result.rows?._array ?? []
        setState("data", reconcile(rows))
        setState({ loading: false })
      },
      onError: (error) => {
        setState({ error: error instanceof Error ? error : new Error(String(error)), loading: false })
      },
    }, { signal: abortController.signal })
  })

  onCleanup(() => abortController?.abort())

  return [() => state.data, () => state.loading, () => state.error]
}
```

### Usage in Components

```typescript
// Before - manual watch with all the boilerplate
createEffect(() => {
  const db = powerSyncDb()
  const user = currentUser()
  if (!db || !user) return

  const abortController = new AbortController()
  db.watch(`SELECT * FROM notes WHERE owner_id = ?`, [user.id], {
    onResult: (result) => setNotes(result.rows._array),
    onError: (error) => console.error(error),
  }, { signal: abortController.signal })

  onCleanup(() => abortController.abort())
})

// After - simple hook
const [notes, loading] = usePowerSyncQuery<Note>(
  () => `SELECT * FROM notes WHERE owner_id = ? ORDER BY updated_at DESC`,
  () => [user()?.id]
)
```

### Provider Setup

```typescript
// src/lib/powersync/hooks.tsx or src/context/powersync.context.tsx
export const PowerSyncProvider: ParentComponent = (props) => {
  const auth = useAuthContext()
  const [db, setDb] = createSignal<PowerSyncDatabase | null>(null)
  const [isReady, setIsReady] = createSignal(false)
  const [syncStatus, setSyncStatus] = createSignal("disconnected")

  // ... connection logic same as before ...

  return (
    <PowerSyncContext.Provider value={{ db, isReady, syncStatus }}>
      {props.children}
    </PowerSyncContext.Provider>
  )
}
```

### Available Hooks

- `usePowerSync()` - Returns `{ db, isReady, syncStatus }`
- `usePowerSyncQuery<T>(query, params?)` - Reactive watch query, returns `[data, loading, error]`
- `usePowerSyncGetOne<T>(query, params?)` - One-time fetch, returns `[data, loading, error]`
- `usePowerSyncExecute()` - Returns `execute(sql, params?)` function for writes

## Key Mental Model

- **Local writes are instant** - UI updates immediately
- **Sync is eventual** - data propagates to server and other clients
- **Conflicts are last-write-wins** - based on `updated_at` or operation order
- **Auth is JWT-based** - PowerSync validates tokens, you generate them
- **Schema is shared** - local SQLite mirrors PostgreSQL columns
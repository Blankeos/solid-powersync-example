# PowerSync + TanStack DB (Solid) Lib

This folder is the local-first data layer for the app.

The editable surface is small:

1. Define tables and row schemas in `schema.ts`.
2. Create TanStack DB collections in `collections.ts`.
3. Keep the remaining files as boilerplate unless you are changing auth/sync infrastructure.

## Files

| File             | Edit?  | Purpose                                                                                                 |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `schema.ts`      | Yes    | Defines `POWERSYNC_DB_FILENAME`, PowerSync `AppSchema`, Zod row schemas, and inferred TypeScript types. |
| `collections.ts` | Yes    | Defines TanStack DB collections that wrap PowerSync tables. Add one collection per app table.           |
| `database.ts`    | Rarely | Creates the singleton `PowerSyncDatabase`. Usually only reads config from `schema.ts`.                  |
| `connector.ts`   | Rarely | PowerSync backend connector: credentials + upload queue processing. Treat as sync/auth boilerplate.     |
| `hooks.tsx`      | Rarely | Connects PowerSync after login and exposes sync status. Treat as provider boilerplate.                  |
| `index.ts`       | Rarely | Barrel exports for app imports.                                                                         |

## Adding a table

### 1. Add it to `schema.ts`

```ts
export const AppSchema = new Schema({
  notes: new Table({
    id: column.text,
    title: column.text,
  }),

  // 1. Add the PowerSync table
  projects: new Table({
    id: column.text,
    name: column.text,
    owner_id: column.text,
    created_at: column.text,
  }),
});

// 2. Add the Zod schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner_id: z.string(),
  created_at: z.string(),
});

// 3. Add the inferred type export
export type Project = z.infer<typeof projectSchema>;
```

### 2. Add the collection in `collections.ts`

```ts
export const projectsCollection = createCollection(
  powerSyncCollectionOptions({
    database: powerSyncDb,
    table: AppSchema.props.projects,
    schema: projectSchema,
    onDeserializationError: (error) => {
      console.error("Invalid project synced from PowerSync", error);
    },
  }),
);
```

### 3. Export it from `index.ts`

```ts
export { notesCollection, projectsCollection } from "./collections";
export {
  type Note,
  type Project,
  AppSchema,
  noteSchema,
  projectSchema,
} from "./schema";
```

### 4. Update `sync-config.yaml`

PowerSync sync rules are still the server-side source of truth for what rows can reach the device.

Example:

```yaml
streams:
  projects:
    query: SELECT * FROM projects WHERE owner_id = auth.user_id()
```

Never trust client-provided stream parameters by themselves. Always re-check ownership in the sync query.

## Using a collection in Solid

```tsx
import { eq, useLiveQuery } from "@tanstack/solid-db";
import { notesCollection } from "@/lib/powersync";

const notes = useLiveQuery((q) =>
  q
    .from({ note: notesCollection })
    .where(({ note }) => eq(note.owner_id, userId()))
    .orderBy(({ note }) => note.updated_at, "desc"),
);

// notes() is the reactive array
```

## Mutations

Use TanStack DB collection methods instead of raw SQL in UI code.

```ts
const tx = notesCollection.insert({
  id: crypto.randomUUID(),
  title: "Hello",
  content: "Local-first note",
  is_public: 0,
  owner_id: userId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

await tx.isPersisted.promise;
```

```ts
const tx = notesCollection.update(noteId, (draft) => {
  draft.title = "Updated title";
  draft.updated_at = new Date().toISOString();
});

await tx.isPersisted.promise;
```

```ts
const tx = notesCollection.delete(noteId);
await tx.isPersisted.promise;
```

## Security model

| Layer                                 | Responsibility                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `sync-config.yaml`                    | Controls which server rows sync down to local SQLite.                                      |
| Backend upload endpoint / DB policies | Reject unauthorized writes.                                                                |
| TanStack DB collections               | Typed local queries, optimistic mutations, and reactive UI state. Not a security boundary. |

## Rule of thumb

For normal app development, touch only:

- `schema.ts`
- `collections.ts`
- `sync-config.yaml` - Also run `powersync:restart` script in package.json
- backend write validation, when adding/changing writable data

Avoid editing `hooks.tsx`, `connector.ts`, or `database.ts` unless the sync/auth plumbing itself changes.

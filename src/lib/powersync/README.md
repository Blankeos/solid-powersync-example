# PowerSync Lib (Solid)

This folder is the local-first data layer for the app.

The editable surface is small:

1. Define tables and row schemas in `schema.ts`.
2. Create feature query modules in `src/queries/<feature>.ts`.
3. Keep the remaining files as boilerplate unless you are changing auth/sync infrastructure.

## Files

| File           | Edit?  | Purpose                                                                                |
| -------------- | ------ | -------------------------------------------------------------------------------------- |
| `schema.ts`    | Yes    | Defines `POWERSYNC_DB_FILENAME`, PowerSync `AppSchema`, and shared TypeScript types.   |
| `database.ts`  | Rarely | Creates the singleton `PowerSyncDatabase`. Usually only reads config from `schema.ts`. |
| `connector.ts` | Rarely | PowerSync backend connector: credentials + upload queue processing.                    |
| `hooks.tsx`    | Rarely | Connects PowerSync after login and exposes sync status + reactive query hooks.         |
| `index.ts`     | Rarely | Barrel exports for app imports.                                                        |

## Adding a table

### 1. Add it to `schema.ts`

```ts
export const AppSchema = new Schema({
  notes: new Table({
    id: column.text,
    title: column.text,
    // ...existing
  }),

  // 1. Add the PowerSync table
  projects: new Table({
    id: column.text,
    name: column.text,
    owner_id: column.text,
    created_at: column.text,
  }),
});

// 2. Add the type export
export type Project = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

// 3. Add input types if needed
export type CreateProjectInput = Omit<Project, "id" | "created_at">;
```

### 2. Create queries in `src/queries/projects.ts`

```ts
import {
  usePowerSyncQuery,
  usePowerSyncGetOne,
  usePowerSyncExecute,
} from "@/lib/powersync";
import type { Project, CreateProjectInput } from "@/lib/powersync/schema";

export function useProjectsQuery(userId: Accessor<string | undefined>) {
  return usePowerSyncQuery<Project>(
    () => "SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC",
    () => [userId()],
  );
}

export function useProjectQuery(projectId: Accessor<string | undefined>) {
  return usePowerSyncGetOne<Project>(
    () => "SELECT * FROM projects WHERE id = ?",
    () => [projectId()],
  );
}

export function useProjectMutations() {
  const execute = usePowerSyncExecute();

  const createProject = async (input: CreateProjectInput) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO projects (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, input.name, input.owner_id, now],
    );
    return id;
  };

  return { createProject };
}
```

### 3. Update server sync handling

PowerSync sync rules control which rows reach the device. The server must also validate writes at the upload endpoint.

Never trust client-provided parameters alone. Always re-check ownership server-side.

## Using queries in Solid

```tsx
import { useProjectsQuery } from "@/queries/projects";

function ProjectsList() {
  const { user } = useAuthContext();
  const [projects, loading, error] = useProjectsQuery(() => user()?.id);

  return <For each={projects()}>{(project) => <div>{project.name}</div>}</For>;
}
```

## Mutations in Solid

Use the mutation hooks from your query module instead of raw SQL in UI code.

```ts
const { createProject } = useProjectMutations();

await createProject({
  name: "New Project",
  owner_id: userId,
});
```

## Security model

| Layer                           | Responsibility                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `sync-config.yaml` / sync rules | Controls which server rows sync down to local SQLite.                          |
| Backend upload endpoint         | Reject unauthorized writes. Validate ownership.                                |
| Query modules                   | Typed local queries and mutations. Reactive UI state. Not a security boundary. |

## Rule of thumb

For normal app development, touch only:

- `schema.ts`
- `src/queries/*.ts`
- `sync-config.yaml` (and restart PowerSync when changed)
- Backend write validation

Avoid editing `hooks.tsx`, `connector.ts`, or `database.ts` unless the sync/auth plumbing itself changes.

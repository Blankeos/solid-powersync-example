# Solid PowerSync Example

A barebones local-first sync application demonstrating PowerSync + SQLite + PostgreSQL with SolidJS.

## What This Demo Shows

This is an Apple Notes-style app showcasing:

- **Local-first architecture**: Data is stored locally in SQLite, synced when online
- **Offline support**: Full functionality while offline, syncs on reconnection
- **Real-time sync**: Changes propagate across devices instantly when online
- **Per-user data**: Private notes visible only to owner, public notes visible to all

## Tech Stack

| Layer    | Technology                            |
| -------- | ------------------------------------- |
| Frontend | SolidJS + Vike + Tailwind CSS         |
| Backend  | Hono (Bun runtime)                    |
| Database | PostgreSQL (source) + SQLite (client) |
| Sync     | PowerSync (self-hosted)               |
| Auth     | Simple session-based (demo accounts)  |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh)
- [Docker](https://docker.com)

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL (source database) on port 5432
- PowerSync service on port 8080

### 2. Setup Environment

```bash
cp .env.example .env
```

### 3. Run Database Migrations

```bash
bun run db:migrate
```

### 4. Start Development Server

```bash
bun dev
```

Open http://localhost:3000

## Demo Accounts

| Account   | ID          |
| --------- | ----------- |
| Account A | `account-a` |
| Account B | `account-b` |

No passwords - just click to login.

## Testing Sync

1. Open the app in two different browsers (or incognito)
2. Login as Account A on both
3. Create a note on Browser 1 - it syncs to Browser 2
4. Go offline on Browser 1 (DevTools > Network > Offline)
5. Edit note - changes saved locally
6. Stay online on Browser 2 - no changes visible yet
7. Go online on Browser 1 - changes sync to Browser 2
8. Mark note as public on Browser 1
9. Login as Account B on Browser 3 - can see the public note

## Project Structure

```
src/
├── lib/
│   ├── hono-client.ts          # API client
│   └── powersync/               # PowerSync integration
│       ├── schema.ts           # Client schema
│       ├── database.ts          # DB instance
│       └── connector.ts         # Auth + write connector
├── context/
│   ├── powersync.context.tsx    # PowerSync provider
│   └── auth.context.tsx         # Auth state
├── server/
│   ├── database/                # DB client & migrations
│   └── modules/
│       ├── auth/                # Auth endpoints
│       ├── notes/               # Notes CRUD
│       └── powersync/           # PowerSync write handler
└── pages/
    ├── login/                   # Login page
    └── notes/                   # Notes list & editor
```

## How It Works

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │     │  PowerSync       │     │   PostgreSQL    │
│   (Solid App)   │◄───►│  Service         │◄───►│   (Source DB)   │
│   SQLite        │     │  (Sync Engine)   │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Data Flow

1. **Reads**: Client queries local SQLite directly (instant)
2. **Sync**: PowerSync streams changes from PostgreSQL to SQLite
3. **Writes**: Client queues writes locally → uploads to backend → backend writes to PostgreSQL → PowerSync syncs back

### Sync Rules

- Private notes sync only to owner
- Public notes sync to all users

## Scripts

| Command              | Description             |
| -------------------- | ----------------------- |
| `bun dev`            | Start dev server        |
| `bun run build`      | Build for production    |
| `bun run db:migrate` | Run database migrations |
| `bun run lint`       | Lint code               |
| `bun run check`      | Type check              |

## Learn More

- [PowerSync Documentation](https://docs.powersync.com)
- [SolidJS](https://solidjs.com)
- [Vike](https://vike.dev)
- [Hono](https://hono.dev)

## License

MIT

# Lithello

A real-time Othello/Reversi platform. Two players share a lobby, agree on a time
control, and play a live game with server-authoritative rules, clocks and Elo
ratings.

## What's in here

A pnpm workspace with three packages:

| Package | What it is |
| --- | --- |
| `packages/shared` | Zod schemas, types and the Othello engine. Imported by both other packages. |
| `packages/api` | NestJS server — REST, Socket.IO gateways, Postgres via Drizzle, Redis. |
| `packages/web` | React + Vite client. |

The Othello rules live in **shared**, not the server, so the client and server
reach the same verdict about legality and whose turn it is. Moving them apart
would let a client highlight a square the server then rejects.

### A few design decisions worth knowing before reading the code

**Boards are bitboards.** A position is two signed 64-bit integers — one per
colour, one bit per square, numbered row-major so square 0 is a1. They are
stored as Postgres `bigint` and travel as 16 lowercase hex characters, because
`JSON.stringify` throws on a `bigint` and a `number` loses precision above
2^53. The conversion is a Zod codec (`BitboardCodec`), so `parse` decodes hex to
`bigint` and `z.encode` does the reverse at the wire boundary.

**Game state is derived, not stored twice.** `game_move` records the board and
both clocks at every ply, so the current position, the score, whose turn it is
and the clocks are all computed from the move list rather than sent alongside
it. Ply 0 is the initial position rather than a move, which gives the first real
move a clock origin.

**The database holds the invariants.** 28 check constraints across 9 tables — the
outcome columns become non-null together with `ended_at`, the two bitboards must
be disjoint, a square can only be played once per game, a game cannot end before
it starts. Constraint violations are the intended failure mode for a logic bug,
not something to route around.

**Deadlines live in Redis sorted sets.** Clock expiry and disconnect forfeits
are both "durable state, swept periodically, claimed by exactly one process".
Each is a sorted set scored by its deadline, claimed by a Lua script that leases
rather than deletes — so a process dying mid-handling retries instead of losing
the deadline.

## Running it locally

### Prerequisites

- Node 24+ (`engines` in the root manifest; developed on 26)
- pnpm 12.6.0 — the root manifest pins it and will download it if needed
- Docker, for Postgres and Redis

### 1. Install

```bash
pnpm install
```

### 2. Start Postgres and Redis

The compose file lives in the api package:

```bash
cd packages/api
docker compose up -d
```

That gives you Postgres 17 on `127.0.0.1:5432` (database, user and password all
`lithello`) and Redis 8 on `127.0.0.1:6379`.

### 3. Configure the environment

```bash
cp packages/api/.env-example packages/api/.env
cp packages/web/.env-example packages/web/.env
```

`BETTER_AUTH_SECRET` needs a real value — anything random and at least 32
characters. The rest of the defaults match the compose file.

Two knobs exist specifically to stop timers firing while you sit at a
breakpoint: `GAME_ABANDON_GRACE_SECONDS` and
`PRESENCE_HEARTBEAT_TTL_SECONDS`. Raise both if you plan to debug mid-game.

> `DATABASE_URL` is the only thing pointing the app at a database. Check it
> before running anything destructive — it has pointed at a remote host before
> now.

### 4. Build shared, then migrate

`api` and `web` both consume `shared`'s compiled output, so it has to be built
first:

```bash
pnpm --filter @lithello/shared build
pnpm --filter api db:migrate
```

### 5. Seed the time controls

**Nothing works without at least one.** Lobby creation resolves a default time
control and fails if the table is empty. They are added by hand on purpose:

```bash
docker compose exec -T postgres psql -U lithello -d lithello <<'SQL'
INSERT INTO game_time_control (start_clock_ms, increment_ms)
VALUES (60000, 0), (180000, 0), (180000, 2000), (300000, 0), (600000, 0);
SQL
```

### 6. Run the app

Two terminals:

```bash
pnpm --filter api start:dev     # http://localhost:3000
pnpm --filter web dev           # http://localhost:5173
```

Sign up, pick a playing strength when onboarding asks, create a lobby, and open
the invite link as a second account to play yourself.

## Working on it

```bash
pnpm build                              # every package
pnpm --filter @lithello/shared test     # engine, rating, session helpers
pnpm --filter api test                  # mappers, service
pnpm --filter @lithello/shared typecheck
pnpm --filter api lint          # currently reports pre-existing lobby issues
```

**Vitest does not typecheck.** `vitest run` transpiles and will happily pass a
spec that does not compile, so run the typecheck separately — in CI, run both.

### Schema changes

```bash
cd packages/api
# edit src/database/schema/*.ts
pnpm db:generate     # writes SQL + a snapshot into database/migrations
# read the generated SQL
pnpm db:migrate
```

Everything under `database/migrations` is source, including
`meta/*_snapshot.json` — `db:generate` diffs against the snapshot, so without it
the next change re-emits every `CREATE TABLE`.

Review the generated SQL before applying it. Drizzle emits `DROP COLUMN`
without comment, cannot tell a rename from a drop-and-add (it asks), and will
not write the backfill a new `NOT NULL` column needs.

The better-auth tables are generated:

```bash
pnpm db:auth-generate
```

That regenerates `src/database/schema/auth.schema.ts` and then runs
`database/patch-auth-schema.ts`, which rewrites the timestamp columns to
`timestamptz`. The generator emits `timestamp without time zone`, which makes
session expiry depend on the session timezone at write *and* read time. Do not
drop the patch step.

### If a build emits nothing

TypeScript's `incremental` build info can outlive the output it describes, so
`rm -rf dist` alone can leave `tsc` convinced everything is up to date. Both
packages point `tsBuildInfoFile` inside `dist` to prevent that, but if you see
"module has no exported member" for something that plainly exists, a stale
`dist` is the first thing to check.

## Current state

Playable end to end: onboarding, lobbies with a host-chosen time control and
rated flag, live games with clocks, passes, resignation, timeout, disconnect
forfeits, chat, Elo ratings and match history.

Known gaps:

- `game-deadlines` is not repopulated on a cold start. Redis persists
  (`appendonly yes`), but a flushed or fresh Redis leaves in-progress games with
  no clock deadline.
- Rating updates are not in the same transaction as the game result, so a crash
  between them leaves `game.*_rating_after` written and `player.rating` stale.
- No integration tests. The repository and service are covered with mocks, so
  nothing verifies a write actually satisfies the database constraints.
- `pnpm --filter api lint` is not clean: three `no-floating-promises` errors and
  an unused import in `src/lobby/`.
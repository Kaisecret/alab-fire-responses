# ALAB Database Connection Design

## Goal

Connect the deployed ALAB Next.js application to the Railway PostgreSQL service and provide a reliable, non-sensitive connection check. This increment establishes database infrastructure only. It does not add application tables, authentication, or change the login form.

## Architecture

The Railway `alab-fire-responses` service receives a private `DATABASE_URL` reference from the PostgreSQL service. Only server-side Next.js code reads that value.

Prisma ORM 7 uses the PostgreSQL driver adapter to connect over Railway's private network. A single reusable Prisma client is cached during local development to avoid creating extra clients during hot reload.

## Components

- `prisma/schema.prisma`: selects PostgreSQL and configures generated-client output; it contains no application models in this increment.
- `prisma.config.ts`: points Prisma tooling at the schema and migrations directory and reads `DATABASE_URL`.
- `lib/prisma.ts`: creates and reuses the server-only Prisma client.
- `lib/database-health.ts`: executes a minimal `SELECT 1` query and returns a safe health result.
- `app/api/health/database/route.ts`: exposes the connection status as JSON.
- `railway.json`: uses the database health endpoint for deployment health checks.
- Package scripts: generate the Prisma client and provide migration commands for later schema increments.

## API Contract

`GET /api/health/database`

Successful connection:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Response status: `200`.

Unavailable or misconfigured connection:

```json
{
  "status": "error",
  "database": "unavailable"
}
```

Response status: `503`.

The endpoint must not return the connection URL, credentials, SQL text, stack traces, or raw driver errors.

## Deployment Flow

The repository-root build continues to delegate to `mainfile/alab-system`. Installing dependencies generates the Prisma client. Railway builds the application, then checks `/api/health/database`. A deployment becomes healthy only when the Next.js service can reach PostgreSQL through `DATABASE_URL`.

No migration is created in this connection-only increment because there are no application models. The migration command is prepared for the next increment that adds tables.

## Testing

- A unit test drives the database-health function with a fake query executor, covering connected and unavailable outcomes without requiring Railway credentials.
- Configuration tests verify the PostgreSQL provider, server-only environment lookup, safe health route, Prisma generation script, and Railway health-check path.
- The complete repository test suite, nested ESLint check, and production build must pass before the implementation is pushed.

## Security and Scope

- `DATABASE_URL` remains a Railway variable and is never committed.
- Client components and browser-delivered code never import the Prisma client.
- The health route exposes only a binary connection state.
- No user, incident, report, station, responder, vehicle, or water-source model is included.
- No login or registration behavior changes in this increment.

## Success Criteria

- Railway can build and start the application with Prisma generated.
- `/api/health/database` returns `200` when PostgreSQL is reachable.
- It returns a sanitized `503` response when the connection is unavailable.
- Existing landing and login routes continue to build and pass their tests.

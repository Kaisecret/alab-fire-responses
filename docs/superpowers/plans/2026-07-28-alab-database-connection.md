# ALAB Database Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the ALAB Next.js service to Railway PostgreSQL through Prisma ORM 7 and expose a sanitized database health endpoint.

**Architecture:** Prisma uses Railway's server-only `DATABASE_URL` through the PostgreSQL driver adapter. A lazy, development-safe Prisma singleton supplies a small probe function, and a Node.js route handler maps that probe to safe `200` or `503` JSON responses.

**Tech Stack:** Next.js 16.2.12 App Router, TypeScript 5, Prisma ORM 7.9.1, `@prisma/adapter-pg` 7.9.1, `pg` 8.22.0, Node test runner through `tsx` 4.23.1, Railway PostgreSQL.

## Global Constraints

- This increment adds connection infrastructure only; it adds no application models, authentication, or login behavior.
- `DATABASE_URL` remains server-only and must never be committed or exposed in a response.
- The health endpoint returns only a binary connection state and no raw database errors.
- Existing user deletions and unrelated lockfile changes must not be staged.
- All implementation work stays in the existing `fix/railway-deployment` branch.

---

### Task 1: Prisma dependency and configuration foundation

**Files:**
- Create: `mainfile/alab-system/tests/database-config.test.mjs`
- Create: `mainfile/alab-system/prisma/schema.prisma`
- Create: `mainfile/alab-system/prisma.config.ts`
- Modify: `mainfile/alab-system/package.json`
- Modify: `mainfile/alab-system/package-lock.json`

**Interfaces:**
- Consumes: Railway's runtime `DATABASE_URL`.
- Produces: generated client module at `app/generated/prisma/client`, `db:generate`, `db:validate`, and `db:migrate:deploy` scripts.

- [ ] **Step 1: Write the failing configuration test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Prisma is configured for Railway PostgreSQL without application models", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const config = await readFile("prisma.config.ts", "utf8");

  assert.equal(packageJson.scripts.postinstall, "prisma generate");
  assert.equal(packageJson.scripts["db:generate"], "prisma generate");
  assert.equal(packageJson.scripts["db:validate"], "prisma validate");
  assert.equal(packageJson.scripts["db:migrate:deploy"], "prisma migrate deploy");
  assert.equal(packageJson.dependencies["@prisma/client"], "7.9.1");
  assert.equal(packageJson.dependencies["@prisma/adapter-pg"], "7.9.1");
  assert.equal(packageJson.dependencies.pg, "8.22.0");
  assert.equal(packageJson.devDependencies.prisma, "7.9.1");
  assert.match(schema, /provider\s*=\s*"prisma-client"/);
  assert.match(schema, /output\s*=\s*"\.\.\/app\/generated\/prisma"/);
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.doesNotMatch(schema, /\bmodel\s+\w+/);
  assert.match(config, /env\("DATABASE_URL"\)/);
  assert.doesNotMatch(config, /postgres(?:ql)?:\/\/[^"']+@/);
});
```

- [ ] **Step 2: Run the configuration test to verify it fails**

Run: `node --test tests/database-config.test.mjs`

Expected: FAIL because `prisma/schema.prisma` does not exist.

- [ ] **Step 3: Install the pinned Prisma dependencies**

Run:

```powershell
$env:DATABASE_URL='postgresql://local:local@127.0.0.1:5432/alab'
npm install --save-exact @prisma/client@7.9.1 @prisma/adapter-pg@7.9.1 pg@8.22.0 dotenv@17.4.2
npm install --save-dev --save-exact prisma@7.9.1 tsx@4.23.1 @types/pg@8.20.0
```

Expected: `package.json` and `package-lock.json` contain the pinned packages.

- [ ] **Step 4: Add Prisma scripts and configuration**

Add these scripts to `package.json`:

```json
"postinstall": "prisma generate",
"db:generate": "prisma generate",
"db:validate": "prisma validate",
"db:migrate:deploy": "prisma migrate deploy"
```

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

Create `prisma.config.ts`:

```ts
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

- [ ] **Step 5: Verify configuration and generation**

Run from `mainfile/alab-system`:

```powershell
$env:DATABASE_URL='postgresql://local:local@127.0.0.1:5432/alab'
node --test tests/database-config.test.mjs
npm run db:validate
npm run db:generate
```

Expected: test PASS, schema valid, Prisma Client generated.

- [ ] **Step 6: Commit Task 1**

```powershell
git add mainfile/alab-system/package.json mainfile/alab-system/package-lock.json mainfile/alab-system/prisma mainfile/alab-system/prisma.config.ts mainfile/alab-system/tests/database-config.test.mjs
git commit -m "build: configure Prisma for Railway Postgres"
```

### Task 2: Testable database connection probe

**Files:**
- Create: `mainfile/alab-system/tests/database-health.test.ts`
- Create: `mainfile/alab-system/lib/database-health.ts`
- Create: `mainfile/alab-system/lib/prisma.ts`
- Modify: `mainfile/alab-system/package.json`

**Interfaces:**
- Consumes: `DatabaseProbe = () => Promise<unknown>` and `process.env.DATABASE_URL`.
- Produces: `checkDatabaseConnection(probe): Promise<DatabaseHealth>` and `getPrisma(): PrismaClient`.

- [ ] **Step 1: Write failing probe tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { checkDatabaseConnection } from "../lib/database-health";

test("reports a connected database after a successful probe", async () => {
  const result = await checkDatabaseConnection(async () => 1);
  assert.deepEqual(result, { status: "ok", database: "connected" });
});

test("reports an unavailable database without exposing the driver error", async () => {
  const result = await checkDatabaseConnection(async () => {
    throw new Error("postgresql://secret-user:secret-password@example/db");
  });
  assert.deepEqual(result, { status: "error", database: "unavailable" });
  assert.doesNotMatch(JSON.stringify(result), /secret/i);
});
```

- [ ] **Step 2: Run the probe tests to verify they fail**

Run: `npx tsx --test tests/database-health.test.ts`

Expected: FAIL because `lib/database-health.ts` does not exist.

- [ ] **Step 3: Implement the probe**

Create `lib/database-health.ts`:

```ts
export type DatabaseHealth =
  | { status: "ok"; database: "connected" }
  | { status: "error"; database: "unavailable" };

export type DatabaseProbe = () => Promise<unknown>;

export async function checkDatabaseConnection(
  probe: DatabaseProbe,
): Promise<DatabaseHealth> {
  try {
    await probe();
    return { status: "ok", database: "connected" };
  } catch {
    return { status: "error", database: "unavailable" };
  }
}
```

- [ ] **Step 4: Run the probe tests to verify they pass**

Run: `npx tsx --test tests/database-health.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Add the lazy server-only Prisma singleton**

Create `lib/prisma.ts`:

```ts
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
```

Update the nested test script:

```json
"test": "tsx --test tests/*.test.mjs tests/*.test.ts"
```

- [ ] **Step 6: Run all nested tests**

Run: `npm test`

Expected: all nested tests PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add mainfile/alab-system/lib mainfile/alab-system/tests/database-health.test.ts mainfile/alab-system/package.json mainfile/alab-system/package-lock.json
git commit -m "feat: add safe database connection probe"
```

### Task 3: Health route and Railway deployment gate

**Files:**
- Create: `mainfile/alab-system/app/api/health/database/route.ts`
- Create: `mainfile/alab-system/tests/database-route.test.mjs`
- Modify: `tests/railway-deployment.test.mjs`
- Modify: `railway.json`

**Interfaces:**
- Consumes: `checkDatabaseConnection()` and `getPrisma()`.
- Produces: `GET /api/health/database` with safe `200` and `503` JSON contracts.

- [ ] **Step 1: Write failing route and Railway configuration tests**

Create `mainfile/alab-system/tests/database-route.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("database health route probes PostgreSQL without exposing errors", async () => {
  const route = await readFile("app/api/health/database/route.ts", "utf8");

  assert.match(route, /runtime\s*=\s*"nodejs"/);
  assert.match(route, /dynamic\s*=\s*"force-dynamic"/);
  assert.match(route, /checkDatabaseConnection/);
  assert.match(route, /\$queryRaw`SELECT 1`/);
  assert.match(route, /result\.status === "ok" \? 200 : 503/);
  assert.doesNotMatch(route, /error\.(?:message|stack)/);
});
```

Change the Railway assertion in `tests/railway-deployment.test.mjs` to:

```js
assert.equal(
  railway.deploy.healthcheckPath,
  "/api/health/database",
);
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```powershell
node --test tests/database-route.test.mjs
node --test ..\..\tests\railway-deployment.test.mjs
```

Expected: route file missing and health path still `/`.

- [ ] **Step 3: Implement the Node.js health route**

Create `app/api/health/database/route.ts`:

```ts
import { NextResponse } from "next/server";

import { checkDatabaseConnection } from "../../../../lib/database-health";
import { getPrisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkDatabaseConnection(
    async () => getPrisma().$queryRaw`SELECT 1`,
  );

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 503,
  });
}
```

Change `railway.json`:

```json
"healthcheckPath": "/api/health/database"
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run from `mainfile/alab-system`:

```powershell
node --test tests/database-route.test.mjs
node --test ..\..\tests\railway-deployment.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add mainfile/alab-system/app/api/health/database/route.ts mainfile/alab-system/tests/database-route.test.mjs tests/railway-deployment.test.mjs railway.json
git commit -m "feat: gate Railway health on Postgres"
```

### Task 4: Full verification and delivery

**Files:**
- Verify only; do not add application models or credentials.

**Interfaces:**
- Consumes: complete implementation from Tasks 1-3.
- Produces: a verified GitHub branch that Railway can deploy.

- [ ] **Step 1: Verify no credentials are tracked**

Run:

```powershell
git grep -n -E 'postgres(?:ql)?://[^[:space:]]+@' -- mainfile/alab-system ':!mainfile/alab-system/package-lock.json'
```

Expected: no real connection string or assigned secret.

- [ ] **Step 2: Run the full repository test suite**

Run: `npm test`

Expected: all root and nested tests PASS.

- [ ] **Step 3: Run nested lint**

Run: `npm run lint --prefix mainfile/alab-system`

Expected: exit code `0` with no errors.

- [ ] **Step 4: Run Prisma validation and production build**

Run:

```powershell
$env:DATABASE_URL='postgresql://local:local@127.0.0.1:5432/alab'
npm run db:validate --prefix mainfile/alab-system
npm run build
```

Expected: Prisma schema valid and Next.js production build succeeds.

- [ ] **Step 5: Inspect the final scoped diff**

Run:

```powershell
git status --short
git log --oneline --decorate -6
git diff origin/fix/railway-deployment...HEAD --stat
```

Expected: implementation commits contain only the database connection plan, Prisma setup, health code, tests, and Railway health path; unrelated user changes remain unstaged.

- [ ] **Step 6: Push the branch**

Run: `git push origin fix/railway-deployment`

Expected: GitHub accepts the new commits and Railway can deploy the branch.

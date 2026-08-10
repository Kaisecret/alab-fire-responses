# ALAB Resident Database and Railway Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create, version, seed, and deploy the resident-side PostgreSQL schema for the ALAB system, then deliver its complete data dictionary as a verified Word document.

**Architecture:** Prisma ORM 7.9.1 is the version-controlled database layer in the nested Next.js application. The first migration creates user, resident profile/address/verification, location lookup, fire report/photo, and resident notification tables. An idempotent seed imports the existing Antique municipality and barangay list. `prisma migrate deploy` applies the committed SQL through the Railway service's private `DATABASE_URL`.

**Tech Stack:** PostgreSQL on Railway, Prisma ORM 7.9.1, Node.js 20+, TypeScript, `@prisma/adapter-pg`, `pg`, `tsx`, Node test runner, python-docx, LibreOffice document renderer.

## Global Constraints

- Work only inside `mainfile/alab-system` for the application schema; do not alter the user's existing resident location edits.
- Use PostgreSQL UUID primary keys, explicit table/column mappings, and database enums.
- Store passwords only in `password_hash`; never persist a password confirmation or plain password.
- Store document and photo storage references, never the actual binary files, in PostgreSQL.
- Keep residents' GPS coordinates only on `fire_reports`; do not create continuous location tracking.
- Use Railway's `DATABASE_URL` only in server-side or CLI processes and never commit a URL or credentials.
- Run `prisma migrate deploy`, not `prisma migrate dev` or `prisma db push`, against Railway production.
- Produce a `.docx` using the `standard_business_brief` document preset and visually inspect every rendered page before delivery.

---

## File Structure

- `mainfile/alab-system/package.json` - Prisma and database dependencies plus explicit validation, generation, migration, and seed commands.
- `mainfile/alab-system/prisma.config.ts` - Prisma CLI configuration and `DATABASE_URL` datasource.
- `mainfile/alab-system/prisma/schema.prisma` - PostgreSQL enums, models, relations, constraints, and indexes.
- `mainfile/alab-system/prisma/seed.ts` - idempotent Antique municipality/barangay lookup seed.
- `mainfile/alab-system/prisma/migrations/20260810000000_init_resident_database/migration.sql` - committed, reviewable initial PostgreSQL migration.
- `mainfile/alab-system/tests/resident-database-schema.test.mjs` - schema and seed contract tests that do not need Railway credentials.
- `docs/database/ALAB_Resident_Database_Data_Dictionary.docx` - final Word data dictionary for the resident database.
- `scripts/create-resident-database-docx.py` - reproducible document builder; keep it separate from the application.

### Task 1: Define the schema contract and Prisma configuration

**Files:**
- Create: `mainfile/alab-system/tests/resident-database-schema.test.mjs`
- Modify: `mainfile/alab-system/package.json`
- Create: `mainfile/alab-system/prisma.config.ts`
- Create: `mainfile/alab-system/prisma/schema.prisma`

**Interfaces:**
- Consumes: the resident registration fields in `app/_content/signup-content.ts`, report fields in `app/_content/resident-report-fire-content.ts`, and the table design in `docs/superpowers/specs/2026-08-10-alab-resident-database-design.md`.
- Produces: a valid Prisma data model with `User`, `ResidentProfile`, `ResidentAddress`, `ResidentVerification`, `Municipality`, `Barangay`, `FireReport`, `FireReportPhoto`, `NotificationPreference`, and `Notification` models.

- [ ] **Step 1: Write the failing schema contract test**

Create `tests/resident-database-schema.test.mjs` with assertions that `prisma/schema.prisma` has every planned model, enum, key relationship, unique constraint, and report index:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const schemaPath = join(appRoot, "prisma", "schema.prisma");

function schema() {
  return readFileSync(schemaPath, "utf8");
}

test("resident database models cover account, verification, reports, and notifications", () => {
  const source = schema();
  for (const model of [
    "User", "ResidentProfile", "ResidentAddress", "ResidentVerification",
    "Municipality", "Barangay", "FireReport", "FireReportPhoto",
    "NotificationPreference", "Notification",
  ]) {
    assert.match(source, new RegExp(`model ${model} \\{`));
  }
  for (const enumName of [
    "UserRole", "UserAccountStatus", "VerificationStatus", "FireType",
    "FireReportStatus", "LocationMethod", "LocationQuality",
  ]) {
    assert.match(source, new RegExp(`enum ${enumName} \\{`));
  }
});

test("resident data protects credentials and preserves report verification data", () => {
  const source = schema();
  assert.match(source, /passwordHash\s+String\s+@map\("password_hash"\)/);
  assert.doesNotMatch(source, /confirmPassword|plainPassword/);
  assert.match(source, /email\s+String\s+@unique/);
  assert.match(source, /username\s+String\s+@unique/);
  assert.match(source, /phone\s+String\s+@unique/);
  assert.match(source, /referenceNumber\s+String\s+@unique/);
  assert.match(source, /locationLatitude\s+Decimal\s+@db.Decimal\(9, 6\)/);
  assert.match(source, /locationLongitude\s+Decimal\s+@db.Decimal\(9, 6\)/);
  assert.match(source, /@@index\(\[residentProfileId, submittedAt\]\)/);
  assert.match(source, /@@index\(\[status, submittedAt\]\)/);
  assert.match(source, /@@index\(\[municipalityId, submittedAt\]\)/);
});
```

- [ ] **Step 2: Run the contract test and confirm the expected failure**

Run: `node --test tests/resident-database-schema.test.mjs` from `mainfile/alab-system`.

Expected: `ENOENT` because `prisma/schema.prisma` does not exist.

- [ ] **Step 3: Add fixed Prisma 7.9.1 dependencies and explicit database scripts**

Install `@prisma/client@7.9.1`, `@prisma/adapter-pg@7.9.1`, and `pg@8.16.3` as application dependencies. Install `prisma@7.9.1`, `dotenv@16.6.1`, and `tsx@4.20.5` as development dependencies. Add these scripts to `mainfile/alab-system/package.json`:

```json
{
  "db:validate": "prisma validate",
  "db:generate": "prisma generate",
  "db:migrate:deploy": "prisma migrate deploy",
  "db:migrate:status": "prisma migrate status",
  "db:seed": "prisma db seed"
}
```

- [ ] **Step 4: Create the Prisma CLI config**

Create `mainfile/alab-system/prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

- [ ] **Step 5: Create the complete PostgreSQL data model**

Create `mainfile/alab-system/prisma/schema.prisma` with this model definition. Use the `prisma-client` generator with output at `../generated/prisma` and the `postgresql` provider.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum UserRole { RESIDENT MUNICIPAL_BFP PROVINCIAL_BFP FIREFIGHTER ADMIN }
enum UserAccountStatus { PENDING_VERIFICATION ACTIVE REJECTED SUSPENDED }
enum VerificationStatus { PENDING VERIFIED REJECTED }
enum FireType { HOUSE_BUILDING GRASS FOREST VEHICLE OTHER }
enum FireReportStatus { SUBMITTED UNDER_VERIFICATION CONFIRMED REJECTED FALSE_REPORT DUPLICATE NEEDS_MORE_INFO CLOSED }
enum LocationMethod { GPS MANUAL_PIN }
enum LocationQuality { PRECISE APPROXIMATE LOW_ACCURACY OUTSIDE_ANTIQUE PIN_ADJUSTED }

model User {
  id                   String            @id @default(uuid()) @db.Uuid
  email                String            @unique @db.VarChar(100)
  username             String            @unique @db.VarChar(30)
  passwordHash         String            @map("password_hash") @db.VarChar(255)
  phone                String            @unique @db.VarChar(15)
  role                 UserRole          @default(RESIDENT)
  accountStatus        UserAccountStatus @default(PENDING_VERIFICATION) @map("account_status")
  termsAcceptedAt      DateTime          @map("terms_accepted_at") @db.Timestamptz(6)
  createdAt            DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  lastLoginAt          DateTime?         @map("last_login_at") @db.Timestamptz(6)
  residentProfile      ResidentProfile?
  reviewedVerifications ResidentVerification[] @relation("VerificationReviewer")
  @@map("users")
}

model ResidentProfile {
  id            String                  @id @default(uuid()) @db.Uuid
  userId        String                  @unique @map("user_id") @db.Uuid
  firstName     String                  @map("first_name") @db.VarChar(50)
  lastName      String                  @map("last_name") @db.VarChar(50)
  createdAt     DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  user          User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  addresses     ResidentAddress[]
  verifications ResidentVerification[]
  reports       FireReport[]
  preferences   NotificationPreference?
  notifications Notification[]
  @@map("resident_profiles")
}

model Municipality {
  id        String            @id @default(uuid()) @db.Uuid
  name      String            @unique @db.VarChar(100)
  province  String            @default("Antique") @db.VarChar(100)
  createdAt DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  barangays Barangay[]
  addresses ResidentAddress[]
  reports   FireReport[]
  @@map("municipalities")
}

model Barangay {
  id             String            @id @default(uuid()) @db.Uuid
  municipalityId String            @map("municipality_id") @db.Uuid
  name           String            @db.VarChar(100)
  createdAt      DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  municipality   Municipality      @relation(fields: [municipalityId], references: [id], onDelete: Restrict)
  addresses      ResidentAddress[]
  reports        FireReport[]
  @@unique([municipalityId, name])
  @@map("barangays")
}

model ResidentAddress {
  id                String          @id @default(uuid()) @db.Uuid
  residentProfileId String          @map("resident_profile_id") @db.Uuid
  municipalityId    String          @map("municipality_id") @db.Uuid
  barangayId        String          @map("barangay_id") @db.Uuid
  province          String          @default("Antique") @db.VarChar(100)
  sitioOrPurok      String?         @map("sitio_or_purok") @db.VarChar(100)
  completeAddress   String          @map("complete_address") @db.VarChar(200)
  nearbyLandmark    String?         @map("nearby_landmark") @db.VarChar(100)
  isPrimary         Boolean         @default(true) @map("is_primary")
  createdAt         DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  residentProfile   ResidentProfile @relation(fields: [residentProfileId], references: [id], onDelete: Cascade)
  municipality      Municipality    @relation(fields: [municipalityId], references: [id], onDelete: Restrict)
  barangay          Barangay        @relation(fields: [barangayId], references: [id], onDelete: Restrict)
  @@index([residentProfileId, isPrimary])
  @@map("resident_addresses")
}

model ResidentVerification {
  id                  String             @id @default(uuid()) @db.Uuid
  residentProfileId   String             @map("resident_profile_id") @db.Uuid
  frontDocumentKey    String             @map("front_document_key") @db.VarChar(500)
  backDocumentKey     String?            @map("back_document_key") @db.VarChar(500)
  selfieKey           String?            @map("selfie_key") @db.VarChar(500)
  status              VerificationStatus @default(PENDING)
  reviewedByUserId    String?            @map("reviewed_by_user_id") @db.Uuid
  reviewedAt          DateTime?          @map("reviewed_at") @db.Timestamptz(6)
  rejectionReason     String?            @map("rejection_reason") @db.VarChar(500)
  createdAt           DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime           @updatedAt @map("updated_at") @db.Timestamptz(6)
  residentProfile     ResidentProfile    @relation(fields: [residentProfileId], references: [id], onDelete: Cascade)
  reviewedBy          User?              @relation("VerificationReviewer", fields: [reviewedByUserId], references: [id], onDelete: SetNull)
  @@index([residentProfileId, status])
  @@map("resident_verifications")
}

model FireReport {
  id                     String           @id @default(uuid()) @db.Uuid
  referenceNumber        String           @unique @map("reference_number") @db.VarChar(40)
  residentProfileId      String           @map("resident_profile_id") @db.Uuid
  reporterNameSnapshot   String           @map("reporter_name_snapshot") @db.VarChar(101)
  reporterPhoneSnapshot  String           @map("reporter_phone_snapshot") @db.VarChar(15)
  fireType               FireType         @map("fire_type")
  description            String?          @db.VarChar(1000)
  status                 FireReportStatus @default(SUBMITTED)
  locationLatitude       Decimal          @map("location_latitude") @db.Decimal(9, 6)
  locationLongitude      Decimal          @map("location_longitude") @db.Decimal(9, 6)
  locationAccuracyMeters Decimal?         @map("location_accuracy_meters") @db.Decimal(8, 2)
  locationMethod         LocationMethod   @map("location_method")
  locationQuality        LocationQuality  @map("location_quality")
  isWithinAntique        Boolean          @map("is_within_antique")
  municipalityId         String           @map("municipality_id") @db.Uuid
  barangayId             String           @map("barangay_id") @db.Uuid
  addressLabel           String?          @map("address_label") @db.VarChar(300)
  nearestLandmark        String?          @map("nearest_landmark") @db.VarChar(200)
  submittedAt            DateTime         @default(now()) @map("submitted_at") @db.Timestamptz(6)
  updatedAt              DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  residentProfile        ResidentProfile  @relation(fields: [residentProfileId], references: [id], onDelete: Restrict)
  municipality           Municipality     @relation(fields: [municipalityId], references: [id], onDelete: Restrict)
  barangay               Barangay         @relation(fields: [barangayId], references: [id], onDelete: Restrict)
  photos                 FireReportPhoto[]
  notifications          Notification[]
  @@index([residentProfileId, submittedAt])
  @@index([status, submittedAt])
  @@index([municipalityId, submittedAt])
  @@map("fire_reports")
}

model FireReportPhoto {
  id               String     @id @default(uuid()) @db.Uuid
  fireReportId     String     @map("fire_report_id") @db.Uuid
  storageKey       String     @map("storage_key") @db.VarChar(500)
  originalFileName String     @map("original_file_name") @db.VarChar(255)
  mimeType         String     @map("mime_type") @db.VarChar(100)
  fileSizeBytes    Int        @map("file_size_bytes")
  capturedAt       DateTime?  @map("captured_at") @db.Timestamptz(6)
  uploadedAt       DateTime   @default(now()) @map("uploaded_at") @db.Timestamptz(6)
  fireReport       FireReport @relation(fields: [fireReportId], references: [id], onDelete: Cascade)
  @@index([fireReportId, uploadedAt])
  @@map("fire_report_photos")
}

model NotificationPreference {
  id                     String          @id @default(uuid()) @db.Uuid
  residentProfileId      String          @unique @map("resident_profile_id") @db.Uuid
  pushEnabled            Boolean         @default(true) @map("push_enabled")
  incidentUpdatesEnabled Boolean         @default(true) @map("incident_updates_enabled")
  emergencyAlertsEnabled Boolean         @default(true) @map("emergency_alerts_enabled")
  guideUpdatesEnabled    Boolean         @default(true) @map("guide_updates_enabled")
  createdAt              DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt              DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  residentProfile        ResidentProfile @relation(fields: [residentProfileId], references: [id], onDelete: Cascade)
  @@map("notification_preferences")
}

model Notification {
  id                String          @id @default(uuid()) @db.Uuid
  residentProfileId String          @map("resident_profile_id") @db.Uuid
  fireReportId      String?         @map("fire_report_id") @db.Uuid
  type              String          @db.VarChar(50)
  title             String          @db.VarChar(200)
  message           String          @db.VarChar(1000)
  readAt            DateTime?       @map("read_at") @db.Timestamptz(6)
  createdAt         DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  residentProfile   ResidentProfile @relation(fields: [residentProfileId], references: [id], onDelete: Cascade)
  fireReport        FireReport?     @relation(fields: [fireReportId], references: [id], onDelete: SetNull)
  @@index([residentProfileId, readAt, createdAt])
  @@map("notifications")
}
```

- [ ] **Step 6: Run the schema test, Prisma validation, and client generation**

Run from `mainfile/alab-system` with the Railway-provided `DATABASE_URL` available only in the process environment:

```powershell
npm run db:validate
npm run db:generate
node --test tests/resident-database-schema.test.mjs
```

Expected: Prisma validates the model, generates `generated/prisma`, and both Node tests pass.

- [ ] **Step 7: Commit the schema contract**

```powershell
git add mainfile/alab-system/package.json mainfile/alab-system/package-lock.json mainfile/alab-system/prisma.config.ts mainfile/alab-system/prisma/schema.prisma mainfile/alab-system/tests/resident-database-schema.test.mjs
git commit -m "feat: add resident database schema"
```

### Task 2: Add a deterministic Antique location seed and initial migration

**Files:**
- Modify: `mainfile/alab-system/tests/resident-database-schema.test.mjs`
- Create: `mainfile/alab-system/prisma/seed.ts`
- Create: `mainfile/alab-system/prisma/migrations/20260810000000_init_resident_database/migration.sql`

**Interfaces:**
- Consumes: `antiqueBarangays` from `app/_content/antique-barangays.ts` and the generated Prisma client at `generated/prisma/client`.
- Produces: repeatable lookup rows for all 18 Antique municipalities and their listed barangays; initial SQL compatible with `prisma migrate deploy`.

- [ ] **Step 1: Extend the failing test to require idempotent localities and committed migration SQL**

Append this test:

```js
test("resident database has an Antique seed and a committed initial migration", () => {
  const seed = readFileSync(join(appRoot, "prisma", "seed.ts"), "utf8");
  const migration = readFileSync(
    join(appRoot, "prisma", "migrations", "20260810000000_init_resident_database", "migration.sql"),
    "utf8",
  );
  assert.match(seed, /import \{ antiqueBarangays \}/);
  assert.match(seed, /municipality\.upsert/);
  assert.match(seed, /barangay\.upsert/);
  assert.match(migration, /CREATE TABLE "users"/);
  assert.match(migration, /CREATE TABLE "fire_reports"/);
  assert.match(migration, /CREATE INDEX "fire_reports_municipality_id_submitted_at_idx"/);
});
```

- [ ] **Step 2: Run the test and confirm the expected missing-file failure**

Run: `node --test tests/resident-database-schema.test.mjs`.

Expected: `ENOENT` because the seed and migration files do not exist.

- [ ] **Step 3: Implement the idempotent seed**

Create `mainfile/alab-system/prisma/seed.ts` using `PrismaPg` and the generated client. For every `[municipalityName, barangayNames]` entry, upsert the municipality with `province: "Antique"`; then upsert each barangay with the compound `municipalityId_name` unique key. Disconnect in a `finally` block. The implementation must follow this shape:

```ts
for (const [name, barangays] of Object.entries(antiqueBarangays)) {
  const municipality = await prisma.municipality.upsert({
    where: { name },
    update: { province: "Antique" },
    create: { name, province: "Antique" },
  });

  for (const barangayName of barangays) {
    await prisma.barangay.upsert({
      where: { municipalityId_name: { municipalityId: municipality.id, name: barangayName } },
      update: {},
      create: { municipalityId: municipality.id, name: barangayName },
    });
  }
}
```

- [ ] **Step 4: Generate reviewable SQL without applying a development migration to Railway**

Run from `mainfile/alab-system` after `npm run db:validate`:

```powershell
New-Item -ItemType Directory -Force prisma/migrations/20260810000000_init_resident_database
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | Set-Content -NoNewline prisma/migrations/20260810000000_init_resident_database/migration.sql
```

Review the SQL. It must create all seven PostgreSQL enum types, ten tables, foreign keys, unique indexes, and the three required `fire_reports` operational indexes. It must not contain `DROP`, `TRUNCATE`, or `DELETE` statements.

- [ ] **Step 5: Verify the seed and migration contracts**

Run:

```powershell
npm run db:generate
node --test tests/resident-database-schema.test.mjs
rg -n "\\b(DROP|TRUNCATE|DELETE)\\b" prisma/migrations/20260810000000_init_resident_database/migration.sql
```

Expected: generation and tests pass; the final command finds no destructive SQL.

- [ ] **Step 6: Commit the migration and seed**

```powershell
git add mainfile/alab-system/prisma/seed.ts mainfile/alab-system/prisma/migrations mainfile/alab-system/tests/resident-database-schema.test.mjs
git commit -m "feat: seed Antique resident locations"
```

### Task 3: Apply and verify the Railway PostgreSQL schema

**Files:**
- No source changes are required when Tasks 1 and 2 are complete.

**Interfaces:**
- Consumes: the committed Prisma migration and Railway's private `DATABASE_URL` for the `alab-fire-responses` service.
- Produces: all initial tables, enums, indexes, and Antique locality seed rows in the Railway PostgreSQL database.

- [ ] **Step 1: Confirm the Railway CLI identity and link the correct service**

Run from the repository root:

```powershell
npx --yes @railway/cli@latest whoami
npx --yes @railway/cli@latest link
npx --yes @railway/cli@latest status
```

Expected: the user account is recognized and the project/environment/service resolves to `alab-fire-responses`. Do not run migration commands until status confirms the correct service.

- [ ] **Step 2: Check that Railway supplies the private database variable without printing its value**

Run:

```powershell
npx --yes @railway/cli@latest variables --json | Select-String -Pattern '"DATABASE_URL"'
```

Expected: the variable name is present. Do not print the variable value or copy it into a file.

- [ ] **Step 3: Apply only pending migrations and seed the lookup data**

Run from `mainfile/alab-system`:

```powershell
npx --yes @railway/cli@latest run npm run db:migrate:deploy
npx --yes @railway/cli@latest run npm run db:seed
npx --yes @railway/cli@latest run npm run db:migrate:status
```

Expected: `db:migrate:deploy` applies `20260810000000_init_resident_database`, the seed completes, and migration status reports the database schema is up to date.

- [ ] **Step 4: Verify the deployed tables and seed counts through a non-sensitive query**

Create a temporary `verify-resident-database.ts` outside the repository that connects with `PrismaPg`, counts `municipality` and `barangay` rows, and checks `SELECT to_regclass` for every table. Run it through `railway run`, then remove the temporary file. Expected results: 18 municipalities, a positive barangay count, and every planned table resolves to a non-null PostgreSQL relation name.

- [ ] **Step 5: Run repository verification**

Run:

```powershell
npm test
npm run lint --prefix mainfile/alab-system
npm run build
```

Expected: the existing test suite, lint, and production build pass. Report any existing unrelated warnings separately.

- [ ] **Step 6: Commit any verification-focused tracked source changes**

```powershell
git status --short
git add mainfile/alab-system/package.json mainfile/alab-system/package-lock.json mainfile/alab-system/prisma mainfile/alab-system/tests/resident-database-schema.test.mjs
git commit -m "feat: deploy resident schema with Railway"
```

Do not stage `app/_content/resident-report-fire-content.ts`, `tests/resident-report-location.test.mjs`, or `public/images/bfp.docx`; they existed as unrelated user work before this task.

### Task 4: Create and visually verify the resident database Word data dictionary

**Files:**
- Create: `scripts/create-resident-database-docx.py`
- Create: `docs/database/ALAB_Resident_Database_Data_Dictionary.docx`

**Interfaces:**
- Consumes: the applied `prisma/schema.prisma`, seed coverage, and the resident database design specification.
- Produces: a polished Word data dictionary with every table, field, type, key, constraint, relationship, enumerated value, and storage/security rule.

- [ ] **Step 1: Build the Word document with the standard-business-brief preset**

Use python-docx with US Letter pages, 1-inch margins, Calibri 11-point body copy, and a `memo_masthead` first page. Apply these exact elements:

```text
Title: ALAB Resident Database Data Dictionary
Subtitle: GIS-Based Provincial Fire Response and Decision Support System for BFP Antique
Metadata: Version 1.0 | Date 10 August 2026 | Database PostgreSQL on Railway
Sections: Purpose and Scope; Entity Relationship Overview; Table Dictionary; Enumerations; Indexes and Constraints; Data Handling and Security; Railway Deployment Record
```

For each of the ten tables, create a real, fixed-width table with the columns `Attribute`, `PostgreSQL Type`, `Required`, `Key / Constraint`, and `Description`. Populate every field from the final Prisma schema. Use an entity relationship text diagram only for the relationship overview, not as a substitute for field descriptions.

- [ ] **Step 2: Run structural document checks**

Run the builder and check that the output exists, contains all table names, and has no unfinished marker text:

```powershell
python scripts/create-resident-database-docx.py
python -c "from docx import Document; d=Document('docs/database/ALAB_Resident_Database_Data_Dictionary.docx'); text='\\n'.join(p.text for p in d.paragraphs); assert 'Fire Report' in text and 'Resident Verification' in text; assert 'TBD' not in text"
```

- [ ] **Step 3: Render and inspect every Word page**

Run:

```powershell
python C:\Users\janna\.codex\plugins\cache\openai-primary-runtime\documents\26.727.11326\skills\documents\render_docx.py docs/database/ALAB_Resident_Database_Data_Dictionary.docx --output_dir $env:TEMP\alab-resident-db-render --emit_pdf
```

Open and inspect every `page-*.png` at 100% zoom. Verify there is no clipped text, table overflow, incorrect table geometry, missing glyph, overlapping footer, or broken page break. If a defect appears, edit the builder, regenerate the document, and re-render all pages.

- [ ] **Step 4: Commit the reproducible document source and final deliverable**

```powershell
git add scripts/create-resident-database-docx.py docs/database/ALAB_Resident_Database_Data_Dictionary.docx
git commit -m "docs: add resident database data dictionary"
```

## Plan Review

- Every table, attribute family, relation, data-protection rule, seed requirement, deployment requirement, and verification requirement in `2026-08-10-alab-resident-database-design.md` maps to Tasks 1 through 4.
- The plan is fully specified: each task names exact paths, expected commands, and the intended model and data values.
- Model, enum, index, and seed names are consistent across the schema test, schema definition, seed, deployment commands, and Word dictionary sections.

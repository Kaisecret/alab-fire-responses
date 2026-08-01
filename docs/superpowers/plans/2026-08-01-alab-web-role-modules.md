# ALAB Web Role Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up role-based Next.js web module files for Resident, Municipal BFP, and Provincial BFP users while excluding Firefighter from the web app.

**Architecture:** Add top-level role route folders in `mainfile/alab-system/app` instead of dashboard-only routes. Use one typed content model and one shared module shell so each role module can grow into its own set of pages later.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript 5, Node test runner, existing App Router structure.

## Global Constraints

- The Next.js app root is `mainfile/alab-system`.
- Web role modules must include only `resident`, `municipal-bfp`, and `provincial-bfp`.
- The Firefighter or Authorized Field Responder role belongs to the separate mobile app codebase and must not get a web route.
- Do not create `/dashboard/firefighter`, `/firefighter`, or any firefighter web module.
- Use role-based route folders, not a dashboard-only route structure.
- Do not add database integration, real authentication, or session authorization in this setup.
- Do not replace the existing `/` landing page or `/login` page.

---

## File Structure

Create these files:

```text
mainfile/alab-system/app/_content/user-modules.ts
mainfile/alab-system/app/_components/module-shell.tsx
mainfile/alab-system/app/_components/resident-module.tsx
mainfile/alab-system/app/_components/municipal-bfp-module.tsx
mainfile/alab-system/app/_components/provincial-bfp-module.tsx
mainfile/alab-system/app/resident/page.tsx
mainfile/alab-system/app/municipal-bfp/page.tsx
mainfile/alab-system/app/provincial-bfp/page.tsx
mainfile/alab-system/tests/user-modules.test.mjs
mainfile/alab-system/tests/role-module-components.test.mjs
mainfile/alab-system/tests/web-role-routes.test.mjs
```

Do not create:

```text
mainfile/alab-system/app/firefighter/
mainfile/alab-system/app/dashboard/firefighter/
```

---

### Task 1: Typed Web Role Content Model

**Files:**
- Create: `mainfile/alab-system/tests/user-modules.test.mjs`
- Create: `mainfile/alab-system/app/_content/user-modules.ts`

**Interfaces:**
- Produces: `WebRoleKey = "resident" | "municipal-bfp" | "provincial-bfp"`
- Produces: `UserModuleDefinition`
- Produces: `userModules: Record<WebRoleKey, UserModuleDefinition>`
- Produces: `userModuleKeys: WebRoleKey[]`

- [ ] **Step 1: Write the failing test**

Create `mainfile/alab-system/tests/user-modules.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const contentPath = join(root, "app", "_content", "user-modules.ts");

test("web role content model defines exactly the three web users", () => {
  assert.equal(existsSync(contentPath), true, "user module content is missing");

  const content = readFileSync(contentPath, "utf8");

  assert.match(
    content,
    /export type WebRoleKey = "resident" \| "municipal-bfp" \| "provincial-bfp"/,
  );
  assert.match(content, /resident:\s*\{/);
  assert.match(content, /"municipal-bfp":\s*\{/);
  assert.match(content, /"provincial-bfp":\s*\{/);
  assert.doesNotMatch(content, /firefighter/i);
});

test("each web role module includes actions, highlights, and sections", () => {
  const content = readFileSync(contentPath, "utf8");

  for (const key of ["resident", "municipal-bfp", "provincial-bfp"]) {
    const start = content.indexOf(`${JSON.stringify(key)}:`);
    const fallbackStart = content.indexOf(`${key}:`);
    const index = start >= 0 ? start : fallbackStart;

    assert.notEqual(index, -1, `${key} content is missing`);

    const nextRoleIndexes = ["resident", "municipal-bfp", "provincial-bfp"]
      .map((otherKey) => {
        if (otherKey === key) return -1;
        const quoted = content.indexOf(`${JSON.stringify(otherKey)}:`, index + 1);
        const plain = content.indexOf(`${otherKey}:`, index + 1);
        return quoted >= 0 ? quoted : plain;
      })
      .filter((value) => value > index);
    const end = nextRoleIndexes.length > 0 ? Math.min(...nextRoleIndexes) : content.length;
    const block = content.slice(index, end);

    assert.match(block, /primaryActions:\s*\[/, `${key} actions missing`);
    assert.match(block, /highlights:\s*\[/, `${key} highlights missing`);
    assert.match(block, /sections:\s*\[/, `${key} sections missing`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `mainfile/alab-system`:

```bash
node --test tests/user-modules.test.mjs
```

Expected: FAIL because `app/_content/user-modules.ts` does not exist.

- [ ] **Step 3: Write the content model**

Create `mainfile/alab-system/app/_content/user-modules.ts`:

```ts
export type WebRoleKey = "resident" | "municipal-bfp" | "provincial-bfp";

export type ModuleAction = {
  label: string;
  href: string;
  description: string;
};

export type ModuleHighlight = {
  label: string;
  value: string;
  detail: string;
};

export type ModuleSection = {
  title: string;
  items: string[];
};

export type UserModuleDefinition = {
  key: WebRoleKey;
  role: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryActions: ModuleAction[];
  highlights: ModuleHighlight[];
  sections: ModuleSection[];
};

export const userModules = {
  resident: {
    key: "resident",
    role: "Resident or Citizen Reporter",
    eyebrow: "Citizen reporting module",
    title: "Report fires and follow submission status",
    description:
      "Residents can submit fire incident details, provide location information, upload supporting images, and check basic report progress when permitted.",
    primaryActions: [
      {
        label: "Submit fire report",
        href: "/resident/report",
        description: "Send location, landmark, description, contact details, and image.",
      },
      {
        label: "Check report status",
        href: "/resident/status",
        description: "Use a reference number to view allowed submission updates.",
      },
    ],
    highlights: [
      {
        label: "Access",
        value: "Public",
        detail: "Focused on fast emergency reporting.",
      },
      {
        label: "Location",
        value: "GPS or map pin",
        detail: "Supports precise incident location capture.",
      },
      {
        label: "Limit",
        value: "No dispatch control",
        detail: "BFP personnel make verification and response decisions.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "Submit a fire incident report.",
          "Provide GPS location or select a location on the map.",
          "Enter landmark, description, contact information, and image.",
          "Receive a report reference number.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Cannot verify or confirm incidents.",
          "Cannot assign firetrucks or responders.",
          "Cannot view confidential BFP operational information.",
        ],
      },
    ],
  },
  "municipal-bfp": {
    key: "municipal-bfp",
    role: "Municipal BFP Personnel",
    eyebrow: "Municipal operations module",
    title: "Manage local incidents, resources, and response coordination",
    description:
      "Municipal BFP personnel handle report verification, local incident records, resources, water sources, assignments, assistance requests, and municipal reports.",
    primaryActions: [
      {
        label: "Review reports",
        href: "/municipal-bfp/reports",
        description: "Verify submitted fire reports and create official incidents.",
      },
      {
        label: "Manage incidents",
        href: "/municipal-bfp/incidents",
        description: "Track severity, response status, assignments, and closure.",
      },
      {
        label: "Manage resources",
        href: "/municipal-bfp/firetrucks",
        description: "Maintain firetrucks, crews, stations, and water-source records.",
      },
    ],
    highlights: [
      {
        label: "Scope",
        value: "Assigned municipality",
        detail: "Access is limited to authorized municipal records.",
      },
      {
        label: "Authority",
        value: "Verification",
        detail: "Can confirm, reject, or mark reports as false or duplicate.",
      },
      {
        label: "Coordination",
        value: "Assistance requests",
        detail: "Can request and respond to inter-municipality support.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "Review submitted fire reports and contact reporters.",
          "Create official incident records from verified reports.",
          "Manage fire stations, firetrucks, crews, and verified water sources.",
          "Assign firetrucks and responders according to authorization.",
          "Generate municipal reports.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Can access only assigned municipality records.",
          "Can access another municipality only through authorized assistance coordination.",
          "Administrative and dispatch actions must be recorded in the audit log.",
        ],
      },
    ],
  },
  "provincial-bfp": {
    key: "provincial-bfp",
    role: "Provincial BFP Personnel",
    eyebrow: "Province-wide monitoring module",
    title: "Monitor incidents, resources, analytics, and coordination across Antique",
    description:
      "Provincial BFP personnel oversee province-wide incidents, municipal status, resource availability, assistance coordination, analytics, reports, and authorized system activity.",
    primaryActions: [
      {
        label: "View province incidents",
        href: "/provincial-bfp/incidents",
        description: "Monitor active and historical incidents across municipalities.",
      },
      {
        label: "Check resources",
        href: "/provincial-bfp/resources",
        description: "Review fire stations, firetrucks, and resource shortages.",
      },
      {
        label: "Open analytics",
        href: "/provincial-bfp/analytics",
        description: "Review trends, response times, and operational reports.",
      },
    ],
    highlights: [
      {
        label: "Scope",
        value: "Province-wide",
        detail: "Access follows official provincial authorization.",
      },
      {
        label: "Focus",
        value: "Monitoring",
        detail: "Tracks municipal incidents, resources, and assistance.",
      },
      {
        label: "Reports",
        value: "Provincial",
        detail: "Supports analytics and executive reporting.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "View province-wide fire incidents and municipal status.",
          "Monitor fire station, firetruck, and resource information.",
          "Review inter-municipality assistance requests.",
          "Generate provincial analytics and reports.",
          "Review authorized system activity and coordination records.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Province-wide access must follow official authorization.",
          "Changes to municipal records follow assigned permissions and policies.",
          "Administrative access must be logged and protected.",
        ],
      },
    ],
  },
} satisfies Record<WebRoleKey, UserModuleDefinition>;

export const userModuleKeys = Object.keys(userModules) as WebRoleKey[];
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `mainfile/alab-system`:

```bash
node --test tests/user-modules.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mainfile/alab-system/tests/user-modules.test.mjs mainfile/alab-system/app/_content/user-modules.ts
git commit -m "feat: add web role content model"
```

---

### Task 2: Shared Module Shell and Role Components

**Files:**
- Create: `mainfile/alab-system/tests/role-module-components.test.mjs`
- Create: `mainfile/alab-system/app/_components/module-shell.tsx`
- Create: `mainfile/alab-system/app/_components/resident-module.tsx`
- Create: `mainfile/alab-system/app/_components/municipal-bfp-module.tsx`
- Create: `mainfile/alab-system/app/_components/provincial-bfp-module.tsx`

**Interfaces:**
- Consumes: `UserModuleDefinition` and `userModules` from `app/_content/user-modules.ts`
- Produces: `ModuleShell({ moduleData, accent })`
- Produces: `ResidentModule()`
- Produces: `MunicipalBfpModule()`
- Produces: `ProvincialBfpModule()`

- [ ] **Step 1: Write the failing component test**

Create `mainfile/alab-system/tests/role-module-components.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("shared module shell renders role content collections", () => {
  const shellPath = join(root, "app", "_components", "module-shell.tsx");

  assert.equal(existsSync(shellPath), true, "module shell is missing");

  const shell = readFileSync(shellPath, "utf8");

  assert.match(shell, /import Link from "next\/link"/);
  assert.match(shell, /UserModuleDefinition/);
  assert.match(shell, /primaryActions\.map/);
  assert.match(shell, /highlights\.map/);
  assert.match(shell, /sections\.map/);
  assert.doesNotMatch(shell, /firefighter/i);
});

test("role components bind the correct web role definitions", () => {
  const cases = [
    ["resident-module.tsx", /userModules\.resident/, /ResidentModule/],
    ["municipal-bfp-module.tsx", /userModules\["municipal-bfp"\]/, /MunicipalBfpModule/],
    ["provincial-bfp-module.tsx", /userModules\["provincial-bfp"\]/, /ProvincialBfpModule/],
  ];

  for (const [fileName, rolePattern, componentPattern] of cases) {
    const componentPath = join(root, "app", "_components", fileName);

    assert.equal(existsSync(componentPath), true, `${fileName} is missing`);

    const component = readFileSync(componentPath, "utf8");

    assert.match(component, rolePattern);
    assert.match(component, componentPattern);
    assert.match(component, /ModuleShell/);
    assert.doesNotMatch(component, /firefighter/i);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `mainfile/alab-system`:

```bash
node --test tests/role-module-components.test.mjs
```

Expected: FAIL because the module component files do not exist.

- [ ] **Step 3: Write the shared shell**

Create `mainfile/alab-system/app/_components/module-shell.tsx`:

```tsx
import Link from "next/link";

import type { UserModuleDefinition } from "../_content/user-modules";

const moduleShellStyles = `
  .module-shell {
    min-height: 100vh;
    background: #f8faf9;
    color: #1f2933;
    font-family: Arial, Helvetica, sans-serif;
  }

  .module-shell__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem clamp(1rem, 4vw, 3rem);
    border-bottom: 1px solid #d9e2dc;
    background: #ffffff;
  }

  .module-shell__brand {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  .module-shell__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .module-shell__nav a,
  .module-shell__action {
    color: #1f2933;
    font-weight: 700;
    text-decoration: none;
  }

  .module-shell__nav a {
    font-size: 0.9rem;
  }

  .module-shell__main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 4rem) 0;
  }

  .module-shell__eyebrow {
    margin: 0 0 0.75rem;
    color: #b42318;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .module-shell__title {
    max-width: 780px;
    margin: 0;
    font-size: clamp(2rem, 5vw, 4rem);
    line-height: 1.04;
    letter-spacing: 0;
  }

  .module-shell__description {
    max-width: 760px;
    margin: 1rem 0 0;
    color: #52605a;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .module-shell__actions,
  .module-shell__highlights,
  .module-shell__sections {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  .module-shell__actions {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .module-shell__highlights {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .module-shell__sections {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .module-shell__action,
  .module-shell__highlight,
  .module-shell__section {
    border: 1px solid #d9e2dc;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 18px 45px rgba(31, 41, 51, 0.08);
  }

  .module-shell__action {
    display: block;
    padding: 1.1rem;
  }

  .module-shell__action strong,
  .module-shell__highlight strong,
  .module-shell__section h2 {
    display: block;
    margin: 0 0 0.45rem;
  }

  .module-shell__action span,
  .module-shell__highlight span {
    display: block;
    color: #52605a;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .module-shell__highlight,
  .module-shell__section {
    padding: 1.1rem;
  }

  .module-shell__highlight-value {
    color: #0f766e;
    font-size: 1.2rem;
    font-weight: 800;
  }

  .module-shell__section ul {
    margin: 0;
    padding-left: 1.1rem;
    color: #52605a;
    line-height: 1.65;
  }

  .module-shell--municipal .module-shell__eyebrow {
    color: #9a3412;
  }

  .module-shell--provincial .module-shell__eyebrow {
    color: #0f766e;
  }

  @media (max-width: 680px) {
    .module-shell__bar {
      align-items: flex-start;
      flex-direction: column;
    }

    .module-shell__nav {
      width: 100%;
    }
  }
`;

type ModuleShellProps = {
  moduleData: UserModuleDefinition;
  accent: "resident" | "municipal" | "provincial";
};

export function ModuleShell({ moduleData, accent }: ModuleShellProps) {
  return (
    <>
      <style>{moduleShellStyles}</style>
      <div className={`module-shell module-shell--${accent}`}>
        <header className="module-shell__bar">
          <p className="module-shell__brand">ALAB Fire Response</p>
          <nav className="module-shell__nav" aria-label="Role modules">
            <Link href="/">Home</Link>
            <Link href="/resident">Resident</Link>
            <Link href="/municipal-bfp">Municipal BFP</Link>
            <Link href="/provincial-bfp">Provincial BFP</Link>
            <Link href="/login">Login</Link>
          </nav>
        </header>

        <main className="module-shell__main">
          <p className="module-shell__eyebrow">{moduleData.eyebrow}</p>
          <h1 className="module-shell__title">{moduleData.title}</h1>
          <p className="module-shell__description">{moduleData.description}</p>

          <section className="module-shell__actions" aria-label="Primary actions">
            {moduleData.primaryActions.map((action) => (
              <Link className="module-shell__action" href={action.href} key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </section>

          <section className="module-shell__highlights" aria-label={`${moduleData.role} highlights`}>
            {moduleData.highlights.map((highlight) => (
              <article className="module-shell__highlight" key={highlight.label}>
                <strong>{highlight.label}</strong>
                <p className="module-shell__highlight-value">{highlight.value}</p>
                <span>{highlight.detail}</span>
              </article>
            ))}
          </section>

          <section className="module-shell__sections" aria-label={`${moduleData.role} module details`}>
            {moduleData.sections.map((section) => (
              <article className="module-shell__section" key={section.title}>
                <h2>{section.title}</h2>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Write the role components**

Create `mainfile/alab-system/app/_components/resident-module.tsx`:

```tsx
import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function ResidentModule() {
  return <ModuleShell accent="resident" moduleData={userModules.resident} />;
}
```

Create `mainfile/alab-system/app/_components/municipal-bfp-module.tsx`:

```tsx
import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function MunicipalBfpModule() {
  return (
    <ModuleShell
      accent="municipal"
      moduleData={userModules["municipal-bfp"]}
    />
  );
}
```

Create `mainfile/alab-system/app/_components/provincial-bfp-module.tsx`:

```tsx
import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function ProvincialBfpModule() {
  return (
    <ModuleShell
      accent="provincial"
      moduleData={userModules["provincial-bfp"]}
    />
  );
}
```

- [ ] **Step 5: Run the component test to verify it passes**

Run from `mainfile/alab-system`:

```bash
node --test tests/role-module-components.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mainfile/alab-system/tests/role-module-components.test.mjs mainfile/alab-system/app/_components/module-shell.tsx mainfile/alab-system/app/_components/resident-module.tsx mainfile/alab-system/app/_components/municipal-bfp-module.tsx mainfile/alab-system/app/_components/provincial-bfp-module.tsx
git commit -m "feat: add web role module components"
```

---

### Task 3: Role-Based Route Pages

**Files:**
- Create: `mainfile/alab-system/tests/web-role-routes.test.mjs`
- Create: `mainfile/alab-system/app/resident/page.tsx`
- Create: `mainfile/alab-system/app/municipal-bfp/page.tsx`
- Create: `mainfile/alab-system/app/provincial-bfp/page.tsx`

**Interfaces:**
- Consumes: `ResidentModule`, `MunicipalBfpModule`, and `ProvincialBfpModule`
- Produces: `/resident`
- Produces: `/municipal-bfp`
- Produces: `/provincial-bfp`

- [ ] **Step 1: Write the failing route test**

Create `mainfile/alab-system/tests/web-role-routes.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("web app exposes top-level role module routes", () => {
  const routes = [
    ["resident", "ResidentModule", "Resident Module - ALAB"],
    ["municipal-bfp", "MunicipalBfpModule", "Municipal BFP Module - ALAB"],
    ["provincial-bfp", "ProvincialBfpModule", "Provincial BFP Module - ALAB"],
  ];

  for (const [route, componentName, title] of routes) {
    const pagePath = join(root, "app", route, "page.tsx");

    assert.equal(existsSync(pagePath), true, `${route} route is missing`);

    const page = readFileSync(pagePath, "utf8");

    assert.match(page, new RegExp(componentName));
    assert.match(page, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(page, /export const metadata/);
  }
});

test("web app does not create firefighter routes", () => {
  assert.equal(existsSync(join(root, "app", "firefighter")), false);
  assert.equal(existsSync(join(root, "app", "dashboard", "firefighter")), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `mainfile/alab-system`:

```bash
node --test tests/web-role-routes.test.mjs
```

Expected: FAIL because the role route pages do not exist.

- [ ] **Step 3: Create the Resident route**

Create `mainfile/alab-system/app/resident/page.tsx`:

```tsx
import type { Metadata } from "next";

import { ResidentModule } from "../_components/resident-module";

export const metadata: Metadata = {
  title: "Resident Module - ALAB",
  description:
    "Resident fire reporting and report-status module for ALAB Provincial Fire Response.",
};

export default function ResidentRoute() {
  return <ResidentModule />;
}
```

- [ ] **Step 4: Create the Municipal BFP route**

Create `mainfile/alab-system/app/municipal-bfp/page.tsx`:

```tsx
import type { Metadata } from "next";

import { MunicipalBfpModule } from "../_components/municipal-bfp-module";

export const metadata: Metadata = {
  title: "Municipal BFP Module - ALAB",
  description:
    "Municipal BFP incident verification, resource management, and response coordination module.",
};

export default function MunicipalBfpRoute() {
  return <MunicipalBfpModule />;
}
```

- [ ] **Step 5: Create the Provincial BFP route**

Create `mainfile/alab-system/app/provincial-bfp/page.tsx`:

```tsx
import type { Metadata } from "next";

import { ProvincialBfpModule } from "../_components/provincial-bfp-module";

export const metadata: Metadata = {
  title: "Provincial BFP Module - ALAB",
  description:
    "Provincial BFP monitoring, analytics, resource, and coordination module for ALAB.",
};

export default function ProvincialBfpRoute() {
  return <ProvincialBfpModule />;
}
```

- [ ] **Step 6: Run the route test to verify it passes**

Run from `mainfile/alab-system`:

```bash
node --test tests/web-role-routes.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add mainfile/alab-system/tests/web-role-routes.test.mjs mainfile/alab-system/app/resident/page.tsx mainfile/alab-system/app/municipal-bfp/page.tsx mainfile/alab-system/app/provincial-bfp/page.tsx
git commit -m "feat: add web role routes"
```

---

### Task 4: Full Verification

**Files:**
- Verify: `mainfile/alab-system/app/_content/user-modules.ts`
- Verify: `mainfile/alab-system/app/_components/*.tsx`
- Verify: `mainfile/alab-system/app/resident/page.tsx`
- Verify: `mainfile/alab-system/app/municipal-bfp/page.tsx`
- Verify: `mainfile/alab-system/app/provincial-bfp/page.tsx`

**Interfaces:**
- Consumes: All files from Tasks 1-3
- Produces: Passing test and production build verification

- [ ] **Step 1: Run all nested app tests**

Run from `mainfile/alab-system`:

```bash
npm test
```

Expected: PASS for existing tests plus:

```text
tests/user-modules.test.mjs
tests/role-module-components.test.mjs
tests/web-role-routes.test.mjs
```

- [ ] **Step 2: Run the production build**

Run from `mainfile/alab-system`:

```bash
npm run build
```

Expected: PASS and Next.js lists these routes among the generated app routes:

```text
/
/login
/resident
/municipal-bfp
/provincial-bfp
```

Expected: no `/firefighter` route and no `/dashboard/firefighter` route.

- [ ] **Step 3: Run the root test command**

Run from the repository root:

```bash
npm test
```

Expected: PASS for root tests and nested app tests.

- [ ] **Step 4: Inspect git status**

Run from the repository root:

```bash
git status --short
```

Expected: Only unrelated pre-existing local changes remain unstaged. The implementation files from this plan should be committed by Tasks 1-3.

# Railway Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the GitHub repository build and run on Railway without changing the landing-page UI.

**Architecture:** Track the nested Next.js project as ordinary repository files. Expose root-level npm commands and Railway config that delegate to the app, with a small Node launcher that forwards Railway's dynamic port.

**Tech Stack:** Node.js, Next.js 16, npm, Railway Railpack

## Global Constraints

- Preserve all current UI and routes.
- Use `mainfile/alab-system` as the application directory.
- Bind the production server to `0.0.0.0` and `process.env.PORT`.

---

### Task 1: Repair repository tracking

**Files:**
- Modify Git index entry: `mainfile/alab-system`
- Preserve nested history under the parent repository's private `.git` directory.

- [ ] Add a failing test that rejects a `160000` gitlink entry.
- [ ] Remove only the gitlink from the parent index.
- [ ] Move the nested `.git` directory to recoverable parent Git metadata.
- [ ] Add the application source as ordinary files.
- [ ] Run the test and confirm the file mode is `100644`.

### Task 2: Add Railway entrypoint

**Files:**
- Create: `package.json`
- Create: `scripts/start.mjs`
- Create: `railway.json`
- Test: `tests/railway-deployment.test.mjs`

- [ ] Test the required root build, start, and Railway settings.
- [ ] Add root npm commands that delegate builds to `mainfile/alab-system`.
- [ ] Add a launcher that passes `PORT` and host arguments to Next.js.
- [ ] Add Railpack build/start and `/` health-check configuration.
- [ ] Run the deployment tests.

### Task 3: Verify production behavior

**Files:**
- No additional files.

- [ ] Install dependencies using the committed lockfile.
- [ ] Run the complete test suite.
- [ ] Run `npm run build`.
- [ ] Start the production server with a non-default `PORT`.
- [ ] Request `/` and `/login` and require HTTP 200 responses.

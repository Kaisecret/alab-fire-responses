# ALAB Smaller Firefighter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the firefighter artwork across all responsive hero layouts without changing any other hero element.

**Architecture:** Update only the four existing `.firefighter` width declarations in `BFP/index.html`. Add one source-level regression test to `BFP/tests/hero.test.mjs`, then verify with the existing browser capture workflow.

**Tech Stack:** CSS, Node.js built-in test runner, headless Chrome

## Global Constraints

- Do not alter the phone, header, hero text, buttons, trust strip, background, or lower sections.
- Keep the firefighter bottom-right anchored.
- Use the four exact widths from the approved design.

---

### Task 1: Responsive Size Contract

**Files:**
- Modify: `BFP/tests/hero.test.mjs`

- [ ] Add assertions for the exact base, 1180px, 900px, and 640px firefighter widths.
- [ ] Run `node --test BFP/tests/hero.test.mjs` and confirm failure against the larger existing values.

### Task 2: Smaller Firefighter

**Files:**
- Modify: `BFP/index.html`

- [ ] Replace the four firefighter width declarations with the approved responsive values.
- [ ] Run `node --test BFP/tests/*.test.mjs` and confirm zero failures.

### Task 3: Visual Verification

**Files:**
- Verify: `BFP/.artifacts/verified/desktop-home.png`
- Verify: `BFP/.artifacts/verified/tablet-home.png`
- Verify: `BFP/.artifacts/verified/mobile-home.png`

- [ ] Run the existing local server and capture script.
- [ ] Inspect all three hero captures for proportion, anchoring, and overlap.
- [ ] Run the full test suite once more before completion.


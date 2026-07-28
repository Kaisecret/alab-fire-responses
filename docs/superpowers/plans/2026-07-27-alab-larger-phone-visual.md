# ALAB Larger Two-Phone Hero Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge and reposition the existing two-phone hero artwork to match the supplied reference while preserving responsive readability.

**Architecture:** Update only the phone sizing and positioning tokens in the existing hero CSS. Extend the hero contract to protect the larger desktop, tablet, and mobile dimensions.

**Tech Stack:** CSS3, Node.js built-in test runner, headless Chrome.

## Constraints

- Keep `BFP/images/phone.png` unchanged.
- Keep the fixed header, firefighter, hero copy, actions, and lower page unchanged.
- Use `clamp(23rem, 26vw, 31rem)` on desktop.
- Use `clamp(21rem, 31vw, 26rem)` at 1180px.
- Use `clamp(21rem, 48vw, 25rem)` at 900px.
- Use `clamp(18rem, 78vw, 22rem)` at 640px.
- Keep tablet and mobile phone tops below the actions.
- Prevent horizontal overflow.

## Tasks

- [ ] Update the hero contract with the new widths and desktop top offset.
- [ ] Run the hero test and confirm the current smaller phone fails.
- [ ] Update the responsive phone CSS.
- [ ] Run all tests.
- [ ] Render desktop, tablet, and mobile views and inspect overlap and overflow.


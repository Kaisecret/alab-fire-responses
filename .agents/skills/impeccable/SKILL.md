---
name: impeccable
description: Design guidance for AI coding agents based on pbakaus/impeccable. Provides expert creative direction, anti-pattern detection (no generic templates, no Inter default, no nested cards, purposeful motion, tinted darks and lights), and 23 steering commands (craft, critique, audit, polish, typeset, colorize, bolder, quieter, harden, layout, delight, animate).
---

# Impeccable Design System & Guidance

Adapted from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) for high-craft UI/UX engineering.

## 1. Core Design Philosophy

Impeccable acts as a Creative Director and Design Principal for AI coding agents, ensuring that every interface is:
1. **Intentionally Crafted**: Avoids generic "AI slop" (overused purple/indigo gradients, default Inter font everywhere, cards inside cards inside cards).
2. **Context-Aware**: Distinguishes between **Product Mode** (high-density dashboards, tactical command centers, data grids) and **Brand Mode** (marketing sites, storytelling, hero showcases).
3. **Harmonious & Tinted**: No pure `#000000` or `#808080`. Always use tinted darks (`#0F172A`, `#1E293B`, `#161C2B`) and tinted canvas backgrounds (`#EEF5FD`, `#F8FAFC`).
4. **Physically Intuitive**: Micro-interactions with purposeful easing (e.g. `cubic-bezier(0.4, 0, 0.2, 1)` or `cubic-bezier(0.16, 1, 0.3, 1)`). Never use cartoonish bounce/elastic easing in enterprise/emergency tools.

---

## 2. Anti-Patterns (Never Do These)

| Anti-Pattern | What to Do Instead |
| :--- | :--- |
| **Generic Inter Font** | Use distinctive, tailored typography (e.g. `Plus Jakarta Sans`, `Outfit`, `Manrope`, `Cabinet Grotesk`, `Cinzel`). |
| **Pure Gray / Un-tinted Grays** | Use tinted slates and cool neutrals with slate/blue undertones (e.g. `#64748B`, `#475569`, `#1E293B`). |
| **Gray Text on Colored/Tinted BG** | Use high-contrast tinted darks or matching saturated tones with proper WCAG AAA / AA contrast ratios. |
| **Nested Cards Inside Cards** | Use divider lines, tonal surfaces, subtle background shifts, or clean whitespace hierarchy instead of nesting rounded bordered cards infinitely. |
| **Card Borders with No Elevation** | Combine subtle border (`1px solid #E2E8F0`) with multi-layered soft shadows (`0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)`). |
| **Hard, Abrupt Hover States** | Add smooth CSS transitions (`transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); transform: translateY(-2px);`). |
| **Colliding Metric Numbers & Labels** | Place labels, large values, and subtexts on independent vertical stacks so counts like `1,000+` never break or warp adjacent text. |

---

## 3. Steering Commands & Workflows

When directing or refining UI, apply the corresponding Impeccable workflow:

- **/impeccable craft**: Full shape-then-build flow with high visual craft and responsive validation.
- **/impeccable polish**: Final design pass: check visual balance, optical alignment, spacing consistency, and shipping readiness.
- **/impeccable critique**: UX/UI design review: hierarchy, clarity, emotional resonance, and focus flow.
- **/impeccable audit**: Technical quality check: accessibility contrast, touch targets (`touch-action: manipulation; min 38px`), performance, and no-overflow layouts.
- **/impeccable typeset**: Fix font sizing, letter spacing, font-weights (800 for headers, 700 for labels, 500 for data), and line heights.
- **/impeccable colorize**: Apply the curated project palette (`#E23632` primary red, `#EEF5FD` soft canvas, `#0F172A` deep navy, `#10B981` status green, `#D97706` amber alert).
- **/impeccable bolder**: Amplify weak, timid layouts with stronger contrast, larger badges, and bold hero numbers.
- **/impeccable quieter**: Tone down overly busy elements, soften borders, and increase breathing room.
- **/impeccable harden**: Ensure error handling, zero-state illustrations, text truncation with tooltips, and loading skeletons.
- **/impeccable delight**: Add subtle micro-animations (pulsing status dots, smooth drawer slide-ins, hover lifts).

---

## 4. ALAB Design System Tokens

```css
:root {
  /* Brand Accents */
  --alab-red: #E23632;
  --alab-red-hover: #c42724;
  --alab-red-soft: #FFF1F2;
  --alab-red-border: #FFE4E6;
  --alab-red-glow: rgba(226, 54, 50, 0.18);

  /* Status Colors */
  --alab-green: #10B981;
  --alab-green-soft: #ECFDF5;
  --alab-amber: #D97706;
  --alab-amber-soft: #FFFBEB;
  --alab-blue: #2563EB;
  --alab-blue-soft: #EFF6FF;

  /* Neutrals & Surfaces */
  --alab-canvas: #EEF5FD;
  --alab-surface: #FFFFFF;
  --alab-border: #E2E8F0;
  --alab-border-light: #F1F5F9;

  /* Typography Colors */
  --alab-text-primary: #0F172A;
  --alab-text-secondary: #334155;
  --alab-text-muted: #64748B;
  --alab-text-light: #94A3B8;

  /* Shadows */
  --alab-shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.03);
  --alab-shadow-md: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  --alab-shadow-lg: 0 8px 26px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04);
}
```

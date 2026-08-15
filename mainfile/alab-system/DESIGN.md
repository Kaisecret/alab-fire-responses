# ALAB Design System Specification (Impeccable Standard)

Based on [pbakaus/impeccable](https://github.com/pbakaus/impeccable).

## 1. Product Context
- **Product**: ALAB (GIS-Based Provincial & Municipal Fire Response and Decision Support System).
- **Core Audiences**: Provincial BFP Marshals, Municipal BFP Station Commanders, Dispatchers, and Field Responders.
- **Design Lane**: **Product Mode** (High-craft mission-critical command center, fast-glance status indicators, zero latency, high-density tactical grids).

---

## 2. Color Palette & Semantics

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| **Brand Red** | `#E23632` | Primary brand accent, active indicators, alert badges, CTA buttons |
| **Brand Red Soft** | `#FFF1F2` | Active pill background, selected tab highlight |
| **Canvas Background** | `#EEF5FD` | Global portal background canvas across Provincial and Municipal BFP |
| **Card Surface** | `#FFFFFF` | Metric tiles, data tables, quick action cards, drawer containers |
| **Border Neutral** | `#E2E8F0` | Card borders, table dividers, input borders |
| **Text Primary** | `#0F172A` | Headings, bold metric values, municipality names |
| **Text Secondary** | `#334155` | Body copy, table data cells, responder counts |
| **Text Muted** | `#64748B` | Subtitles, timestamps, table column headers |
| **Success Emerald** | `#10B981` | Station online indicators, ready fleet status |
| **Warning Amber** | `#D97706` | Verification queue alerts, mutual aid status |
| **Info Blue** | `#2563EB` | Municipal stations connected metric, tanker resources |

---

## 3. Typography Hierarchy
- **Font Family**: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`
- **Metric Big Numbers**: `1.65rem` - `1.75rem`, `font-weight: 800`, `line-height: 1.1`
- **Section Headings**: `1.05rem` - `1.25rem`, `font-weight: 800`, `letter-spacing: -0.02em`
- **Card Labels / Table Headers**: `0.68rem` - `0.72rem`, `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: 0.04em`
- **Body & Metadata**: `0.78rem` - `0.85rem`, `font-weight: 500` / `600`

---

## 4. Elevation & Motion
- **Resting Card Shadow**: `box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);`
- **Card Hover Elevation**: `transform: translateY(-2px); box-shadow: 0 8px 26px rgba(15, 23, 42, 0.08);`
- **Transitions**: `transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);`
- **Touch Responsiveness**: `touch-action: manipulation; -webkit-tap-highlight-color: transparent; cursor: pointer;`

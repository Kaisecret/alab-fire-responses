# Level of Danger (AHP): current code and planned changes

## Implementation note (2026-09-27)

The application now dispatches by fire type through a shared assessment used on report submission and tactical reassessment. It includes a geometric-mean AHP helper with consistency ratio validation, separate structural and vegetation scoring, a nearest mapped-building lookup, vehicle and rubbish rules, and fire-type-specific factor text. Rule-based levels store representative scores (Low 15, Moderate 40, High 60); the municipal detail view labels these as rule-based. The current structural weights are density 25.79%, wind 20.11%, material 26.57%, route 18.89%, and weather 8.64%. The current vegetation weights are wind 31.93%, weather 18.73%, nearest mapped-building distance 29.21%, and route 20.13% (rounded to two decimals).

**BFP validation is still required.** The matrices currently in `lib/fire-reports/severity.ts` are element-wise geometric-mean aggregates of 12 *synthetic* questionnaires created for testing. Their pairwise ratings are recorded in `docs/ahp-synthetic-comparisons.json`; the Word examples are in the local `tests/Simulated BFP AHP Responses/` directory. These responses were not supplied by BFP personnel and must never be presented as real survey results or BFP-approved weights. Their low consistency ratios show that the examples are mathematically coherent; they do not validate the fire-risk model. Replace both matrices with the element-wise geometric mean of actual BFP questionnaires, record respondent count and positions for Chapter 3, and verify CR <= 0.10 before claiming the thesis method is implemented with BFP data. The vegetation distance bands and vehicle/rubbish rules also await BFP confirmation. Google Open Buildings supplies mapped building footprints, not verified house occupancy; vegetation factors state that limitation.

The sections below preserve the original design brief and describe the pre-update state where marked "current".

The historical sections below describe the pre-update system and the original implementation brief; use the implementation note above for the current model and provenance.

## 1. What the paper now says (target)

- Level of Danger has four levels: **Low, Moderate, High, Critical**.
- **House and building fires** (`HOUSE_BUILDING`) are scored 0–100 with AHP weights on five criteria: house density, wind, structure material, route accessibility, and weather (temperature and humidity).
- **Grass and forest fires** (`GRASS`, `FOREST`) are scored 0–100 with a **separate** set of AHP weights on four criteria: wind, weather, **distance to the nearest houses**, and route accessibility.
- **Vehicle fires** (`VEHICLE`) use a rule: start at **Moderate**; become **High** when among closely built houses or on a narrow road.
- **Rubbish fires** (`OTHER`, shown in the UI as "Rubbish Fire") use a rule: start at **Low**; become **Moderate** when beside closely built houses or when the wind is **25 km/h or more**.
- AHP weights come from **pairwise comparisons by BFP personnel** (Saaty 1–9 scale, answers combined by geometric mean) and are accepted only when the **consistency ratio (CR) is 0.10 or lower**.
- Score thresholds stay: Critical ≥ 75, High 50 to < 75, Moderate 25 to < 50, Low < 25.
- The system lists the conditions that raised the level. The Level of Danger does not measure the fire's size; BFP assesses that at the scene.
- The fire type is chosen by the reporter, so a wrong choice can affect the level until BFP verifies the report.

## 2. What the code does now (current)

Main file: `lib/fire-reports/severity.ts`, function `calculateFireSeverity(input)`.

**One model for every fire type.** Fixed weights, not derived from any pairwise matrix:

```ts
export const AHP_WEIGHTS = {
  density: 0.30, wind: 0.25, structure: 0.20, route: 0.15, weather: 0.10,
} as const;
```

No pairwise matrix, eigenvector, CI, or CR exists anywhere in the code or docs. The only related test checks that the weights sum to 1.00 (`tests/severity-ahp-calculation.test.mjs`).

**Criterion scores (0–100) used today:**

| Criterion | Rule in code |
|---|---|
| House density | `PACKED_MAGKAKADIKIT` = 100; `MODERATE_SPACING` or `ISOLATED_FAR` = 10; missing = 30 |
| Wind (km/h) | ≥ 40 = 100; ≥ 25 = 80; ≥ 12 = 45; below 12 = 15; missing wind defaults to 12 km/h |
| Structure material | `LIGHT_MATERIALS` = 100 (also assumed for a house fire with no material given and packed density); `COMMERCIAL_STORAGE` = 90; `MIXED_SEMI_CONCRETE` = 55; `CONCRETE` = 20; `GRASS`/`FOREST` with no material = 70 if wind ≥ 20 km/h, else 40; otherwise 40 |
| Route accessibility | `INTERIOR_ALLEY_ESKINITA` or `isOffRoadAlley` = 100; `DEAD_END_OR_BLOCKED` = 80; `NARROW_STREET` = 50; `WIDE_ROAD` = 10; missing = 15 |
| Weather | ≥ 33 °C and ≤ 55% RH = 100; ≥ 31 °C and ≤ 65% RH = 70; ≥ 85% RH = 10; otherwise 35. Missing values default to 29 °C and 75% RH |

**Output:** `{ score, level, alarmRecommendation, factors, weights }`. Recommendation text per level:

- Critical: "Recommend 2nd / 3rd Alarm: Full station dispatch + Tanker relay + Mutual aid standby"
- High: "Recommend 1st Alarm Full Response: Primary pumper + Auxiliary hose deployment"
- Moderate: "Recommend Standard Response: 1 Fire engine initial response"
- Low: "Recommend Minor Incident Verification: Single crew response"

**Where it is called:**

- `lib/fire-reports/service.ts` about line 92: on report submission, after `assessBuildingDensity(...)` and `prepareDensitySeverityContext(...)`.
- `lib/fire-reports/service.ts` about line 255: reassessment when report details (material, density, route) are corrected.
- Weather comes from `lib/weather/service.ts`, which falls back to 29 °C, 75% RH, and 12 km/h when the live station is unavailable.

**Where it is stored:** `fire_reports.calculated_severity` (`LOW`/`MODERATE`/`HIGH`/`CRITICAL`), `severity_score` (integer 0–100), `severity_factors` (jsonb). Added in `supabase/migrations/20260904000000_add_fire_report_severity_and_environmental_context.sql`.

**Where it is shown:** the UI already says "Level of Danger" in `municipal-incident-alarm.tsx`, `municipal-incident-detail.tsx`, and `provincial-report-console.tsx`. `municipal-incident-detail.tsx` about line 2213 shows `{incident.severityScore ?? 45}/100`, so a missing score displays as a fake 45.

**Fire types:** `HOUSE_BUILDING`, `GRASS`, `FOREST`, `VEHICLE`, `OTHER` (DB check constraint in `20260811125353_create_alab_resident_schema.sql`). `OTHER` is labeled "Rubbish Fire" / "Rubbish" / "Basura" in the web and mobile UI; the stored value is still `OTHER`.

## 3. Gaps between paper and code

| Paper says | Code does | Change needed |
|---|---|---|
| Weights come from BFP pairwise comparisons with CR ≤ 0.10 | Fixed weights 0.30/0.25/0.20/0.15/0.10 with no source | Compute weights from BFP matrices; record CR |
| Separate AHP for grass and forest fires | Same five-criterion model for all types | Add a vegetation model |
| Grass/forest criterion: distance to the nearest houses | Not computed. `assessBuildingDensity` only looks at buildings within **30 m** | New query for nearest building distance (for example up to 1 km) using `gis.building_footprints` |
| Vehicle fire rule (Moderate, High near packed houses or narrow road) | Scored by the house model | Add the rule |
| Rubbish fire rule (Low, Moderate near packed houses or wind ≥ 25 km/h) | Scored by the house model | Add the rule |
| Factor labels fit the fire type | Off-road label says "Eskinita / Makipot na looban" even for forests | Use a vegetation-specific label |
| — | `isOffRoadAlley` is declared but never set anywhere | Either compute it (OSRM snap distance) or remove it |

## 4. Planned code changes

1. **AHP helper** (new `lib/fire-reports/ahp.ts`): `computeAhpWeights(matrix)` returning `{ weights, lambdaMax, ci, cr }` using the principal eigenvector (or the geometric-mean row method) and Saaty's random index. Add `aggregateMatrices(matrices)` that combines respondents by element-wise geometric mean.
2. **Weight sets from BFP data:** store the aggregated pairwise matrices for both groups (Part A: house/building, 5×5; Part B: grass/forest, 4×4) in code, derive the weights with the helper, and fail a test if either CR > 0.10.
3. **Structural model** (`HOUSE_BUILDING`): keep the five criteria and scoring bands; use the Part A weights.
4. **Vegetation model** (`GRASS`, `FOREST`): criteria wind, weather, distance to nearest houses, route accessibility; use the Part B weights. Proposed distance bands, to confirm with BFP: under 50 m = 100, 50–200 m = 60, 200–500 m = 30, over 500 m = 10.
5. **Vehicle rule** (`VEHICLE`): Moderate by default; High when house density is `PACKED_MAGKAKADIKIT` or route is `NARROW_STREET`, `INTERIOR_ALLEY_ESKINITA`, or `DEAD_END_OR_BLOCKED`.
6. **Rubbish rule** (`OTHER`): Low by default; Moderate when house density is `PACKED_MAGKAKADIKIT` or wind is 25 km/h or more.
7. **Dispatcher:** `calculateFireSeverity` picks the model or rule by `fireType`; missing fire type falls back to the structural model.
8. **Factor labels:** per fire type (for example "Malayo sa kalsada / off-road area" for vegetation fires instead of the eskinita label).
9. **Keep unchanged:** thresholds 75/50/25, recommendation texts, stored columns, alarm doctrine (`lib/incidents/alarm-doctrine.ts`), and the `OTHER` stored value.

**Decision needed before coding:** what score to store for rule-based types (vehicle, rubbish). Options: store a representative score per level (for example Low 15, Moderate 40, High 60), or store `null` and change the UI to show "Rule-based" instead of the fake `?? 45` fallback.

## 5. Tests to add or update

- `computeAhpWeights`: a known Saaty example matrix gives the expected weights and CR.
- Both BFP weight sets sum to 1.00 and have CR ≤ 0.10.
- House fire: packed nipa houses in an eskinita with strong wind is Critical; isolated concrete house on a wide road in calm weather is Low or Moderate (existing tests, updated for new weights).
- Grass/forest fire: strong wind, dry weather, houses within 50 m, off-road is High or Critical; calm, humid, no houses within 500 m is Low.
- Vehicle fire: default Moderate; High among packed houses; High on a narrow street.
- Rubbish fire: default Low; Moderate beside packed houses; Moderate at wind 25 km/h.
- Reassessment path in `service.ts` uses the same dispatcher.

Run before finishing: `npm test`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build`.

## 6. Data needed from BFP first

- Part A questionnaire: 10 pairwise comparisons among the five house/building criteria.
- Part B questionnaire: 6 pairwise comparisons among the four grass/forest criteria.
- Number of respondents and their positions (for Chapter 3).
- Confirmation of the vehicle and rubbish rules and the distance bands.

## 7. Prompt for Claude when ready

```text
Update the Level of Danger in mainfile/alab-system to match docs/ahp-level-of-danger-plan.md.
Here are the BFP aggregated pairwise matrices:
  Part A (house/building; order: density, wind, structure, route, weather): <paste 5x5 matrix>
  Part B (grass/forest; order: wind, weather, nearest-house distance, route): <paste 4x4 matrix>
Decision for rule-based scores: <representative scores | null with "Rule-based" in UI>.
Implement sections 4 and 5 of the plan: AHP helper with CR check, structural and vegetation models,
vehicle and rubbish rules, dispatcher by fire type, nearest-house distance query, fire-type factor labels.
Keep thresholds, recommendation texts, stored columns, alarm doctrine, and the OTHER stored value.
Add the tests in section 5, then run npm test, tsc --noEmit, and npm run build, and report results.
Do not change the thesis documents.
```

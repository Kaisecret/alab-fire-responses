# Plan: Switch the Level of Danger scoring to the fire marshals' AHP weights

Written 2026-09-28. System changes only.

## Implementation status (2026-09-28)

The CSV importer and its tests are ready in `scripts/import-ahp-answers.mjs` and `tests/import-ahp-answers.test.mjs`. The entry template still has an example row and 12 blank respondent rows. The earlier `tests/BFP_AHP_Questionnaire_12_Respondents.docx` is a generated example, not documented field responses. The new target weights below have therefore **not** been installed in the scoring code; the current matrices and their source labels remain unchanged. Once the 12 completed BFP answer tables are provided, run the importer, verify the resulting weights and consistency ratios, then perform sections 2–7.

## Summary

Yes, the scoring in the system changes, but only the **weights**:

| Stays the same | Changes |
|---|---|
| How each factor is scored 0–100 (for example, packed houses = 100, narrow street = 50) | How much each factor counts in the total (the AHP weights) |
| Level bands: Critical ≥ 75, High ≥ 50, Moderate ≥ 25, Low < 25 | |
| Vehicle and rubbish fire rules (rule-based, no weights) | |

The system currently uses weights from 12 simulated questionnaires (`docs/ahp-synthetic-comparisons.json`). They will be replaced with weights built from the 12 fire marshals' answers.

## 0. Input needed

The system builds its weights from pairwise **answer tables**, not from percentages, and it will not start if a consistency ratio (CR) is above 0.10. It needs each fire marshal's answers:

- Part A: 10 pairs (house and building fires)
- Part B: 6 pairs (grass and forest fires)
- For each pair: the choice (A / Equal / B) and the rating (1–9)

Enter them in `tests/AHP Answers Entry Template.csv`, one row per fire marshal.

**Acceptance check:** combining the 12 answer tables must reproduce the weights below (±0.1%), with CR ≤ 0.10 for both fire groups.

### Target weights

| House/building fires | Old (test) | New | Grass/forest fires | Old (test) | New |
|---|---|---|---|---|---|
| House density | 25.8% | **31.2%** | Wind speed | 31.9% | **37.6%** |
| Structure material | 26.6% | **28.8%** | Distance to houses | 29.2% | **30.8%** |
| Route accessibility | 18.9% | **19.9%** | Weather | 18.7% | **15.9%** |
| Wind speed | 20.1% | **13.3%** | Route accessibility | 20.1% | **15.7%** |
| Weather | 8.6% | **6.8%** | | | |

### Effect on scores (examples)

**House fire:** packed houses, nipa/wood, narrow street, wind 15 km/h, normal weather.
- Old: 25.8 + 26.6 + 9.4 + 9.0 + 3.0 = **73.9 → HIGH**
- New: 31.2 + 28.8 + 10.0 + 6.0 + 2.4 = **78.3 → CRITICAL**

**Grass fire:** wind 45 km/h, normal weather, houses 500 m or more away, wide road.
- Old: 31.9 + 6.6 + 2.9 + 2.0 = **43.4 → MODERATE**
- New: 37.6 + 5.6 + 3.1 + 1.6 = **47.8 → MODERATE**

House-density and material conditions now push the level up faster. Wind matters less for house fires and more for grass and forest fires.

---

## 1. Data file

- **Add `docs/ahp-bfp-comparisons.json`:**
  - The 12 answers, in the same format as `docs/ahp-synthetic-comparisons.json`.
  - Criterion order:
    - structural: density, wind, structure, route, weather
    - vegetation: wind, weather, distance, route
  - Each answer is encoded as upper-triangle ratios: a positive number means the first factor wins, a negative number means the second factor wins, and 1 means equal.
  - `"source"`: "Pairwise comparisons of 12 municipal fire marshals, BFP Antique, September 2026".
  - List respondents by municipality and position only.
- **Keep `docs/ahp-synthetic-comparisons.json`** and relabel it as the earlier test run.
- **Add a small script, `scripts/import-ahp-answers.mjs`,** that turns the filled CSV template into the JSON file and prints:
  - the weights and CR for each group;
  - each respondent's individual CR, so inconsistent forms can be rechecked.

## 2. Scoring code (`lib/fire-reports/severity.ts`)

- Replace `STRUCTURAL_AHP_MATRIX` and `VEGETATION_AHP_MATRIX` with the element-wise geometric mean of the 12 real answer tables. Do not type in the percentages.
- Replace the `PROVISIONAL … synthetic` comment with the source, the respondent count and the date.
- Keep unchanged:
  - the `cr > 0.10` guard;
  - `windCriterion`, `weatherCriterion`, `routeCriterion` and the density/material scores;
  - the level bands;
  - the vehicle and rubbish rules.
- `lib/fire-reports/ahp.ts` needs no change.

## 3. Tests (`tests/`)

- **`severity-ahp-calculation.test.mjs`:**
  - The weights test expects the new values within ±0.001:
    - structural: density 0.312, structure 0.288, route 0.199, wind 0.133, weather 0.068
    - vegetation: wind 0.376, distance 0.308, weather 0.159, route 0.157
  - The matrix test reads `docs/ahp-bfp-comparisons.json` instead of the synthetic file.
  - Add a test that both CR values are ≤ 0.10.
  - Re-run the scenario tests (the grass case expected MODERATE, the packed-nipa case expected CRITICAL, the low case below 40). Update an expected level only if the new weights change it, and say so in the test name.
- **`resident-severity-integration.test.mjs`:** re-run; update expected levels only where the new weights change them.
- **`ahp.test.mjs`:** no change.

## 4. Resident side

- **New reports:** a report submitted after the switch gets its Level of Danger from the new weights automatically. This covers the status page (`resident-report-status.tsx`), the dashboard card and notifications. No screen or text change is needed, because residents see the level and the reasons, not the weights.
- **Existing reports:** they keep the level saved with the test weights. Pick one option:
  1. **Keep them (recommended).** Record the switch date so old and new scores can be told apart.
  2. **Re-score active reports.** Use the existing reassessment path (`assessReportDanger` in `lib/fire-reports/service.ts`) for reports that are not resolved yet.

## 5. BFP side (municipal and provincial)

- **Incident details:** they show `score/100`, or "Rule-based" for vehicle and rubbish fires. No change is needed.
- **Report exports** (`app/api/municipal-bfp/reports/export/route.ts`): they use the stored score, so old reports keep their old scores unless option 2 in section 4 is chosen.
- **Initial-response recommendation** (`alarmRecommendation` in `severity.ts`): it is derived from the level, so it follows automatically. For example, the house fire above now gets the CRITICAL recommendation instead of HIGH.

## 6. Part C answers (only if the fire marshals ask for changes)

Summarise the 12 Part C answers. Only if most of them agree, adjust:

- wind cut-offs: 12 / 25 / 40 km/h (`windCriterion`);
- distance-to-houses cut-offs: 50 / 200 / 500 m (`vegetationSeverity`);
- vehicle and rubbish rules (`calculateFireSeverity`);
- level bands (`levelForScore`).

Each change needs a matching test update.

## 7. Docs

- **`docs/ahp-level-of-danger-plan.md`:** replace the "BFP validation is still required" note with the new source, the respondent count, both CR values and a pointer to `docs/ahp-bfp-comparisons.json`.

## Checklist

- [ ] 12 answers entered in the CSV template
- [x] CSV importer and validation tests added (awaiting completed answers)
- [ ] Import script output matches the target weights (±0.1%); both CRs ≤ 0.10
- [ ] `severity.ts` matrices replaced; `PROVISIONAL` comment removed
- [ ] Tests updated and passing (`npm test`)
- [ ] Decision on existing reports recorded (section 4)
- [ ] `ahp-level-of-danger-plan.md` note updated

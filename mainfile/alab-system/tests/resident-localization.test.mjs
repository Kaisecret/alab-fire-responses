import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident localization module provides comprehensive Hiligaynon, Tagalog, and English translations", async () => {
  const i18nPath = join(appRoot, "app", "_lib", "resident-i18n.ts");
  assert.ok(existsSync(i18nPath), "resident-i18n module must exist");

  const i18nSource = readFileSync(i18nPath, "utf8");

  // 1. Language definitions
  assert.match(i18nSource, /code:\s*"tl"/);
  assert.match(i18nSource, /code:\s*"hil"/);
  assert.match(i18nSource, /code:\s*"en"/);

  // 2. Hiligaynon translations presence
  assert.match(i18nSource, /navHome:\s*"Balay"/);
  assert.match(i18nSource, /navReports:\s*"Mga Report"/);
  assert.match(i18nSource, /navReportFire:\s*"I-report ang Kalayo"/);
  assert.match(i18nSource, /typeHouse:\s*"Balay \/ Gusali"/);
  assert.match(i18nSource, /typeGrass:\s*"Sunog sa Hilamon"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Dinikit ang mga balay"/);
  assert.match(i18nSource, /tacticalAlley:\s*"Eskinita \/ Masiot nga dalan"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Ang pagpadala sang peke nga report/);

  // 3. Tagalog translations presence
  assert.match(i18nSource, /navHome:\s*"Home"/);
  assert.match(i18nSource, /navReportFire:\s*"Mag-ulat ng Sunog"/);
  assert.match(i18nSource, /typeHouse:\s*"Bahay \/ Gusali"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Dikit-dikit ang mga bahay"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Ang pagpapadala ng pekeng ulat/);

  // 4. English translations presence
  assert.match(i18nSource, /navReportFire:\s*"Report Fire"/);
  assert.match(i18nSource, /typeHouse:\s*"House \/ Building"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Packed Houses \/ Dense"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Filing a false fire alarm is strictly prohibited/);

  // 5. Storage and Event functions
  assert.match(i18nSource, /alab_resident_lang/);
  assert.match(i18nSource, /alab:resident-language-changed/);
});

test("resident profile page and content expose interactive 3-language switcher", () => {
  const profileContentPath = join(appRoot, "app", "_content", "resident-profile-content.ts");
  const profilePagePath = join(appRoot, "app", "resident", "profile", "page.tsx");

  assert.ok(existsSync(profileContentPath), "resident profile content must exist");
  assert.ok(existsSync(profilePagePath), "resident profile page must exist");

  const contentSource = readFileSync(profileContentPath, "utf8");
  const pageSource = readFileSync(profilePagePath, "utf8");

  // Content markup has buttons for tl, hil, and en
  assert.match(contentSource, /data-lang-select="tl"/);
  assert.match(contentSource, /data-lang-select="hil"/);
  assert.match(contentSource, /data-lang-select="en"/);
  assert.match(contentSource, /Tagalog/);
  assert.match(contentSource, /Hiligaynon/);
  assert.match(contentSource, /English/);
  assert.match(contentSource, /\.language-picker-container/);
  assert.match(contentSource, /\.lang-option-btn/);

  // Page logic wires up selection and storage
  assert.match(pageSource, /getStoredLanguage/);
  assert.match(pageSource, /setStoredLanguage/);
  assert.match(pageSource, /data-lang-select/);
  assert.match(pageSource, /alab:resident-language-changed/);
});

test("resident layout and mobile navigation adapt dynamically to selected language", () => {
  const layoutPath = join(appRoot, "app", "resident", "layout.tsx");
  const mobileNavPath = join(appRoot, "app", "_components", "resident-mobile-navigation.tsx");

  assert.ok(existsSync(layoutPath), "resident layout must exist");
  assert.ok(existsSync(mobileNavPath), "resident mobile nav must exist");

  const layoutSource = readFileSync(layoutPath, "utf8");
  const mobileNavSource = readFileSync(mobileNavPath, "utf8");

  // Layout integrates useResidentLanguage and language button
  assert.match(layoutSource, /useResidentLanguage/);
  assert.match(layoutSource, /cycleLanguage/);
  assert.match(layoutSource, /rl-lang-btn/);
  assert.match(layoutSource, /localizedNavItems/);

  // Mobile nav integrates useResidentLanguage
  assert.match(mobileNavSource, /useResidentLanguage/);
  assert.match(mobileNavSource, /t\("navHome"\)/);
  assert.match(mobileNavSource, /t\("navReports"\)/);
  assert.match(mobileNavSource, /t\("navReportFire"\)/);
  assert.match(mobileNavSource, /t\("navGuide"\)/);
  assert.match(mobileNavSource, /t\("navProfile"\)/);
});

test("resident report fire form dynamically translates steps, tactical pills, and false alarm modal", () => {
  const reportPagePath = join(appRoot, "app", "resident", "report-fire", "page.tsx");
  assert.ok(existsSync(reportPagePath), "report fire page must exist");

  const reportPageSource = readFileSync(reportPagePath, "utf8");

  assert.match(reportPageSource, /applyReportFireLanguage/);
  assert.match(reportPageSource, /typeButtonsMap/);
  assert.match(reportPageSource, /HOUSE_BUILDING/);
  assert.match(reportPageSource, /GRASS/);
  assert.match(reportPageSource, /tacticalSituation/);
  assert.match(reportPageSource, /confirmAlertTitle/);
  assert.match(reportPageSource, /falseAlarmWarningText/);
  assert.match(reportPageSource, /alab:resident-language-changed/);
});

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
  assert.match(i18nSource, /fullName:\s*"Bug-os nga Ngalan"/);
  assert.match(i18nSource, /typeHouse:\s*"Balay \/ Gusali"/);
  assert.match(i18nSource, /typeGrass:\s*"Sunog sa Hilamon"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Dinikit ang mga balay"/);
  assert.match(i18nSource, /tacticalAlley:\s*"Eskinita \/ Masiot nga dalan"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Ang pagpadala sang peke nga report/);

  // 3. Tagalog translations presence
  assert.match(i18nSource, /fullName:\s*"Buong Pangalan"/);
  assert.match(i18nSource, /typeHouse:\s*"Bahay \/ Gusali"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Dikit-dikit ang mga bahay"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Ang pagpapadala ng pekeng ulat/);

  // 4. English translations presence
  assert.match(i18nSource, /fullName:\s*"Full Name"/);
  assert.match(i18nSource, /typeHouse:\s*"House \/ Building"/);
  assert.match(i18nSource, /tacticalPacked:\s*"Packed Houses \/ Dense"/);
  assert.match(i18nSource, /falseAlarmWarningText:\s*"Filing a false fire alarm is strictly prohibited/);

  // 5. Storage and Event functions
  assert.match(i18nSource, /alab_resident_lang/);
  assert.match(i18nSource, /alab:resident-language-changed/);
});

test("resident profile page and content expose interactive 3-language switcher and full data-i18n labels", () => {
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

  // Profile labels have data-i18n
  assert.match(contentSource, /data-i18n="fullName"/);
  assert.match(contentSource, /data-i18n="mobileNumber"/);
  assert.match(contentSource, /data-i18n="municipality"/);
  assert.match(contentSource, /data-i18n="barangay"/);
  assert.match(contentSource, /data-i18n="emailAddress"/);
  assert.match(contentSource, /data-i18n="homeAddress"/);
  assert.match(contentSource, /data-i18n="accountStatus"/);
  assert.match(contentSource, /data-i18n="verified"/);
  assert.match(contentSource, /data-i18n="saveChanges"/);
  assert.match(contentSource, /data-i18n="changePassword"/);
  assert.match(contentSource, /data-i18n="pinSecurity"/);
  assert.match(contentSource, /data-i18n="loginActivity"/);
  assert.match(contentSource, /data-i18n="notificationSettings"/);
  assert.match(contentSource, /data-i18n="privacySettings"/);

  // Page logic wires up selection and storage
  assert.match(pageSource, /getStoredLanguage/);
  assert.match(pageSource, /setStoredLanguage/);
  assert.match(pageSource, /data-lang-select/);
  assert.match(pageSource, /applyResidentTranslations/);
  assert.match(pageSource, /alab:resident-language-changed/);
});

test("resident navigation bar remains fixed in English per user request", () => {
  const layoutPath = join(appRoot, "app", "resident", "layout.tsx");
  const mobileNavPath = join(appRoot, "app", "_components", "resident-mobile-navigation.tsx");

  assert.ok(existsSync(layoutPath), "resident layout must exist");
  assert.ok(existsSync(mobileNavPath), "resident mobile nav must exist");

  const layoutSource = readFileSync(layoutPath, "utf8");
  const mobileNavSource = readFileSync(mobileNavPath, "utf8");

  // Desktop nav words are fixed English
  assert.match(layoutSource, /label:\s*"Home"/);
  assert.match(layoutSource, /label:\s*"Reports"/);
  assert.match(layoutSource, /label:\s*"Report Fire"/);
  assert.match(layoutSource, /label:\s*"Guide"/);

  // Mobile nav labels are fixed English
  assert.match(mobileNavSource, /<span>Home<\/span>/);
  assert.match(mobileNavSource, /<span>Reports<\/span>/);
  assert.match(mobileNavSource, /<span>Report Fire<\/span>/);
  assert.match(mobileNavSource, /<span>Guide<\/span>/);
  assert.match(mobileNavSource, /<span>Profile<\/span>/);
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

test("resident reports page dynamically adapts table headers, filter tabs, and status badges to selected language", () => {
  const reportsPagePath = join(appRoot, "app", "resident", "reports", "page.tsx");
  assert.ok(existsSync(reportsPagePath), "resident reports page must exist");

  const reportsPageSource = readFileSync(reportsPagePath, "utf8");

  assert.match(reportsPageSource, /useResidentLanguage/);
  assert.match(reportsPageSource, /t\("reportsTitle"\)/);
  assert.match(reportsPageSource, /t\("reportsSubtitle"\)/);
  assert.match(reportsPageSource, /t\("thReference"\)/);
  assert.match(reportsPageSource, /t\("thLocation"\)/);
  assert.match(reportsPageSource, /t\("btnViewDetails"\)/);
  assert.match(reportsPageSource, /getLocalizedStatusLabel/);
});

test("resident guide page dynamically translates categories, hero emergency steps, and articles to selected language", () => {
  const guideComponentPath = join(appRoot, "app", "_components", "resident-guide-page.tsx");
  assert.ok(existsSync(guideComponentPath), "resident guide component must exist");

  const guideSource = readFileSync(guideComponentPath, "utf8");

  assert.match(guideSource, /useResidentLanguage/);
  assert.match(guideSource, /getLocalizedGuides/);
  assert.match(guideSource, /t\("guideTitle"\)/);
  assert.match(guideSource, /t\("guideCatAll"\)/);
  assert.match(guideSource, /t\("guideCatPrevention"\)/);
  assert.match(guideSource, /t\("guideHeroTitle"\)/);
  assert.match(guideSource, /t\("guideReadFull"\)/);
  assert.match(guideSource, /t\("guidePopularSection"\)/);
});


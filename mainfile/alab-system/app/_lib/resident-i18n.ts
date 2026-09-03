"use client";

import { useEffect, useState } from "react";

export type ResidentLanguage = "tl" | "hil" | "en";

export const RESIDENT_LANGUAGES: Array<{
  code: ResidentLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  region: string;
}> = [
  {
    code: "tl",
    label: "Tagalog",
    nativeLabel: "Filipino / Tagalog",
    flag: "🇵🇭",
    region: "Pambansang Wika",
  },
  {
    code: "hil",
    label: "Hiligaynon",
    nativeLabel: "Hiligaynon / Ilonggo",
    flag: "🏝️",
    region: "Panay & Antique",
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🌐",
    region: "International",
  },
];

export const RESIDENT_TRANSLATIONS = {
  tl: {
    // Nav & Layout
    navHome: "Home",
    navReports: "Mga Ulat",
    navReportFire: "Mag-ulat ng Sunog",
    navGuide: "Gabay",
    navProfile: "Profile",
    navProfileSettings: "Profile Settings",
    navHelpCenter: "Tulong at Gabay",
    navLogout: "Mag-logout",
    logoutTitle: "Mag-logout sa account?",
    logoutCopy: "Kailangan mong mag-sign in muli upang ma-access ang iyong resident account.",
    logoutCancel: "Kanselahin",
    logoutConfirm: "Oo, mag-logout",

    // Profile Page
    profileTitle: "Profile ng Residente",
    profileVerified: "Beripikadong Residente",
    profileSubtitle: "Pamahalaan ang iyong impormasyon at mga setting ng account.",
    municipalityOf: "Bayan ng",
    barangay: "Barangay",
    personalInfo: "Personal na Impormasyon",
    fullName: "Buong Pangalan",
    contactNumber: "Numero ng Telepono",
    emailAddress: "Email Address",
    homeAddress: "Tirahan",
    verificationStatus: "Katayuan ng Beripikasyon",
    verified: "Beripikado",

    // Language Section
    languageSettings: "Wika / Language",
    languageDesc: "Pumili ng wika para sa resident portal",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English (Ingles)",

    // Settings
    settings: "Mga Setting",
    security: "Seguridad",
    editProfile: "I-edit ang Profile",
    changePassword: "Palitan ang Password",
    pinSecurity: "PIN / Mga Setting ng Seguridad",
    loginActivity: "Kasaysayan ng Pag-login",
    notificationSettings: "Mga Setting ng Notipikasyon",
    emergencyContacts: "Mga Pang-emergency na Kontak",
    privacySettings: "Mga Setting sa Privacy",
    preferencesTitle: "Mga Kagustuhan / Notipikasyon",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Makatanggap ng mga pangkalahatang abiso",
    incidentUpdates: "Mga Update sa Insidente",
    incidentUpdatesDesc: "Mga real-time na alert ukol sa sunog",
    emergencyBroadcasts: "Mga Emergency Broadcast",
    emergencyBroadcastsDesc: "Kritikal na alert sa kaligtasan mula sa BFP",

    // Home Page
    welcomeGreeting: "Magandang Araw",
    readinessSubtext: "Handa ang BFP 24/7 para sa iyong kaligtasan",
    emergencyHotlines: "Mabilisang Tawag sa Emerhensya",
    call911: "Tawagan ang 911",
    callBfp: "Tawagan ang BFP Municipal",
    statusSubmitted: "Naipasa",
    statusVerifying: "Sinusuri",
    statusResponding: "Rumeresponde",
    statusResolved: "Naapula / Tapos",
    recentReportsTitle: "Kamakailang Mga Ulat",
    viewAllReports: "Tingnan Lahat ng Ulat",
    noReportsYet: "Wala pang naipapasang ulat.",

    // Report Fire
    reportFireTitle: "Mag-ulat ng Insidente ng Sunog",
    step1Location: "LOKASYON",
    detectingLocation: "Hinahanap ang lokasyon...",
    detectMyLocation: "Hanapin ang aking lokasyon",
    step2Landmark: "PINAKAMALAPIT NA LANDMARK",
    landmarkHelper: "Kusang pupunan ang kalapit na lugar. Maaari kang mag-type ng mas tiyak na landmark.",
    step3WhatIsBurning: "ANO ANG NASUSUNOG?",
    selectOneHint: "• Pumili ng isa (Need to click 1)",
    typeHouse: "Bahay / Gusali",
    typeGrass: "Sunog sa Damo",
    typeForest: "Sunog sa Gubat",
    typeVehicle: "Sunog sa Sasakyan",
    typeOther: "Iba pa",
    tacticalSituation: "SITWASYON SA LUGAR (OPTIONAL):",
    tacticalPacked: "Dikit-dikit ang mga bahay",
    tacticalPackedSub: "Mataas ang peligro ng pagkalat (< 2m)",
    tacticalAlley: "Eskinita / Makipot na daan",
    tacticalAlleySub: "Hindi mapasok ng truck · Kailangan ng mahabang hose",
    step4Photo: "MAGDAGDAG NG LARAWAN",
    step4PhotoReq: "(REQUIRED · KAHIT 1 LARAWAN)",
    step4PhotoHelper: "Kumuha ng larawan kung ligtas lamang gawin.",
    takePhotoBtn: "Kumuha ng Larawan / Buksan ang Camera",
    sendFireAlert: "IPADALA ANG FIRE ALERT",
    cancelBtn: "Kanselahin",

    // Warning Popups
    photoRequiredTitle: "Kailangan ng Larawan",
    photoRequiredDesc: "Mag-attach ng kahit 1 larawan ng sunog bago ipadala ang alert.",
    confirmAlertTitle: "Kumpirmahin ang Fire Alert",
    falseAlarmWarningTitle: "⚠️ BABALA SA FALSE ALARM:",
    falseAlarmWarningText: "Ang pagpapadala ng pekeng ulat o false alarm ay may karampatang parusa at pagkakakulong sa ilalim ng batas. Naka-record ang iyong eksaktong GPS location at device details na matutunton ng BFP at kapulisan.",
    confirmSendBtn: "Oo, Ipadala ang Alert",
    confirmCancelBtn: "Kanselahin / Cancel",

    // Offline Emergency
    offlineCallTitle: "Walang Koneksyon sa Internet",
    offlineCallDesc: "Naka-offline ang iyong device. Para sa agarang tulong, direktang tumawag sa mga hotline sa ibaba:",
  },

  hil: {
    // Nav & Layout
    navHome: "Balay",
    navReports: "Mga Report",
    navReportFire: "I-report ang Kalayo",
    navGuide: "Giya",
    navProfile: "Profile",
    navProfileSettings: "Mga Setting sang Profile",
    navHelpCenter: "Bulig kag Giya",
    navLogout: "Maggwa sa Account",
    logoutTitle: "Maggwa sa imo account?",
    logoutCopy: "Kinahanglan mo liwat magsulod para ma-access ang imo resident account.",
    logoutCancel: "Kanselahon",
    logoutConfirm: "Huo, maggwa",

    // Profile Page
    profileTitle: "Profile sang Residente",
    profileVerified: "Kumpirmado nga Residente",
    profileSubtitle: "Dumalaha ang imo personal nga impormasyon kag mga setting sang account.",
    municipalityOf: "Banwa sang",
    barangay: "Barangay",
    personalInfo: "Personal nga Impormasyon",
    fullName: "Bug-os nga Ngalan",
    contactNumber: "Numero sang Telepono",
    emailAddress: "Email Address",
    homeAddress: "Pulo / Puluy-an",
    verificationStatus: "Kaimtangan sang Beripikasyon",
    verified: "Beripikado",

    // Language Section
    languageSettings: "Lenggwahe / Wika",
    languageDesc: "Pilia ang lenggwahe para sa resident portal",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English (Ingles)",

    // Settings
    settings: "Mga Setting",
    security: "Seguridad",
    editProfile: "Bag-uhon ang Profile",
    changePassword: "Ilisan ang Password",
    pinSecurity: "PIN / Mga Setting sang Seguridad",
    loginActivity: "Agi sang Pag-login",
    notificationSettings: "Mga Setting sang Notipikasyon",
    emergencyContacts: "Mga Kontak sa Emerhensya",
    privacySettings: "Mga Setting sa Pribasiya",
    preferencesTitle: "Mga Gusto / Notipikasyon",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Magbaton sang pangkabilugan nga mga pahibalo",
    incidentUpdates: "Mga Update sa Insidente",
    incidentUpdatesDesc: "Real-time nga mga alert tuhoy sa kalayo",
    emergencyBroadcasts: "Mga Emergency Broadcast",
    emergencyBroadcastsDesc: "Kritikal nga mga alert sa kaluwasan halin sa BFP",

    // Home Page
    welcomeGreeting: "Maayong Adlaw",
    readinessSubtext: "Handa ang BFP 24/7 para sa imo kaluwasan",
    emergencyHotlines: "Madasig nga Tawag sa Emerhensya",
    call911: "Tawagan ang 911",
    callBfp: "Tawagan ang BFP Municipal",
    statusSubmitted: "Napasa",
    statusVerifying: "Ginasusi",
    statusResponding: "Garesponde",
    statusResolved: "Napatay / Tapos",
    recentReportsTitle: "Bag-o nga mga Report",
    viewAllReports: "Tan-awa ang Tanan nga Report",
    noReportsYet: "Wala pa sang napasa nga report.",

    // Report Fire
    reportFireTitle: "I-report ang Insidente sang Kalayo",
    step1Location: "LOKASYON",
    detectingLocation: "Ginatultol ang lokasyon...",
    detectMyLocation: "Tultula ang akon lokasyon",
    step2Landmark: "PINAKAMALAPIT NGA LANDMARK",
    landmarkHelper: "Kusang ginasulat ang malapit nga lugar. Pwede ka makatype sang mas insakto nga landmark.",
    step3WhatIsBurning: "ANO ANG GASUNOG?",
    selectOneHint: "• Magpili sang isa (Pili-a ang isa)",
    typeHouse: "Balay / Gusali",
    typeGrass: "Sunog sa Hilamon",
    typeForest: "Sunog sa Talon / Bukid",
    typeVehicle: "Sunog sa Salakyan",
    typeOther: "Iban pa",
    tacticalSituation: "SITWASYON SA LUGAR (OPTIONAL):",
    tacticalPacked: "Dinikit ang mga balay",
    tacticalPackedSub: "Mataas ang peligro sang paglapnag (< 2m)",
    tacticalAlley: "Eskinita / Masiot nga dalan",
    tacticalAlleySub: "Indi masudlan sang truck · Kinahanglan malaba nga hose",
    step4Photo: "MAGDUGANG SANG LITRATO",
    step4PhotoReq: "(REQUIRED · BISAN 1 KA LITRATO)",
    step4PhotoHelper: "Magkuha lamang sang litrato kon luwas sa katalagman.",
    takePhotoBtn: "Magkuha sang Litrato / Buksi ang Camera",
    sendFireAlert: "IPADALA ANG FIRE ALERT",
    cancelBtn: "Kanselahon",

    // Warning Popups
    photoRequiredTitle: "Kinahanglan sang Litrato",
    photoRequiredDesc: "Mag-attach sang bisan 1 ka litrato sang kalayo antes ipadala ang alert.",
    confirmAlertTitle: "Kumpirmaha ang Fire Alert",
    falseAlarmWarningTitle: "⚠️ PAHIBALO SA FALSE ALARM:",
    falseAlarmWarningText: "Ang pagpadala sang peke nga report ukon false alarm may nagakaigo nga silot kag pagkapreso sa idalom sang kasuguan. Naka-record ang imo eksakto nga GPS location kag detalye sang device nga matultulan sang BFP kag kapulisan.",
    confirmSendBtn: "Huo, Ipadala ang Alert",
    confirmCancelBtn: "Kanselahon / Cancel",

    // Offline Emergency
    offlineCallTitle: "Wala sing Koneksyon sa Internet",
    offlineCallDesc: "Naka-offline ang imo aparato. Para sa madasig nga bulig, direkta nga magtawag sa mga hotline sa idalom:",
  },

  en: {
    // Nav & Layout
    navHome: "Home",
    navReports: "Reports",
    navReportFire: "Report Fire",
    navGuide: "Guide",
    navProfile: "Profile",
    navProfileSettings: "Profile Settings",
    navHelpCenter: "Help Center",
    navLogout: "Log out",
    logoutTitle: "Log out of account?",
    logoutCopy: "You will need to sign in again to access your resident account.",
    logoutCancel: "Cancel",
    logoutConfirm: "Yes, log out",

    // Profile Page
    profileTitle: "Resident Profile",
    profileVerified: "Verified Resident",
    profileSubtitle: "Manage your personal information and account settings.",
    municipalityOf: "Municipality of",
    barangay: "Barangay",
    personalInfo: "Personal Information",
    fullName: "Full Name",
    contactNumber: "Phone Number",
    emailAddress: "Email Address",
    homeAddress: "Home Address",
    verificationStatus: "Verification Status",
    verified: "Verified",

    // Language Section
    languageSettings: "Language / Wika",
    languageDesc: "Choose your preferred language for the resident portal",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English",

    // Settings
    settings: "Settings",
    security: "Security",
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    pinSecurity: "PIN / Security Settings",
    loginActivity: "Login Activity",
    notificationSettings: "Notification Settings",
    emergencyContacts: "Emergency Contacts",
    privacySettings: "Privacy Settings",
    preferencesTitle: "Preferences / Notifications",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Receive general app notifications",
    incidentUpdates: "Incident Updates",
    incidentUpdatesDesc: "Real-time fire incident status alerts",
    emergencyBroadcasts: "Emergency Broadcasts",
    emergencyBroadcastsDesc: "Critical safety alerts from BFP",

    // Home Page
    welcomeGreeting: "Good Day",
    readinessSubtext: "BFP is on alert 24/7 for your safety",
    emergencyHotlines: "Quick Emergency Hotlines",
    call911: "Call 911",
    callBfp: "Call Municipal BFP",
    statusSubmitted: "Submitted",
    statusVerifying: "Verifying",
    statusResponding: "Responding",
    statusResolved: "Controlled / Resolved",
    recentReportsTitle: "Recent Reports",
    viewAllReports: "View All Reports",
    noReportsYet: "No reports filed yet.",

    // Report Fire
    reportFireTitle: "Report a Fire Incident",
    step1Location: "LOCATION",
    detectingLocation: "Detecting location...",
    detectMyLocation: "Detect my location",
    step2Landmark: "NEAREST LANDMARK",
    landmarkHelper: "A nearby place is filled automatically. You can type a different landmark if it is more accurate.",
    step3WhatIsBurning: "WHAT IS BURNING?",
    selectOneHint: "• Please select 1 fire type",
    typeHouse: "House / Building",
    typeGrass: "Grass Fire",
    typeForest: "Forest Fire",
    typeVehicle: "Vehicle Fire",
    typeOther: "Other",
    tacticalSituation: "SITUATION AT THE SCENE (OPTIONAL):",
    tacticalPacked: "Packed Houses / Dense",
    tacticalPackedSub: "High conflagration hazard (< 2m)",
    tacticalAlley: "Narrow Alley / Interior",
    tacticalAlleySub: "Truck cannot enter · Long hose needed",
    step4Photo: "ADD FIRE PHOTO",
    step4PhotoReq: "(REQUIRED · AT LEAST 1 PHOTO)",
    step4PhotoHelper: "Take a photo only when it is safe to do so.",
    takePhotoBtn: "Take a Photo / Open Camera",
    sendFireAlert: "SEND FIRE ALERT",
    cancelBtn: "Cancel",

    // Warning Popups
    photoRequiredTitle: "Photo Required",
    photoRequiredDesc: "Please attach at least 1 photo of the fire before sending the alert.",
    confirmAlertTitle: "Confirm Fire Alert",
    falseAlarmWarningTitle: "⚠️ FALSE ALARM WARNING:",
    falseAlarmWarningText: "Filing a false fire alarm is strictly prohibited and punishable with imprisonment under R.A. 9514 and the Revised Penal Code. Your exact GPS coordinates and device records are securely logged for BFP and police verification.",
    confirmSendBtn: "Yes, Send Alert",
    confirmCancelBtn: "Cancel",

    // Offline Emergency
    offlineCallTitle: "No Internet Connection",
    offlineCallDesc: "Your device is offline. For immediate life-safety assistance, call the emergency hotlines directly below:",
  },
} as const;

export type TranslationKeys = keyof (typeof RESIDENT_TRANSLATIONS)["en"];

const STORAGE_KEY = "alab_resident_lang";
const EVENT_NAME = "alab:resident-language-changed";

export function getStoredLanguage(): ResidentLanguage {
  if (typeof window === "undefined") return "tl";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "tl" || stored === "hil" || stored === "en") {
      return stored;
    }
  } catch {}
  return "tl"; // Tagalog default per resident preference
}

export function setStoredLanguage(lang: ResidentLanguage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { lang } }));
  } catch {}
}

export function useResidentLanguage(): {
  lang: ResidentLanguage;
  t: (key: TranslationKeys) => string;
  setLang: (lang: ResidentLanguage) => void;
} {
  const [lang, setLangState] = useState<ResidentLanguage>("tl");

  useEffect(() => {
    setLangState(getStoredLanguage());

    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: ResidentLanguage }>).detail;
      if (detail?.lang && (detail.lang === "tl" || detail.lang === "hil" || detail.lang === "en")) {
        setLangState(detail.lang);
      }
    };

    window.addEventListener(EVENT_NAME, handleLanguageChange);
    return () => window.removeEventListener(EVENT_NAME, handleLanguageChange);
  }, []);

  const t = (key: TranslationKeys): string => {
    const dict = RESIDENT_TRANSLATIONS[lang] || RESIDENT_TRANSLATIONS.tl;
    return dict[key] || RESIDENT_TRANSLATIONS.en[key] || "";
  };

  const setLang = (newLang: ResidentLanguage) => {
    setStoredLanguage(newLang);
    setLangState(newLang);
  };

  return { lang, t, setLang };
}

/**
 * Utility to batch-translate DOM elements with data-i18n attributes
 */
export function applyResidentTranslations(root: ParentNode, lang: ResidentLanguage): void {
  const dict = RESIDENT_TRANSLATIONS[lang] || RESIDENT_TRANSLATIONS.tl;
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as TranslationKeys;
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  });
}

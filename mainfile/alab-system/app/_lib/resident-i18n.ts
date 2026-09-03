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
    navReports: "Reports",
    navReportFire: "Report Fire",
    navGuide: "Guide",
    navProfile: "Profile",
    navProfileSettings: "Profile Settings",
    navHelpCenter: "Tulong at Gabay",
    navLogout: "Mag-logout",
    logoutTitle: "Mag-logout sa account?",
    logoutCopy: "Kailangan mong mag-sign in muli upang ma-access ang iyong resident account.",
    logoutCancel: "Kanselahin",
    logoutConfirm: "Oo, mag-logout",

    // Profile Page Header & Personal Information
    profileTitle: "Profile ng Residente",
    profileVerified: "Beripikadong Residente",
    profileSubtitle: "Pamahalaan ang iyong impormasyon at mga setting ng account.",
    municipalityOf: "Bayan ng",
    barangayLabel: "Barangay",
    personalInfo: "Personal na Impormasyon",
    editProfile: "I-edit ang Profile",
    fullName: "Buong Pangalan",
    mobileNumber: "Numero ng Telepono",
    contactNumber: "Numero ng Telepono",
    municipality: "Bayan",
    barangay: "Barangay",
    emailAddress: "Email Address",
    homeAddress: "Tirahan",
    accountStatus: "Katayuan ng Account",
    verificationStatus: "Katayuan ng Beripikasyon",
    verified: "Beripikado",
    saveChanges: "I-save ang mga Pagbabago",
    securityNote: "Ligtas at protektado ang iyong impormasyon.",

    // Language Section
    languageSettings: "Wika / Language",
    languageDesc: "Pumili ng wika para sa resident portal:",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English (Ingles)",

    // Settings & Security Section
    settings: "Mga Setting",
    security: "Seguridad",
    changePassword: "Palitan ang Password",
    pinSecurity: "PIN / Mga Setting ng Seguridad",
    loginActivity: "Kasaysayan ng Pag-login",
    notificationSettings: "Mga Setting ng Notipikasyon",
    emergencyContacts: "Mga Pang-emergency na Kontak",
    privacySettings: "Mga Setting sa Privacy",
    logout: "Mag-logout",

    // Preferences / Notifications
    preferencesTitle: "Mga Kagustuhan / Notipikasyon",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Makatanggap ng mga pangkalahatang abiso",
    incidentUpdates: "Mga Update sa Insidente",
    incidentUpdatesDesc: "Mga real-time na alert ukol sa iyong mga ulat",
    emergencyAlerts: "Mga Emergency Alert",
    emergencyAlertsDesc: "Kritikal na alert at babala sa sunog mula sa BFP",
    emergencyBroadcasts: "Mga Emergency Broadcast",
    emergencyBroadcastsDesc: "Kritikal na alert sa kaligtasan mula sa BFP",
    guideUpdates: "Mga Update sa Gabay",
    guideUpdatesDesc: "Bagong mga gabay at tips sa kaligtasan",

    // Activity Summary & Contacts
    activitySummary: "Buod ng Aktibidad",
    submittedReports: "Naipasa na mga Ulat",
    activeReports: "Aktibong mga Ulat",
    closedReports: "Naresolbang mga Ulat",
    viewAllReports: "Tingnan lahat ng ulat",
    updateProfileBtn: "I-update ang Profile",
    nationalEmergencyHotline: "Pambansang Hotline sa Emerhensya",
    bfpStationLabel: "Estasyon ng BFP sa San Jose",

    // Dialogs
    editContactDetailsTitle: "I-edit ang detalye ng kontak",
    nameBarangayNotice: "Ang pangalan at barangay ay beripikado at hindi mababago rito.",
    currentPasswordLabel: "Kasalukuyang password",
    newPasswordLabel: "Bagong password",
    confirmNewPasswordLabel: "Kumpirmahin ang bagong password",
    updatePasswordBtn: "I-update ang password",
    pinSecurityTitle: "PIN / Mga Setting ng Seguridad",
    pinSecurityNotice: "Magtakda ng apat na numerong PIN para sa mga aksyong pampribado.",
    fourDigitPinLabel: "Apat na numerong PIN",
    confirmPinLabel: "Kumpirmahin ang PIN",
    savePinBtn: "I-save ang PIN",
    loginActivityTitle: "Kasaysayan ng Pag-login",
    loginActivityNotice: "Mga kamakailang pag-sign in sa iyong account.",
    privacySettingsTitle: "Mga Setting sa Privacy",
    bfpConsentLabel: "Pahintulutan ang Bureau of Fire Protection na makipag-ugnayan sa akin para sa follow-up.",
    saveSettingsBtn: "I-save ang mga setting",
    cancelBtn: "Kanselahin",
    closeBtn: "Isara",

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
    noReportsYet: "Wala pang naipapasang ulat.",

    // Report Fire
    reportFireTitle: "Mag-ulat ng Insidente ng Sunog",
    fireEmergency: "Emerhensya sa Sunog",
    moveSafeLocation: "Pumunta sa ligtas na lugar bago ipadala ang ulat.",
    step1Location: "LOKASYON",
    detectingLocation: "Hinahanap ang lokasyon...",
    detectMyLocation: "Hanapin ang aking lokasyon",
    step2Landmark: "PINAKAMALAPIT NA LANDMARK",
    landmarkHelper: "Kusang pupunan ang kalapit na lugar. Maaari kang mag-type ng mas tiyak na landmark.",
    landmarkPlaceholder: "Mag-type ng landmark kung kailangan",
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
    addPhotoBtn: "Magdagdag ng larawan",
    sendFireAlert: "IPADALA ANG FIRE ALERT",

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

    // Reports Page
    reportsTitle: "Aking mga Ulat ng Sunog",
    reportsSubtitle: "Subaybayan ang bawat update mula sa iyong estasyon ng BFP.",
    reportsCountSingular: "ulat",
    reportsCountPlural: "mga ulat",
    reportsSearchPlaceholder: "Maghanap ayon sa reference o lokasyon",
    filterAll: "Lahat",
    filterActive: "Aktibo",
    filterClosed: "Naresolba",
    thReference: "Reference Blg.",
    thLocation: "Lokasyon",
    thDateReported: "Petsa ng Ulat",
    thStatus: "Katayuan",
    thAction: "Aksyon",
    btnViewDetails: "Tingnan ang detalye",
    reportsEmptyTitle: "Walang nahanap na ulat",
    reportsEmptyDesc: "Wala pang naitalang ulat ng insidente ng sunog sa kategoryang ito.",
    btnFileReport: "Mag-ulat ng Sunog",
    reportsLoading: "Ikinakarga ang iyong mga ulat ng sunog…",
    reportsShowing: "Ipinapakita ang",
    reportsOf: "sa",

    // Guide Page
    guideTitle: "Gabay sa Emerhensya",
    guideSubtitle: "Basahin ang opisyal na mga gabay sa kaligtasan at tamang pag-uulat.",
    guideSearchPlaceholder: "Maghanap ng gabay sa kaligtasan, pamamaraan, o tips",
    guideCatAll: "Lahat ng Gabay",
    guideCatPrevention: "Pag-iwas sa Sunog",
    guideCatReporting: "Pag-uulat ng Sunog",
    guideCatEvacuation: "Paglikas",
    guideCatFirstAid: "Pangunang Lunas",
    guideCatElectrical: "Kaligtasan sa Kuryente",
    guideHeroTitle: "Ano ang Dapat Gawin sa Oras ng Sunog",
    guideHeroSubtitle: "Mabilisang mga hakbang para sa kaligtasan ng iyong sarili at pamilya.",
    guideHeroStepsTitle: "Mga Hakbang sa Sunog",
    guideHeroStepsSub: "Sundin ang mga hakbang na ito para sa kaligtasan.",
    guideStep1Title: "1. I-report Agad",
    guideStep1Desc: "Tumawag agad sa 911 o BFP",
    guideStep2Title: "2. Lumikas Nang Ligtas",
    guideStep2Desc: "Sundin ang ligtas na labasan",
    guideStep3Title: "3. Kaligtasan sa Kusina",
    guideStep3Desc: "Mag-ingat sa kalan at mantika",
    guideStep4Title: "4. Sunog sa Damo at Gubat",
    guideStep4Desc: "Linisin ang tuyong damo at dahon",
    guideBackBtn: "← Bumalik sa mga Gabay",
    guideReadFull: "Basahin ang buong gabay",
    guideHotlinesHelp: "Kailangan ng agarang tulong?",
    guideHotlinesHelpSub: "Tumawag agad sa 911 o sa iyong lokal na istasyon ng BFP:",
    guidePopularSection: "Mga Karaniwang Gabay",
  },

  hil: {
    // Nav & Layout
    navHome: "Home",
    navReports: "Reports",
    navReportFire: "Report Fire",
    navGuide: "Guide",
    navProfile: "Profile",
    navProfileSettings: "Profile Settings",
    navHelpCenter: "Bulig kag Giya",
    navLogout: "Maggwa sa Account",
    logoutTitle: "Maggwa sa imo account?",
    logoutCopy: "Kinahanglan mo liwat magsulod para ma-access ang imo resident account.",
    logoutCancel: "Kanselahon",
    logoutConfirm: "Huo, maggwa",

    // Profile Page Header & Personal Information
    profileTitle: "Profile sang Residente",
    profileVerified: "Kumpirmado nga Residente",
    profileSubtitle: "Dumalaha ang imo personal nga impormasyon kag mga setting sang account.",
    municipalityOf: "Banwa sang",
    barangayLabel: "Barangay",
    personalInfo: "Personal nga Impormasyon",
    editProfile: "Bag-uhon ang Profile",
    fullName: "Bug-os nga Ngalan",
    mobileNumber: "Numero sang Telepono",
    contactNumber: "Numero sang Telepono",
    municipality: "Banwa",
    barangay: "Barangay",
    emailAddress: "Email Address",
    homeAddress: "Puluy-an",
    accountStatus: "Kaimtangan sang Account",
    verificationStatus: "Kaimtangan sang Beripikasyon",
    verified: "Kumpirmado",
    saveChanges: "I-save ang mga Pagbag-o",
    securityNote: "Luwas kag protektado ang imo impormasyon.",

    // Language Section
    languageSettings: "Lenggwahe / Language",
    languageDesc: "Pilia ang lenggwahe para sa resident portal:",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English (Ingles)",

    // Settings & Security Section
    settings: "Mga Setting",
    security: "Seguridad",
    changePassword: "Ilisan ang Password",
    pinSecurity: "PIN / Mga Setting sang Seguridad",
    loginActivity: "Agi sang Pag-login",
    notificationSettings: "Mga Setting sang Notipikasyon",
    emergencyContacts: "Mga Kontak sa Emerhensya",
    privacySettings: "Mga Setting sa Pribasiya",
    logout: "Maggwa sa Account",

    // Preferences / Notifications
    preferencesTitle: "Mga Gusto / Notipikasyon",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Magbaton sang pangkabilugan nga mga pahibalo",
    incidentUpdates: "Mga Update sa Insidente",
    incidentUpdatesDesc: "Real-time nga mga alert tuhoy sa imo mga report",
    emergencyAlerts: "Mga Emergency Alert",
    emergencyAlertsDesc: "Kritikal nga mga alert kag paandam sa kaluwasan halin sa BFP",
    emergencyBroadcasts: "Mga Emergency Broadcast",
    emergencyBroadcastsDesc: "Kritikal nga mga alert sa kaluwasan halin sa BFP",
    guideUpdates: "Mga Update sa Giya",
    guideUpdatesDesc: "Bag-o nga mga giya kag tips sa kaluwasan",

    // Activity Summary & Contacts
    activitySummary: "Kabilugan sang Hilikuton",
    submittedReports: "Napasa nga mga Report",
    activeReports: "Aktibo nga mga Report",
    closedReports: "Naresolba nga mga Report",
    viewAllReports: "Tan-awa ang tanan nga report",
    updateProfileBtn: "Bag-uhon ang Profile",
    nationalEmergencyHotline: "Pangnasyonal nga Hotline sa Emerhensya",
    bfpStationLabel: "Estasyon sang BFP sa San Jose",

    // Dialogs
    editContactDetailsTitle: "Bag-uha ang detalye sang kontak",
    nameBarangayNotice: "Ang ngalan kag barangay kumpirmado kag indi mabag-o diri.",
    currentPasswordLabel: "Ulihi nga password",
    newPasswordLabel: "Bag-o nga password",
    confirmNewPasswordLabel: "Kumpirmaha ang bag-o nga password",
    updatePasswordBtn: "Ilisan ang password",
    pinSecurityTitle: "PIN / Mga Setting sang Seguridad",
    pinSecurityNotice: "Magbutang sang apat ka numero nga PIN para sa seguridad.",
    fourDigitPinLabel: "Apat ka numero nga PIN",
    confirmPinLabel: "Kumpirmaha ang PIN",
    savePinBtn: "I-save ang PIN",
    loginActivityTitle: "Agi sang Pag-login",
    loginActivityNotice: "Mga bag-o nga pag-sign in sa imo account.",
    privacySettingsTitle: "Mga Setting sa Pribasiya",
    bfpConsentLabel: "Pasugtan ang Bureau of Fire Protection nga magkontak sa akon para sa follow-up.",
    saveSettingsBtn: "I-save ang mga setting",
    cancelBtn: "Kanselahon",
    closeBtn: "Sirad-i",

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
    noReportsYet: "Wala pa sang napasa nga report.",

    // Report Fire
    reportFireTitle: "I-report ang Insidente sang Kalayo",
    fireEmergency: "Emerhensya sa Kalayo",
    moveSafeLocation: "Magkadto sa luwas nga lugar antes ipadala ang report.",
    step1Location: "LOKASYON",
    detectingLocation: "Ginatultol ang lokasyon...",
    detectMyLocation: "Tultula ang akon lokasyon",
    step2Landmark: "PINAKAMALAPIT NGA LANDMARK",
    landmarkHelper: "Kusang ginasulat ang malapit nga lugar. Pwede ka makatype sang mas insakto nga landmark.",
    landmarkPlaceholder: "Ibutang ang landmark kon kinahanglan",
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
    addPhotoBtn: "Magdugang sang litrato",
    sendFireAlert: "IPADALA ANG FIRE ALERT",

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

    // Reports Page
    reportsTitle: "Akon mga Report sang Kalayo",
    reportsSubtitle: "Sundon ang kada update halin sa imo estasyon sang BFP.",
    reportsCountSingular: "report",
    reportsCountPlural: "mga report",
    reportsSearchPlaceholder: "Mangita gamit ang reference ukon lokasyon",
    filterAll: "Tanan",
    filterActive: "Aktibo",
    filterClosed: "Naresolba",
    thReference: "Reference Blg.",
    thLocation: "Lokasyon",
    thDateReported: "Petsa sang Report",
    thStatus: "Kaimtangan",
    thAction: "Aksyon",
    btnViewDetails: "Tan-awa ang detalye",
    reportsEmptyTitle: "Wala sing nakit-an nga report",
    reportsEmptyDesc: "Wala pa sang narekord nga report sang insidente sang kalayo sa sini nga kategorya.",
    btnFileReport: "Mag-report sang Kalayo",
    reportsLoading: "Ginapasahe ang imo mga report sang kalayo…",
    reportsShowing: "Ginatipon ang",
    reportsOf: "sa",

    // Guide Page
    guideTitle: "Giya sa Emerhensya",
    guideSubtitle: "Basaha ang opisyal nga mga giya sa kaluwasan kag insakto nga pag-report.",
    guideSearchPlaceholder: "Mangita sang giya sa kaluwasan, pamaagi, ukon tips",
    guideCatAll: "Tanan nga Giya",
    guideCatPrevention: "Paglikaw sa Kalayo",
    guideCatReporting: "Pag-report sang Kalayo",
    guideCatEvacuation: "Pagbakwit",
    guideCatFirstAid: "Una nga Bulig",
    guideCatElectrical: "Kaluwasan sa Kuryente",
    guideHeroTitle: "Ano ang Dapat Himuon kon May Kalayo",
    guideHeroSubtitle: "Madasig nga mga tikang para sa kaluwasan sang imo kaugalingon kag pamilya.",
    guideHeroStepsTitle: "Mga Tikang sa Kalayo",
    guideHeroStepsSub: "Sunda ang mga tikang nga ini para sa kaluwasan.",
    guideStep1Title: "1. I-report Dayon",
    guideStep1Desc: "Tawag dayon sa 911 ukon BFP",
    guideStep2Title: "2. Magbakwit sing Luwas",
    guideStep2Desc: "Sunda ang luwas nga guwaan",
    guideStep3Title: "3. Kaluwasan sa Kusina",
    guideStep3Desc: "Maghalong sa kalan kag mantika",
    guideStep4Title: "4. Sunog sa Talon kag Bukid",
    guideStep4Desc: "Hukson ang laya nga hilamon",
    guideBackBtn: "← Magbalik sa mga Giya",
    guideReadFull: "Basaha ang bilog nga giya",
    guideHotlinesHelp: "Kinahanglan sang madasig nga bulig?",
    guideHotlinesHelpSub: "Tawag dayon sa 911 ukon sa lokal nga estasyon sang BFP:",
    guidePopularSection: "Masami Ginatan-aw nga mga Giya",
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

    // Profile Page Header & Personal Information
    profileTitle: "Resident Profile",
    profileVerified: "Verified Resident",
    profileSubtitle: "Manage your personal information and account settings.",
    municipalityOf: "Municipality of",
    barangayLabel: "Barangay",
    personalInfo: "Personal Information",
    editProfile: "Edit Profile",
    fullName: "Full Name",
    mobileNumber: "Mobile Number",
    contactNumber: "Phone Number",
    municipality: "Municipality",
    barangay: "Barangay",
    emailAddress: "Email Address",
    homeAddress: "Home Address",
    accountStatus: "Account Status",
    verificationStatus: "Verification Status",
    verified: "Verified",
    saveChanges: "Save Changes",
    securityNote: "Your information is secure and encrypted.",

    // Language Section
    languageSettings: "Language / Wika",
    languageDesc: "Choose your preferred language for the resident portal:",
    tagalogLabel: "Tagalog (Filipino)",
    hiligaynonLabel: "Hiligaynon (Ilonggo)",
    englishLabel: "English",

    // Settings & Security Section
    settings: "Settings",
    security: "Security",
    changePassword: "Change Password",
    pinSecurity: "PIN / Security Settings",
    loginActivity: "Login Activity",
    notificationSettings: "Notification Settings",
    emergencyContacts: "Emergency Contacts",
    privacySettings: "Privacy Settings",
    logout: "Log out",

    // Preferences / Notifications
    preferencesTitle: "Preferences / Notifications",
    pushNotifications: "Push Notifications",
    pushNotificationsDesc: "Receive general app notifications",
    incidentUpdates: "Incident Updates",
    incidentUpdatesDesc: "Updates on your submitted reports",
    emergencyAlerts: "Emergency Alerts",
    emergencyAlertsDesc: "Critical alerts and fire safety warnings",
    emergencyBroadcasts: "Emergency Broadcasts",
    emergencyBroadcastsDesc: "Critical safety alerts from BFP",
    guideUpdates: "Guide Updates",
    guideUpdatesDesc: "New safety guides and tips",

    // Activity Summary & Contacts
    activitySummary: "Activity Summary",
    submittedReports: "Submitted Reports",
    activeReports: "Active Reports",
    closedReports: "Closed Reports",
    viewAllReports: "View all reports",
    updateProfileBtn: "Update Profile",
    nationalEmergencyHotline: "National Emergency Hotline",
    bfpStationLabel: "San Jose Fire Station",

    // Dialogs
    editContactDetailsTitle: "Edit contact details",
    nameBarangayNotice: "Name and barangay are verified details and cannot be changed here.",
    currentPasswordLabel: "Current password",
    newPasswordLabel: "New password",
    confirmNewPasswordLabel: "Confirm new password",
    updatePasswordBtn: "Update password",
    pinSecurityTitle: "PIN / Security Settings",
    pinSecurityNotice: "Set a four-digit PIN for security-sensitive actions.",
    fourDigitPinLabel: "Four-digit PIN",
    confirmPinLabel: "Confirm PIN",
    savePinBtn: "Save PIN",
    loginActivityTitle: "Login Activity",
    loginActivityNotice: "Recent sign-ins to your account.",
    privacySettingsTitle: "Privacy Settings",
    bfpConsentLabel: "Allow the Bureau of Fire Protection to contact me for emergency follow-up.",
    saveSettingsBtn: "Save settings",
    cancelBtn: "Cancel",
    closeBtn: "Close",

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
    noReportsYet: "No reports filed yet.",

    // Report Fire
    reportFireTitle: "Report a Fire Incident",
    fireEmergency: "Fire Emergency",
    moveSafeLocation: "Move to a safe location before sending the report.",
    step1Location: "LOCATION",
    detectingLocation: "Detecting location...",
    detectMyLocation: "Detect my location",
    step2Landmark: "NEAREST LANDMARK",
    landmarkHelper: "A nearby place is filled automatically. You can type a different landmark if it is more accurate.",
    landmarkPlaceholder: "Type a landmark if needed",
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
    addPhotoBtn: "Add photo",
    sendFireAlert: "SEND FIRE ALERT",

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

    // Reports Page
    reportsTitle: "My Fire Reports",
    reportsSubtitle: "Track every update from your Municipal BFP station.",
    reportsCountSingular: "report",
    reportsCountPlural: "reports",
    reportsSearchPlaceholder: "Search by reference or location",
    filterAll: "All",
    filterActive: "Active",
    filterClosed: "Closed",
    thReference: "Reference No.",
    thLocation: "Location",
    thDateReported: "Date Reported",
    thStatus: "Status",
    thAction: "Action",
    btnViewDetails: "View details",
    reportsEmptyTitle: "No reports found",
    reportsEmptyDesc: "No fire incident reports recorded in this category yet.",
    btnFileReport: "Report a Fire",
    reportsLoading: "Loading your fire reports…",
    reportsShowing: "Showing",
    reportsOf: "of",

    // Guide Page
    guideTitle: "Emergency Guide",
    guideSubtitle: "Read official fire safety guidance and reporting procedures.",
    guideSearchPlaceholder: "Search fire safety guides, procedures, or tips",
    guideCatAll: "All Guides",
    guideCatPrevention: "Fire Prevention",
    guideCatReporting: "Fire Reporting",
    guideCatEvacuation: "Evacuation",
    guideCatFirstAid: "First Aid",
    guideCatElectrical: "Electrical Safety",
    guideHeroTitle: "What to Do During a Fire Emergency",
    guideHeroSubtitle: "Quick steps to protect yourself, your family, and your community.",
    guideHeroStepsTitle: "Fire Emergency Steps",
    guideHeroStepsSub: "Follow these steps to stay safe.",
    guideStep1Title: "1. Report Immediately",
    guideStep1Desc: "Call 911 or BFP fast",
    guideStep2Title: "2. Evacuate Safely",
    guideStep2Desc: "Follow exit routes",
    guideStep3Title: "3. Kitchen Safety",
    guideStep3Desc: "Handle stove and grease",
    guideStep4Title: "4. Wildfire Tips",
    guideStep4Desc: "Clear dry brush & leaves",
    guideBackBtn: "← Back to Emergency Guides",
    guideReadFull: "Read full guide",
    guideHotlinesHelp: "Need immediate help?",
    guideHotlinesHelpSub: "Call 911 or your local station right away:",
    guidePopularSection: "Popular Fire Safety Guides",
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

/**
 * Localized fire report status badge helper for residents across Tagalog, Hiligaynon, and English
 */
export function getLocalizedStatusLabel(status: string, lang: ResidentLanguage): string {
  if (lang === "en") {
    switch (status) {
      case "PENDING_VERIFICATION":
      case "SUBMITTED":
        return "Submitted";
      case "UNDER_VERIFICATION":
      case "NEEDS_MORE_INFO":
        return "Verifying";
      case "VERIFIED":
      case "CONFIRMED":
        return "Verified";
      case "RESPONDING":
        return "Responding";
      case "FIRETRUCK_DISPATCHED":
        return "Dispatched";
      case "RESPONDER_ARRIVED":
        return "On Scene";
      case "UNDER_CONTROL":
        return "Under Control";
      case "RESOLVED":
      case "CLOSED":
        return "Resolved";
      case "REJECTED":
      case "FALSE_REPORT":
        return "Rejected";
      default:
        return status;
    }
  }
  if (lang === "hil") {
    if (["SUBMITTED", "PENDING_VERIFICATION"].includes(status)) return "Napasa";
    if (["UNDER_VERIFICATION", "NEEDS_MORE_INFO"].includes(status)) return "Ginasusi";
    if (["VERIFIED", "CONFIRMED"].includes(status)) return "Kumpirmado";
    if (["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED"].includes(status)) return "Garesponde";
    if (status === "UNDER_CONTROL") return "Kontrolado";
    if (["RESOLVED", "CLOSED"].includes(status)) return "Naresolba";
    if (["REJECTED", "FALSE_REPORT"].includes(status)) return "Ginpangindi";
    return status;
  }
  // Tagalog default
  if (["SUBMITTED", "PENDING_VERIFICATION"].includes(status)) return "Naipasa";
  if (["UNDER_VERIFICATION", "NEEDS_MORE_INFO"].includes(status)) return "Sinusuri";
  if (["VERIFIED", "CONFIRMED"].includes(status)) return "Kumpirmado";
  if (["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED"].includes(status)) return "Rumeresponde";
  if (status === "UNDER_CONTROL") return "Kontrolado na";
  if (["RESOLVED", "CLOSED"].includes(status)) return "Naresolba";
  if (["REJECTED", "FALSE_REPORT"].includes(status)) return "Tinanggihan";
  return status;
}

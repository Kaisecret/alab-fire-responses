"use client";

import { useEffect } from "react";
import { homeMarkup, homeStyles } from "../_content/resident-home-content";
import { getStoredLanguage, RESIDENT_TRANSLATIONS, type ResidentLanguage } from "../_lib/resident-i18n";

type Dashboard = {
  resident: { name: string; municipality: string; barangay: string };
  counts: Record<"submitted" | "verifying" | "responding" | "closed", number>;
  reports: Array<{ id: string; referenceNumber: string; label: string; tone: string }>;
};

export function ResidentHomePage() {
  useEffect(() => {
    // Dynamic date and time
    const updateDateTime = () => {
      const now = new Date();
      const dateEl = document.getElementById("currentDate");
      const timeEl = document.getElementById("currentTime");

      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      
      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000); // Update every minute

    const setText = (selector: string, value: string) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.textContent = value;
      });
    };

    const applyHomeLanguage = (lang: ResidentLanguage) => {
      const dict = RESIDENT_TRANSLATIONS[lang] || RESIDENT_TRANSLATIONS.tl;
      const statusLabels = document.querySelectorAll<HTMLElement>(".status-label");
      if (statusLabels.length >= 4) {
        statusLabels[0].textContent = dict.statusSubmitted;
        statusLabels[1].textContent = dict.statusVerifying;
        statusLabels[2].textContent = dict.statusResponding;
        statusLabels[3].textContent = dict.statusResolved;
      }
      const recentTitle = document.querySelector<HTMLElement>(".recent-card .card-title");
      if (recentTitle) recentTitle.textContent = dict.recentReportsTitle;
      const viewAll = document.querySelector<HTMLElement>(".recent-card .view-all");
      if (viewAll) viewAll.textContent = dict.viewAllReports;
      const emergencyBtnTitle = document.querySelector<HTMLElement>(".mobile-emergency-btn h2");
      if (emergencyBtnTitle) emergencyBtnTitle.textContent = dict.navReportFire.toUpperCase();
      const emergencyBtnTap = document.querySelector<HTMLElement>(".mobile-emergency-btn .tap-text");
      if (emergencyBtnTap) emergencyBtnTap.textContent = dict.navReportFire.toUpperCase();
    };

    applyHomeLanguage(getStoredLanguage());

    const onLangChange = (e: Event) => {
      const detail = (e as CustomEvent<{ lang?: ResidentLanguage }>).detail;
      if (detail?.lang) {
        applyHomeLanguage(detail.lang);
        const cached = localStorage.getItem("alab_cache_resident_dashboard");
        if (cached) {
          try {
            applyDashboardData(JSON.parse(cached));
          } catch {}
        }
      }
    };
    window.addEventListener("alab:resident-language-changed", onLangChange);

    const renderRecentReports = (reports: Dashboard["reports"]) => {
      const list = document.querySelector<HTMLElement>("[data-dashboard-recent]");
      if (!list) return;
      list.replaceChildren();
      const dict = RESIDENT_TRANSLATIONS[getStoredLanguage()] || RESIDENT_TRANSLATIONS.tl;
      if (!reports.length) {
        const empty = document.createElement("div");
        empty.className = "report-empty";
        empty.textContent = dict.noReportsYet;
        list.append(empty);
        return;
      }
      reports.forEach((report) => {
        const item = document.createElement("div");
        item.className = "report-item";
        const reference = document.createElement("span");
        reference.className = "report-id";
        reference.textContent = report.referenceNumber;
        const badge = document.createElement("span");
        badge.className = `report-badge ${report.tone}`;
        badge.textContent = report.label;
        const view = document.createElement("a");
        view.className = "btn-view";
        view.href = report.id ? `/resident/reports/${report.id}` : "/resident/reports";
        view.textContent = "View";
        item.append(reference, badge, view);
        list.append(item);
      });
    };

    const applyDashboardData = (body: Dashboard) => {
      if (!body?.resident) return;
      const dict = RESIDENT_TRANSLATIONS[getStoredLanguage()] || RESIDENT_TRANSLATIONS.tl;
      setText("[data-dashboard-name]", `${dict.welcomeGreeting}, ${body.resident.name}`);
      setText("[data-dashboard-municipality]", body.resident.municipality);
      setText("[data-dashboard-barangay]", body.resident.barangay);
      (Object.keys(body.counts) as Array<keyof Dashboard["counts"]>).forEach((status) => {
        setText(`[data-dashboard-count="${status}"]`, String(body.counts[status]));
      });
      renderRecentReports(body.reports || []);
    };

    // 1. Instant Cache: Load from localStorage/sessionStorage immediately in 0ms (No loading flicker when switching tabs or offline)
    try {
      const cached = localStorage.getItem("alab_cache_resident_dashboard") || sessionStorage.getItem("alab_cache_resident_dashboard");
      if (cached) {
        applyDashboardData(JSON.parse(cached));
      }
    } catch {}

    // 2. Background Revalidation: Fetch fresh data and update cache silently
    fetch("/api/resident/dashboard")
      .then(async (response) => ({ response, body: await response.json() as Dashboard }))
      .then(({ response, body }) => {
        if (!response.ok || !body?.resident) return;
        try {
          localStorage.setItem("alab_cache_resident_dashboard", JSON.stringify(body));
          sessionStorage.setItem("alab_cache_resident_dashboard", JSON.stringify(body));
        } catch {}
        applyDashboardData(body);
      })
      .catch(() => undefined);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("alab:resident-language-changed", onLangChange);
    };
  }, []);

  return (
    <>
      <style>{homeStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: homeMarkup }} />
    </>
  );
}

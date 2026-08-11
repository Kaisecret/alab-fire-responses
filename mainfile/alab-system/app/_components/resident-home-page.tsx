"use client";

import { useEffect } from "react";
import { homeMarkup, homeStyles } from "../_content/resident-home-content";

type Dashboard = {
  resident: { name: string; municipality: string; barangay: string };
  counts: Record<"submitted" | "verifying" | "confirmed" | "closed", number>;
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

    const renderRecentReports = (reports: Dashboard["reports"]) => {
      const list = document.querySelector<HTMLElement>("[data-dashboard-recent]");
      if (!list) return;
      list.replaceChildren();
      if (!reports.length) {
        const empty = document.createElement("div");
        empty.className = "report-empty";
        empty.textContent = "No reports yet.";
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
        view.href = "/resident/reports";
        view.textContent = "View";
        item.append(reference, badge, view);
        list.append(item);
      });
    };

    fetch("/api/resident/dashboard")
      .then(async (response) => ({ response, body: await response.json() as Dashboard }))
      .then(({ response, body }) => {
        if (!response.ok || !body.resident) return;
        setText("[data-dashboard-name]", `Welcome, ${body.resident.name}`);
        setText("[data-dashboard-municipality]", body.resident.municipality);
        setText("[data-dashboard-barangay]", body.resident.barangay);
        (Object.keys(body.counts) as Array<keyof Dashboard["counts"]>).forEach((status) => {
          setText(`[data-dashboard-count="${status}"]`, String(body.counts[status]));
        });
        renderRecentReports(body.reports);
      })
      .catch(() => undefined);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <style>{homeStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: homeMarkup }} />
    </>
  );
}

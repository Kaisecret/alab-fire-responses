"use client";

import { useEffect } from "react";
import { homeMarkup, homeStyles } from "../_content/resident-home-content";

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

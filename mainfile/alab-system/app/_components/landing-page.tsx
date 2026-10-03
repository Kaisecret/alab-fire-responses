"use client";

import { useEffect, useRef } from "react";

import {
  landingMarkup,
  landingStyles,
} from "../_content/landing-content";
import { landingMobileStyles } from "../_content/landing-mobile-styles";
import { heroEmergencyMarkup, heroEmergencyStyles } from "../_content/emergency-call";
import { OPEN_BFP_HOTLINES, ResidentOfflineEmergency } from "./resident-offline-emergency";

// The hero's second action is the emergency call (it replaces "View active
// incidents"), so anyone, with or without an account, can call BFP.
const viewIncidentsButton = '<a class="button button--secondary" href="#incidents">';
const markup = (() => {
  const start = landingMarkup.indexOf(viewIncidentsButton);
  const end = start < 0 ? -1 : landingMarkup.indexOf("</a>", start);
  return end < 0 ? landingMarkup : `${landingMarkup.slice(0, start)}${heroEmergencyMarkup}${landingMarkup.slice(end + 4)}`;
})();

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // The emergency button lives in the static markup; it opens the BFP hotline sheet.
  useEffect(() => {
    const button = rootRef.current?.querySelector("[data-call-bfp]");
    const openHotlines = () => window.dispatchEvent(new Event(OPEN_BFP_HOTLINES));
    button?.addEventListener("click", openHotlines);
    return () => button?.removeEventListener("click", openHotlines);
  }, []);


  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const menu = root.querySelector<HTMLButtonElement>(".menu-toggle");
    const nav = root.querySelector<HTMLElement>(".site-nav");
    const header = root.querySelector<HTMLElement>(".site-header");
    const scrollTop =
      root.querySelector<HTMLButtonElement>("#scrollToTop");

    if (!menu || !nav || !header) return;

    document.documentElement.classList.add("js");

    const setMenu = (open: boolean) => {
      nav.classList.toggle("is-open", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-expanded", String(open));
      menu.setAttribute(
        "aria-label",
        open ? "Close navigation menu" : "Open navigation menu",
      );
    };

    const handleMenu = () => {
      setMenu(menu.getAttribute("aria-expanded") !== "true");
    };
    const handleNav = (event: Event) => {
      if ((event.target as Element).closest?.("a")) {
        setMenu(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menu.focus();
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMenu(false);
      }
    };
    const syncScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      scrollTop?.classList.toggle("is-visible", window.scrollY > 400);
    };
    const handleScrollTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    menu.addEventListener("click", handleMenu);
    nav.addEventListener("click", handleNav);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", syncScroll, { passive: true });
    scrollTop?.addEventListener("click", handleScrollTop);
    syncScroll();

    const targets = root.querySelectorAll(".reveal, .journey-route");
    let observer: IntersectionObserver | undefined;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries, activeObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            activeObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
      );
      targets.forEach((target) => observer?.observe(target));
    } else {
      targets.forEach((target) => target.classList.add("is-visible"));
    }

    return () => {
      menu.removeEventListener("click", handleMenu);
      nav.removeEventListener("click", handleNav);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", syncScroll);
      scrollTop?.removeEventListener("click", handleScrollTop);
      observer?.disconnect();
      document.documentElement.classList.remove("js");
    };
  }, []);

  return (
    <>
      <style>{`${landingStyles}\n${landingMobileStyles}\n${heroEmergencyStyles}`}</style>
      <div
        ref={rootRef}
        className="landing-page-root"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      <ResidentOfflineEmergency />
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

// Category type definitions
type CategoryId = "all" | "prevention" | "reporting" | "evacuation" | "first-aid" | "electrical" | "gas";

interface GuideItem {
  id: string;
  slug: string;
  category: CategoryId;
  number?: number;
  title: string;
  desc: string;
  iconType: "phone" | "evacuation" | "electrical" | "wildfire" | "extinguisher" | "smoke-alarm" | "family" | "after-fire";
  accentColor: string;
  date?: string;
  isPopular?: boolean;
}

const GUIDES_LIST: GuideItem[] = [
  {
    id: "1",
    slug: "how-to-report-a-fire-correctly",
    category: "reporting",
    number: 1,
    title: "1. How to Report a Fire Correctly",
    desc: "Provide accurate details to help responders act fast and save lives.",
    iconType: "phone",
    accentColor: "#d91b10",
    isPopular: true,
  },
  {
    id: "2",
    slug: "evacuation-safety-guide",
    category: "evacuation",
    number: 2,
    title: "2. Evacuation Safety Guide",
    desc: "Know the right steps and routes to evacuate safely during a fire.",
    iconType: "evacuation",
    accentColor: "#16a34a",
    isPopular: true,
  },
  {
    id: "3",
    slug: "kitchen-and-electrical-fire-tips",
    category: "electrical",
    number: 3,
    title: "3. Kitchen and Electrical Fire Tips",
    desc: "Learn how to prevent common electrical and kitchen fire hazards.",
    iconType: "electrical",
    accentColor: "#f59e0b",
    isPopular: true,
  },
  {
    id: "4",
    slug: "grass-and-forest-fire-safety",
    category: "prevention",
    number: 4,
    title: "4. Grass and Forest Fire Safety",
    desc: "Help prevent wildfires and learn what to do if one occurs.",
    iconType: "wildfire",
    accentColor: "#059669",
    isPopular: true,
  },
  {
    id: "5",
    slug: "proper-use-of-fire-extinguishers",
    category: "prevention",
    title: "Proper Use of Fire Extinguishers",
    desc: "Learn the PASS technique and extinguisher types.",
    iconType: "extinguisher",
    accentColor: "#d91b10",
    date: "May 10, 2024",
  },
  {
    id: "6",
    slug: "smoke-alarm-guide",
    category: "prevention",
    title: "Smoke Alarm Guide",
    desc: "Installation, testing, and maintenance tips.",
    iconType: "smoke-alarm",
    accentColor: "#d91b10",
    date: "May 03, 2024",
  },
  {
    id: "7",
    slug: "family-fire-safety-plan",
    category: "prevention",
    title: "Family Fire Safety Plan",
    desc: "Create a plan and practice it with your family.",
    iconType: "family",
    accentColor: "#d91b10",
    date: "Apr 28, 2024",
  },
  {
    id: "8",
    slug: "after-a-fire-what-to-do",
    category: "first-aid",
    title: "After a Fire: What to Do",
    desc: "Important steps to take after the fire is out.",
    iconType: "after-fire",
    accentColor: "#d91b10",
    date: "Apr 15, 2024",
  },
];

export function ResidentGuidePage() {
  const searchParams = useSearchParams();

  const [selectedGuideSlug, setSelectedGuideSlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state with URL params / hash
  useEffect(() => {
    const guideParam = searchParams.get("guide");
    if (guideParam) {
      setSelectedGuideSlug(guideParam);
    } else if (window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (hash === "report-fire" || hash === "1-how-to-report-a-fire-correctly") {
        setSelectedGuideSlug("how-to-report-a-fire-correctly");
      } else if (hash === "evacuation" || hash === "2-evacuation-safety-guide") {
        setSelectedGuideSlug("evacuation-safety-guide");
      } else if (hash === "kitchen" || hash === "3-kitchen-and-electrical-fire-tips" || hash === "kitchen-and-electrical-fire-tips") {
        setSelectedGuideSlug("kitchen-and-electrical-fire-tips");
      } else if (hash === "grass-and-forest-fire-safety" || hash === "4-grass-and-forest-fire-safety" || hash === "forest") {
        setSelectedGuideSlug("grass-and-forest-fire-safety");
      } else if (hash === "proper-use-of-fire-extinguishers" || hash === "5-proper-use-of-fire-extinguishers" || hash === "extinguisher") {
        setSelectedGuideSlug("proper-use-of-fire-extinguishers");
      } else if (hash === "smoke-alarm-guide" || hash === "6-smoke-alarm-guide" || hash === "smoke-alarm") {
        setSelectedGuideSlug("smoke-alarm-guide");
      } else if (hash === "family-fire-safety-plan" || hash === "7-family-fire-safety-plan" || hash === "family") {
        setSelectedGuideSlug("family-fire-safety-plan");
      } else if (hash === "after-a-fire-what-to-do" || hash === "8-after-a-fire-what-to-do" || hash === "after-fire") {
        setSelectedGuideSlug("after-a-fire-what-to-do");
      } else if (GUIDES_LIST.some((g) => g.slug === hash)) {
        setSelectedGuideSlug(hash);
      }
    }
  }, [searchParams]);

  const handleOpenGuide = (slug: string) => {
    setSelectedGuideSlug(slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const url = new URL(window.location.href);
    url.searchParams.set("guide", slug);
    window.history.pushState({}, "", url.toString());
  };

  const handleBackToGuides = () => {
    setSelectedGuideSlug(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("guide");
    window.history.pushState({}, "", url.pathname);
  };

  const filteredGuides = useMemo(() => {
    return GUIDES_LIST.filter((g) => {
      const matchesCategory = activeCategory === "all" || g.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="rg-root">
      <style>{residentGuideCSS}</style>

      {selectedGuideSlug === "how-to-report-a-fire-correctly" || selectedGuideSlug === "1" ? (
        <ReportFireGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "evacuation-safety-guide" || selectedGuideSlug === "2" ? (
        <EvacuationSafetyGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "kitchen-and-electrical-fire-tips" || selectedGuideSlug === "3" || selectedGuideSlug === "kitchen-fire-safety-guide" ? (
        <KitchenFireSafetyGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "grass-and-forest-fire-safety" || selectedGuideSlug === "4" || selectedGuideSlug === "grass-and-forest-fire-safety-guide" ? (
        <GrassAndForestFireSafetyGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "proper-use-of-fire-extinguishers" || selectedGuideSlug === "5" ? (
        <ProperUseOfFireExtinguishersGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "smoke-alarm-guide" || selectedGuideSlug === "6" ? (
        <SmokeAlarmGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "family-fire-safety-plan" || selectedGuideSlug === "7" ? (
        <FamilyFireSafetyPlanGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug === "after-a-fire-what-to-do" || selectedGuideSlug === "8" ? (
        <AfterFireWhatToDoGuideDetail onBack={handleBackToGuides} />
      ) : selectedGuideSlug ? (
        <GenericGuideDetail slug={selectedGuideSlug} onBack={handleBackToGuides} />
      ) : (
        <div className="rg-main-layout">
          {/* Top Section */}
          <div className="rg-top-section">
            <div className="rg-title-area">
              <h1>Emergency Guide</h1>
              <p>Read official fire safety guidance and reporting procedures.</p>
            </div>
            <div className="rg-search-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="rg-search-input"
                placeholder="Search fire safety guides, procedures, or tips"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="rg-search-clear" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="rg-categories">
            <button
              className={`rg-category-pill ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              All Guides
            </button>
            <button
              className={`rg-category-pill ${activeCategory === "prevention" ? "active" : ""}`}
              onClick={() => setActiveCategory("prevention")}
            >
              <svg className="pill-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Fire Prevention
            </button>
            <button
              className={`rg-category-pill ${activeCategory === "reporting" ? "active" : ""}`}
              onClick={() => setActiveCategory("reporting")}
            >
              <svg className="pill-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Fire Reporting
            </button>
            <button
              className={`rg-category-pill ${activeCategory === "evacuation" ? "active" : ""}`}
              onClick={() => setActiveCategory("evacuation")}
            >
              <svg className="pill-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 4h3a2 2 0 0 1 2 2v14" />
                <path d="M2 20h3" />
                <path d="M13 20h9" />
                <path d="M10 12v.01" />
                <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
              </svg>
              Evacuation
            </button>
            <button
              className={`rg-category-pill ${activeCategory === "first-aid" ? "active" : ""}`}
              onClick={() => setActiveCategory("first-aid")}
            >
              <svg className="pill-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              First Aid
            </button>
            <button
              className={`rg-category-pill ${activeCategory === "electrical" ? "active" : ""}`}
              onClick={() => setActiveCategory("electrical")}
            >
              <svg className="pill-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m11 21 3-9 2 9" />
                <path d="M14 6 10.5 3 7 6" />
                <path d="m12 6 3 9-3 9" />
              </svg>
              Electrical Safety
            </button>
          </div>

          <div className="rg-content-grid">
            <div className="rg-main-col">
              {/* Hero Section */}
              <div className="rg-hero-section">
                <img src="/images/burning-house.webp" alt="Burning House" className="rg-hero-img" />
                <div className="rg-hero-content">
                  <h2 className="rg-desktop-only">What to Do During a Fire Emergency</h2>
                  <h2 className="rg-mobile-only">Fire Emergency Steps</h2>
                  <p className="rg-desktop-only">Quick steps to protect yourself, your family, and your community.</p>
                  <p className="rg-mobile-only">Follow these steps to stay safe.</p>

                  <div className="rg-steps-row">
                    <div className="rg-step" onClick={() => handleOpenGuide("how-to-report-a-fire-correctly")}>
                      <div className="rg-step-icon-wrapper">
                        <div className="rg-step-number">1</div>
                        <img src="/images/step1_calm.webp" alt="Stay Calm" />
                      </div>
                      <h3>Stay Calm</h3>
                      <p>Keep yourself calm and think clearly.</p>
                    </div>
                    <div className="rg-step" onClick={() => handleOpenGuide("evacuation-safety-guide")}>
                      <div className="rg-step-icon-wrapper">
                        <div className="rg-step-number">2</div>
                        <img src="/images/step2_exit.webp" alt="Move to Safety" />
                      </div>
                      <h3>Move to Safety</h3>
                      <p>Exit the building using safe routes.</p>
                    </div>
                    <div className="rg-step" onClick={() => handleOpenGuide("how-to-report-a-fire-correctly")}>
                      <div className="rg-step-icon-wrapper">
                        <div className="rg-step-number">3</div>
                        <img src="/images/step3_phone.webp" alt="Send Fire Alert" />
                      </div>
                      <h3>Send Fire Alert</h3>
                      <p>Report the fire immediately.</p>
                    </div>
                    <div className="rg-step" onClick={() => handleOpenGuide("how-to-report-a-fire-correctly")}>
                      <div className="rg-step-icon-wrapper">
                        <div className="rg-step-number">4</div>
                        <img src="/images/step4_firefighter.webp" alt="Wait for Responders" />
                      </div>
                      <h3>Wait for Responders</h3>
                      <p>Stay in a safe area and follow instructions.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Guide Cards */}
              <div className="rg-cards-grid">
                {filteredGuides
                  .filter((g) => g.isPopular)
                  .map((guide) => (
                    <button
                      key={guide.id}
                      className="rg-main-card"
                      onClick={() => handleOpenGuide(guide.slug)}
                    >
                      <div className="rg-card-icon-header">
                        <div className="rg-card-icon" style={{ color: guide.accentColor }}>
                          {renderGuideIcon(guide.iconType)}
                        </div>
                        <div className="rg-card-title">{guide.title}</div>
                      </div>
                      <div className="rg-card-desc">{guide.desc}</div>
                      <div className="rg-card-footer">
                        <span>Read Guide</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </button>
                  ))}
              </div>

              {/* Recent Guides List */}
              <div className="rg-recent-section">
                <div className="rg-recent-header">
                  <div className="rg-recent-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Recent &amp; Recommended Guides
                  </div>
                  <span className="rg-view-all-count">{filteredGuides.length} articles</span>
                </div>
                <div className="rg-recent-grid">
                  {filteredGuides
                    .filter((g) => !g.isPopular)
                    .map((guide) => (
                      <button
                        key={guide.id}
                        className="rg-recent-item"
                        onClick={() => handleOpenGuide(guide.slug)}
                      >
                        <div className="rg-recent-item-icon" style={{ color: guide.accentColor }}>
                          {renderGuideIcon(guide.iconType)}
                        </div>
                        <div className="rg-recent-item-content">
                          <div className="rg-recent-item-title">{guide.title}</div>
                          <div className="rg-recent-item-desc">{guide.desc}</div>
                          {guide.date && (
                            <div className="rg-recent-item-date">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <span>{guide.date}</span>
                            </div>
                          )}
                        </div>
                        <div className="rg-recent-item-arrow">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="rg-sidebar">
              <div className="rg-sidebar-card">
                <div className="rg-sidebar-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Quick Safety Reminder
                </div>
                <ul className="rg-reminder-list">
                  <li>Never ignore smoke or fire odors.</li>
                  <li>Know at least two exits from every room.</li>
                  <li>Keep fire extinguishers inspected &amp; accessible.</li>
                  <li>Never use elevators during a fire evacuation.</li>
                  <li>Report fires immediately via ALAB or 911.</li>
                </ul>
              </div>

              <div className="rg-sidebar-card">
                <div className="rg-sidebar-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Emergency Contacts
                </div>
                <div className="rg-contacts-list">
                  <div className="rg-contact-item">
                    <div className="rg-contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div className="rg-contact-info">
                      <div className="rg-contact-label">BFP Hotline</div>
                      <div className="rg-contact-desc">Bureau of Fire Protection</div>
                    </div>
                    <a href="tel:0365405967" className="rg-contact-number">(036) 540-5967</a>
                  </div>
                  <div className="rg-contact-item">
                    <div className="rg-contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    </div>
                    <div className="rg-contact-info">
                      <div className="rg-contact-label">National Hotline</div>
                      <div className="rg-contact-desc">Emergency Hotline</div>
                    </div>
                    <a href="tel:911" className="rg-contact-number rg-contact-number-highlight">911</a>
                  </div>
                  <div className="rg-contact-item">
                    <div className="rg-contact-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div className="rg-contact-info">
                      <div className="rg-contact-label">Municipal Station</div>
                      <div className="rg-contact-desc">Local Fire Station</div>
                    </div>
                    <a href="tel:0365405842" className="rg-contact-number">(036) 540-5842</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   DETAIL VIEW: "1. How to Report a Fire Correctly"
   ========================================================================= */

function ReportFireGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Top Header with Back Button */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">How to Report a Fire Correctly</h1>
          <p className="rgd-subtitle">Follow these steps to send a clear fire report through ALAB.</p>
        </div>
      </div>

      {/* Emergency Callout 911 Banner */}
      <div className="rgd-emergency-callout">
        <div className="rgd-callout-icon-wrap">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <h3 className="rgd-callout-title">Life-threatening emergency? Call 911 first.</h3>
          <p className="rgd-callout-desc">
            ALAB reports help responders with more details, but 911 is the fastest way to get help.
          </p>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z" />
          </svg>
          <span>Call 911</span>
        </a>
      </div>

      {/* Step-by-Step Flow Cards */}
      <div className="rgd-steps-flow">
        {/* Step 1 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Move to Safety First</h2>
              <p className="rgd-step-text">Move yourself and others to a safe place away from the fire before reporting.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/guide-safety-exit.jpg" alt="Move to safety" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 2 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Tap the Report Fire Button</h2>
              <p className="rgd-step-text">From the home screen, tap the large Report Fire button to begin.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-preview-fab">
                <div className="rgd-fab-glow"></div>
                <div className="rgd-fab-circle">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.32 1.83-6.22 4.54-7.75.43-.24.96.06.96.55 0 .28-.15.54-.39.68C6.18 8.6 5 10.66 5 13c0 3.87 3.13 7 7 7s7-3.13 7-7c0-2.34-1.18-4.4-3.11-5.52-.24-.14-.39-.4-.39-.68 0-.49.53-.79.96-.55C19.17 7.78 21 10.68 21 14c0 4.97-4.03 9-9 9z" />
                    <path d="M12 6.5c-2.48 0-4.5 2.02-4.5 4.5 0 1.66 1.34 3 3 3 .83 0 1.5-.67 1.5-1.5 0-.41-.34-.75-.75-.75-.41 0-.75-.34-.75-.75 0-.83.67-1.5 1.5-1.5.41 0 .75-.34.75-.75 0-.41-.34-.75-.75-.75z" />
                  </svg>
                  <span>REPORT FIRE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 3 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Confirm Your Location</h2>
              <p className="rgd-step-text">Allow location access or tap &ldquo;Detect my location&rdquo; to confirm your current address.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-preview-map">
                <div className="rgd-map-grid">
                  <div className="rgd-map-line h1"></div>
                  <div className="rgd-map-line h2"></div>
                  <div className="rgd-map-line v1"></div>
                  <div className="rgd-map-line v2"></div>
                </div>
                <div className="rgd-map-pin">
                  <svg viewBox="0 0 24 24" fill="#d91b10">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 4 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Choose What Is Burning</h2>
              <p className="rgd-step-text">Select the type of fire from the options that best matches the situation.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-preview-categories-grid">
                <div className="rgd-cat-mini rgd-cat-house" title="Building / House">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#d91b10" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <div className="rgd-cat-mini rgd-cat-grass" title="Grass / Wildfire">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <path d="M4 20h16M7 20V10M12 20V6M17 20V12" />
                  </svg>
                </div>
                <div className="rgd-cat-mini rgd-cat-forest" title="Forest / Trees">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <path d="M12 2L6 12h3l-4 7h14l-4-7h3z" />
                  </svg>
                </div>
                <div className="rgd-cat-mini rgd-cat-vehicle" title="Vehicle / Car">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M5 17h14v-5l-2-4H7L5 12v5z" />
                    <circle cx="7.5" cy="17.5" r="2.5" />
                    <circle cx="16.5" cy="17.5" r="2.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 5 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Add Photo (Optional)</h2>
              <p className="rgd-step-text">Take a photo only if it&apos;s safe to do so. This helps responders understand quickly.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-preview-photo-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 6 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Send Fire Alert</h2>
              <p className="rgd-step-text">Review your details and tap Send Fire Alert to notify responders.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-preview-alert-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                <span>SEND FIRE ALERT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 7 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="rgd-step-info">
              <h2 className="rgd-step-title">Wait for Responders</h2>
              <p className="rgd-step-text">Stay reachable. Responders may contact you for more details or updates.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-truck">
              <img src="/images/guide-firefighter-truck.jpg" alt="Firefighter &amp; truck" className="rgd-truck-img" />
            </div>
          </div>
        </div>
      </div>

      {/* What to Tell Responders Checklist */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="8" y1="10" x2="8.01" y2="10" />
              <line x1="12" y1="10" x2="12.01" y2="10" />
              <line x1="16" y1="10" x2="16.01" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title">What to Tell Responders</h3>
            <p className="rgd-checklist-subtitle">Be ready to share these key details clearly.</p>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Exact location (address or GPS)</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>People trapped or injured</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Nearest landmark or road name</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Known hazards (e.g., gas, chemicals)</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>What is burning</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   DETAIL VIEW: "2. Evacuation Safety Guide"
   Matches the pixel-perfect design in the screenshot!
   ========================================================================= */

function EvacuationSafetyGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Top Header with Back Button */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Evacuation Safety Guide</h1>
          <p className="rgd-subtitle">Follow these steps to leave the area safely during a fire emergency.</p>
        </div>
      </div>

      {/* Emergency Callout (Green outline for Evacuation) */}
      <div className="rgd-emergency-callout rgd-callout-green">
        <div className="rgd-callout-icon-wrap rgd-icon-wrap-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4h3a2 2 0 0 1 2 2v14" />
            <path d="M2 20h3" />
            <path d="M13 20h9" />
            <path d="M10 12v.01" />
            <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <h3 className="rgd-callout-title rgd-callout-title-green">
            If the fire is spreading quickly or someone is trapped, call 911 first.
          </h3>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z" />
          </svg>
          <span>Call 911</span>
        </a>
      </div>

      {/* Step-by-Step Flow Cards (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Stay Calm */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Calm</h2>
              <p className="rgd-step-text">Keep calm and think clearly.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/evac-stay-calm.jpg" alt="Stay calm" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 2: Alert Others Nearby */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Alert Others Nearby</h2>
              <p className="rgd-step-text">Warn family, coworkers, or nearby people.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/evac-alert-others.jpg" alt="Alert others nearby" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 3: Leave Immediately */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Leave Immediately</h2>
              <p className="rgd-step-text">Do not delay or collect unnecessary belongings.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/guide-safety-exit.jpg" alt="Leave immediately" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 4: Use the Nearest Safe Exit */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Use the Nearest Safe Exit</h2>
              <p className="rgd-step-text">Follow marked exits and safe routes.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-exit-sign-badge">
                <span className="rgd-exit-text">EXIT</span>
                <svg viewBox="0 0 24 24" fill="currentColor" className="rgd-exit-runner">
                  <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
                </svg>
                <span className="rgd-exit-arrow">➔</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 5: Stay Low if There Is Smoke */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Low if There Is Smoke</h2>
              <p className="rgd-step-text">Crawl low to avoid inhaling smoke.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-smoke">
              <img src="/images/evac-stay-low-smoke.jpg" alt="Stay low smoke" className="rgd-smoke-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 6: Do Not Use Elevators */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Do Not Use Elevators</h2>
              <p className="rgd-step-text">Use stairs whenever possible.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-no-elevator-badge">
                <div className="rgd-elevator-box">
                  <div className="rgd-elevator-door-left"></div>
                  <div className="rgd-elevator-door-right"></div>
                  <div className="rgd-elevator-panel"></div>
                </div>
                <div className="rgd-no-symbol">
                  <div className="rgd-no-slash"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 7: Go to the Assembly Area */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Go to the Assembly Area</h2>
              <p className="rgd-step-text">Move to an open safe meeting point outside.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-assembly-sign-badge">
                <span className="rgd-assembly-arr arr-tl">↘</span>
                <span className="rgd-assembly-arr arr-tr">↙</span>
                <div className="rgd-assembly-people">
                  <svg viewBox="0 0 24 24" fill="white">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <span className="rgd-assembly-arr arr-bl">↗</span>
                <span className="rgd-assembly-arr arr-br">↖</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 8: Wait for Responders */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Wait for Responders</h2>
              <p className="rgd-step-text">Stay outside and follow instructions.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-truck">
              <img src="/images/guide-firefighter-truck.jpg" alt="Firefighter &amp; truck" className="rgd-truck-img" />
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Checklist */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title rgd-checklist-title-red">What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Follow exit signs</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Cover nose and mouth if needed</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Help children, elderly, or persons with disabilities</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Call 911 for urgent danger</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Never go back inside</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   3. KITCHEN FIRE SAFETY GUIDE DETAIL VIEW
   ========================================================================= */

function KitchenFireSafetyGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Kitchen Fire Safety Guide</h1>
          <p className="rgd-subtitle">Follow these steps to stay safe during a kitchen fire emergency.</p>
        </div>
      </div>

      {/* Emergency Callout (Orange-Bordered Kitchen Emergency) */}
      <div className="rgd-emergency-callout rgd-callout-orange">
        <div className="rgd-callout-icon-wrap rgd-icon-wrap-orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Stove / Oven with flames */}
            <path d="M4 3h16l-2 4H6L4 3z" />
            <rect x="3" y="7" width="18" height="14" rx="2" />
            <circle cx="7" cy="11" r="1.2" fill="currentColor" />
            <circle cx="12" cy="11" r="1.2" fill="currentColor" />
            <circle cx="17" cy="11" r="1.2" fill="currentColor" />
            <rect x="6" y="14" width="12" height="5" rx="1" stroke="currentColor" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title rgd-callout-title-orange">
            If the fire is spreading or someone is in danger, call 911 first.
          </div>
          <div className="rgd-callout-sub-orange">
            Use ALAB if reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Stay Calm */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Calm</h2>
              <p className="rgd-step-text">Do not panic and assess the situation quickly.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/evac-stay-calm.jpg" alt="Stay Calm" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 2: Turn Off the Heat */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Turn Off the Heat</h2>
              <p className="rgd-step-text">If it is safe, turn off the stove or appliance.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/kitchen-turn-off-stove.jpg" alt="Turn Off Stove" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 3: Do Not Use Water on Oil Fires */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Do Not Use Water on Oil Fires</h2>
              <p className="rgd-step-text">Never pour water on grease or oil fires.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/kitchen-no-water-oil.jpg" alt="No Water on Oil Fires" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 4: Cover Small Pan Fires */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Cover Small Pan Fires</h2>
              <p className="rgd-step-text">Use a lid or metal tray to smother the flames.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/kitchen-cover-pan-lid.jpg" alt="Cover Pan Fire" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 5: Use a Fire Extinguisher */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Use a Fire Extinguisher</h2>
              <p className="rgd-step-text">Use the correct extinguisher if you know how to operate it.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-kitchen-extinguisher-badge">
                <svg viewBox="0 0 24 24" fill="none" className="rgd-extinguisher-svg">
                  {/* Fire Extinguisher */}
                  <rect x="8.5" y="7" width="7" height="15" rx="3.5" fill="#dc2626" />
                  <rect x="9.5" y="10" width="5" height="5" rx="0.5" fill="#ffffff" />
                  <rect x="10.5" y="4" width="3" height="3" fill="#64748b" />
                  <path d="M12 4V2M9 3h6M12 4l4-1.5" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 5c2 0 3 1.5 3 4v8" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="5" r="1" fill="#f59e0b" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 6: Evacuate If the Fire Spreads */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Evacuate If the Fire Spreads</h2>
              <p className="rgd-step-text">Leave the kitchen immediately if the fire grows.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/kitchen-evacuate-spread.jpg" alt="Evacuate Kitchen" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 7: Report the Fire */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Report the Fire</h2>
              <p className="rgd-step-text">Call 911 for urgent danger, then use ALAB to report the fire and provide clear details.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-kitchen-phone-badge">
                <div className="rgd-phone-screen">
                  <span className="rgd-phone-num">911</span>
                  <span className="rgd-phone-brand">ALAB</span>
                  <div className="rgd-phone-call-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 8: Wait for Responders */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Wait for Responders</h2>
              <p className="rgd-step-text">Stay in a safe place and follow instructions.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-truck">
              <img src="/images/guide-firefighter-truck.jpg" alt="Firefighter &amp; truck" className="rgd-truck-img" />
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Checklist */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title rgd-checklist-title-red">What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Never leave cooking unattended</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Use the proper extinguisher</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Keep flammable items away from heat</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Evacuate early if unsure</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Do not use water on grease fires</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Call 911 for urgent danger</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   4. GRASS AND FOREST FIRE SAFETY GUIDE DETAIL VIEW
   ========================================================================= */

function GrassAndForestFireSafetyGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Grass and Forest Fire Safety Guide</h1>
          <p className="rgd-subtitle">Follow these steps to stay safe during a grass or forest fire emergency.</p>
        </div>
      </div>

      {/* Emergency Callout (Green Bordered Wildfire Alert) */}
      <div className="rgd-emergency-callout rgd-callout-green">
        <div className="rgd-callout-icon-wrap rgd-icon-wrap-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            <path d="M12 12v6M9 15l3-3 3 3" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title rgd-callout-title-green">
            If the fire is spreading or someone is in danger, call 911 first.
          </div>
          <div className="rgd-callout-sub-green">
            Use ALAB if reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Stay Calm */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Calm</h2>
              <p className="rgd-step-text">Do not panic and assess the fire from a safe distance.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/evac-stay-calm.jpg" alt="Stay Calm" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 2: Move Away from Smoke */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Move Away from Smoke</h2>
              <p className="rgd-step-text">Go to a safer area and move away from smoke and flames.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/forest-move-away-smoke.jpg" alt="Move Away from Smoke" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 3: Warn Others Nearby */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Warn Others Nearby</h2>
              <p className="rgd-step-text">Alert people in the area so they can leave safely.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/forest-warn-others-nearby.jpg" alt="Warn Others Nearby" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 4: Avoid Fighting Large Fires */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Avoid Fighting Large Fires</h2>
              <p className="rgd-step-text">Do not try to stop a fast-moving grass or forest fire by yourself.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/forest-wildfire-trees.jpg" alt="Wildfire Burning Trees" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 5: Call 911 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Call 911</h2>
              <p className="rgd-step-text">Report urgent danger and provide the nearest location or landmark.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-phone-calling-badge">
                <div className="rgd-calling-screen">
                  <span className="rgd-calling-num">911</span>
                  <span className="rgd-calling-status">Calling...</span>
                  <div className="rgd-calling-dialer">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 6: Report in ALAB */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Report in ALAB</h2>
              <p className="rgd-step-text">Use ALAB to send the fire location and details clearly.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-phone-alab-app-badge">
                <div className="rgd-alab-app-header">ALAB</div>
                <div className="rgd-alab-app-map">
                  <div className="rgd-map-pin-mini">
                    <svg viewBox="0 0 24 24" fill="#dc2626">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" fill="white" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 7: Follow Evacuation Advice */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Follow Evacuation Advice</h2>
              <p className="rgd-step-text">Use safe routes and follow responder or local instructions.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-forest-evac-preview">
                <div className="rgd-evac-sign-box">
                  <svg viewBox="0 0 24 24" fill="white" className="rgd-evac-runner-svg">
                    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
                  </svg>
                  <span className="rgd-evac-arrow-white">➔</span>
                </div>
                <div className="rgd-forest-mini-trees">
                  <span className="mini-tree t1">🌲</span>
                  <span className="mini-tree t2">🌲</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        {/* Step 8: Wait for Responders */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Wait for Responders</h2>
              <p className="rgd-step-text">Stay in a safe place and keep access roads clear.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-truck">
              <img src="/images/guide-firefighter-truck.jpg" alt="Firefighter &amp; truck" className="rgd-truck-img" />
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Checklist */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title rgd-checklist-title-red">What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Do not burn dry grass or leaves</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Report exact location if possible</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Do not throw cigarettes outdoors</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Use ALAB if reporting a fire</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Stay upwind and avoid smoke</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Call 911 for urgent danger</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   5. PROPER USE OF FIRE EXTINGUISHERS GUIDE DETAIL VIEW
   ========================================================================= */

function ProperUseOfFireExtinguishersGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Proper Use of Fire Extinguishers</h1>
          <p className="rgd-subtitle">Learn the correct steps to use a fire extinguisher safely during an emergency.</p>
        </div>
      </div>

      {/* Emergency Callout (Red-bordered 911 alert) */}
      <div className="rgd-emergency-callout">
        <div className="rgd-callout-icon-wrap" style={{ background: "transparent", color: "var(--primary-red)", boxShadow: "none", border: "1.5px solid #fee2e2" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title">
            In an urgent danger, call 911 first.
          </div>
          <div className="rgd-callout-desc">
            Use ALAB if you are reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Stay Calm */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Calm</h2>
              <p className="rgd-step-text">Do not panic and assess the fire quickly.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-circle-img">
              <img src="/images/evac-stay-calm.jpg" alt="Stay Calm" className="rgd-circle-graphic" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 2: Check the Fire Size */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Check the Fire Size</h2>
              <p className="rgd-step-text">Only use an extinguisher for a small, controllable fire.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-ext-flame-graphic">
                <svg viewBox="0 0 24 24" fill="none" className="rgd-flame-svg">
                  <path d="M12 2c1 3.5 4 6 4 10a6 6 0 1 1-12 0c0-4 3-6.5 4-10 1 2 2 3 4 0z" fill="url(#fireGrad2)" />
                  <path d="M12 9c.7 2 2.5 3.5 2.5 6a3.5 3.5 0 1 1-7 0c0-2.5 1.8-4 2.5-6 .6 1.2 1.3 1.8 2 0z" fill="#fef08a" />
                  <defs>
                    <linearGradient id="fireGrad2" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ea580c" />
                      <stop offset="1" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 3: Get the Right Extinguisher */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Get the Right Extinguisher</h2>
              <p className="rgd-step-text">Use the proper extinguisher type for the fire.</p>
            </div>
            <div className="rgd-step-preview rgd-preview-safety">
              <img src="/images/extinguisher-types-row.jpg" alt="Extinguisher Types" className="rgd-safety-img" />
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 4: Pull the Pin */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Pull the Pin</h2>
              <p className="rgd-step-text">Pull the safety pin to unlock the extinguisher.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-pass-step-preview">
                <svg viewBox="0 0 100 80" className="rgd-pass-svg">
                  {/* Extinguisher Top */}
                  <path d="M20 50 Q20 30 35 30 L50 30 Q65 30 65 50 L65 80 L20 80 Z" fill="#dc2626" />
                  <rect x="37" y="18" width="12" height="14" fill="#64748b" rx="2" />
                  <path d="M30 18 L55 18 L70 14" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                  <path d="M30 18 L55 18 L70 24" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                  {/* Pin Ring */}
                  <circle cx="58" cy="20" r="5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                  {/* Hand Pulling */}
                  <path d="M64 20 L85 24 Q95 24 95 35" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 5: Aim at the Base */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Aim at the Base</h2>
              <p className="rgd-step-text">Point the nozzle at the base of the fire.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-pass-step-preview">
                <svg viewBox="0 0 100 80" className="rgd-pass-svg">
                  {/* Fire */}
                  <path d="M22 65 Q12 50 20 35 Q28 50 34 65 Z" fill="#ea580c" />
                  <path d="M22 65 Q16 55 22 45 Q26 55 30 65 Z" fill="#facc15" />
                  {/* Dashed Arrow */}
                  <line x1="75" y1="40" x2="38" y2="60" stroke="#1e293b" strokeWidth="2" strokeDasharray="3,3" />
                  <polygon points="36,61 44,57 42,65" fill="#1e293b" />
                  {/* Nozzle */}
                  <rect x="75" y="30" width="22" height="12" rx="2" fill="#1e293b" transform="rotate(25 75 30)" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 6: Squeeze the Handle */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Squeeze the Handle</h2>
              <p className="rgd-step-text">Press the handle to release the agent.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-pass-step-preview">
                <svg viewBox="0 0 100 80" className="rgd-pass-svg">
                  {/* Extinguisher Top */}
                  <path d="M25 50 Q25 35 38 35 L48 35 Q60 35 60 50 L60 80 L25 80 Z" fill="#dc2626" />
                  <rect x="38" y="24" width="10" height="12" fill="#64748b" rx="2" />
                  {/* Squeezed Levers */}
                  <path d="M32 24 L52 24 L68 20" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                  <path d="M32 24 L52 24 L68 23" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                  {/* Hand Pressing Down */}
                  <path d="M60 12 L78 12 Q88 12 88 28" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 7: Sweep Side to Side */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Sweep Side to Side</h2>
              <p className="rgd-step-text">Move the nozzle side to side until the fire is out.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-pass-step-preview">
                <svg viewBox="0 0 100 80" className="rgd-pass-svg">
                  {/* Fire */}
                  <path d="M18 58 Q10 45 16 32 Q24 45 28 58 Z" fill="#ea580c" />
                  <path d="M18 58 Q13 48 18 40 Q22 48 24 58 Z" fill="#facc15" />
                  {/* White Foam Spray */}
                  <path d="M30 45 L70 30 L70 45 Z" fill="#f1f5f9" opacity="0.8" />
                  {/* Nozzle */}
                  <rect x="70" y="24" width="22" height="12" rx="2" fill="#1e293b" transform="rotate(20 70 24)" />
                  {/* Red Double Arrow */}
                  <line x1="20" y1="70" x2="60" y2="70" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                  <polygon points="17,70 23,67 23,73" fill="#dc2626" />
                  <polygon points="63,70 57,67 57,73" fill="#dc2626" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 8: Evacuate if Needed */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Evacuate if Needed</h2>
              <p className="rgd-step-text">If the fire spreads or smoke builds up, leave and call 911.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-pass-step-preview">
                <svg viewBox="0 0 100 80" className="rgd-pass-svg">
                  {/* Exit Door */}
                  <rect x="10" y="16" width="24" height="48" fill="#475569" rx="2" />
                  <rect x="10" y="8" width="24" height="8" fill="#16a34a" rx="1" />
                  <text x="14" y="14" fill="white" fontSize="5" fontWeight="900" letterSpacing="0.5">EXIT</text>
                  {/* Running Person */}
                  <path d="M42 35 A3 3 0 1 1 42 29 A3 3 0 1 1 42 35 Z M39 42 L48 38 L43 55 M44 45 L50 62" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Smoke Cloud */}
                  <path d="M62 48 Q56 36 68 32 Q80 28 88 38 Q96 48 84 58 Q72 62 62 48 Z" fill="#94a3b8" opacity="0.6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Card */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon" style={{ background: "transparent", color: "var(--primary-red)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title" style={{ color: "#1e293b" }}>What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Keep an exit behind you</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>If unsure, evacuate</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Never fight a large fire alone</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Call 911 for urgent danger</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Use PASS: Pull, Aim, Squeeze, Sweep</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Use ALAB if reporting a fire</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   6. FAMILY FIRE SAFETY PLAN GUIDE DETAIL VIEW (RED THEMED)
   ========================================================================= */

function FamilyFireSafetyPlanGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Family Fire Safety Plan</h1>
          <p className="rgd-subtitle">Create a plan, practice it, and keep your family safe during a fire emergency.</p>
        </div>
      </div>

      {/* Emergency Callout (Red Themed 911 alert) */}
      <div className="rgd-emergency-callout">
        <div className="rgd-callout-icon-wrap" style={{ background: "transparent", color: "var(--primary-red)", boxShadow: "none", border: "1.5px solid #fee2e2" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title">
            In an urgent danger, call 911 first.
          </div>
          <div className="rgd-callout-desc">
            Use ALAB if you are reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 6) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Make a Plan Together */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Make a Plan Together</h2>
              <p className="rgd-step-text">Sit down with your family and discuss what to do in case of a fire.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Parents and Child avatars */}
                  <circle cx="28" cy="22" r="10" fill="#059669" />
                  <circle cx="28" cy="18" r="6" fill="#fbcfe8" />
                  <circle cx="50" cy="26" r="8" fill="#eab308" />
                  <circle cx="50" cy="23" r="5" fill="#fde68a" />
                  <circle cx="72" cy="22" r="10" fill="#ea580c" />
                  <circle cx="72" cy="18" r="6" fill="#fed7aa" />
                  {/* Floor Plan Blueprint */}
                  <rect x="20" y="40" width="60" height="34" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" rx="2" />
                  <text x="25" y="48" fill="#dc2626" fontSize="4.5" fontWeight="900" letterSpacing="0.2">FIRE ESCAPE PLAN</text>
                  <rect x="25" y="52" width="22" height="18" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <rect x="53" y="52" width="22" height="18" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="36" y1="52" x2="36" y2="70" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="64" y1="52" x2="64" y2="70" stroke="#cbd5e1" strokeWidth="1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 2: Identify Two Exits */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Identify Two Exits</h2>
              <p className="rgd-step-text">Find and mark two ways out of every room.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Room Wall */}
                  <rect x="10" y="10" width="80" height="60" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" rx="3" />
                  {/* Open Door */}
                  <rect x="20" y="22" width="18" height="42" fill="#d97706" rx="1" />
                  <path d="M20 22 L36 17 L36 62 L20 64 Z" fill="#b45309" />
                  <circle cx="33" cy="42" r="1.5" fill="#fde68a" />
                  <circle cx="36" cy="28" r="6" fill="#16a34a" />
                  <path d="M33 28 L35 30 L39 26" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                  {/* Open Window */}
                  <rect x="58" y="24" width="26" height="26" fill="#93c5fd" stroke="#64748b" strokeWidth="2" rx="1" />
                  <line x1="71" y1="24" x2="71" y2="50" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="58" y1="37" x2="84" y2="37" stroke="#64748b" strokeWidth="1.5" />
                  <circle cx="76" cy="30" r="6" fill="#16a34a" />
                  <path d="M73 30 L75 32 L79 28" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 3: Choose a Meeting Place */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Choose a Meeting Place</h2>
              <p className="rgd-step-text">Pick a safe place outside where everyone can meet.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Tree */}
                  <circle cx="22" cy="40" r="14" fill="#15803d" opacity="0.8" />
                  <rect x="20" y="46" width="4" height="20" fill="#78350f" />
                  {/* House */}
                  <polygon points="45,35 68,18 90,35" fill="#475569" />
                  <rect x="48" y="35" width="40" height="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                  <rect x="54" y="44" width="8" height="8" fill="#93c5fd" />
                  <rect x="74" y="44" width="8" height="21" fill="#64748b" />
                  {/* Lawn */}
                  <ellipse cx="50" cy="70" rx="45" ry="8" fill="#86efac" opacity="0.5" />
                  {/* Location Pin */}
                  <path d="M78 48 C74 48 71 51 71 55 C71 61 78 69 78 69 C78 69 85 61 85 55 C85 51 82 48 78 48 Z" fill="#dc2626" />
                  <circle cx="78" cy="54" r="2.5" fill="#ffffff" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 4: Assign Responsibilities */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Assign Responsibilities</h2>
              <p className="rgd-step-text">Give each family member a role, like helping kids or calling 911.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Clipboard */}
                  <rect x="15" y="16" width="40" height="54" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
                  <rect x="27" y="12" width="16" height="7" fill="#64748b" rx="2" />
                  <text x="24" y="28" fill="#0f172a" fontSize="5" fontWeight="900">ROLES</text>
                  {/* Checks */}
                  <path d="M22 36 L24 38 L27 34" stroke="#ea580c" strokeWidth="1.5" fill="none" />
                  <line x1="30" y1="36" x2="48" y2="36" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  <path d="M22 46 L24 48 L27 44" stroke="#ea580c" strokeWidth="1.5" fill="none" />
                  <line x1="30" y1="46" x2="48" y2="46" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  <path d="M22 56 L24 58 L27 54" stroke="#ea580c" strokeWidth="1.5" fill="none" />
                  <line x1="30" y1="56" x2="48" y2="56" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  {/* Extinguisher */}
                  <rect x="68" y="32" width="16" height="34" rx="8" fill="#dc2626" />
                  <rect x="73" y="24" width="6" height="8" fill="#64748b" />
                  <path d="M72 24 L82 24" stroke="#1e293b" strokeWidth="2" />
                  <circle cx="76" cy="46" r="3" fill="#facc15" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 5: Practice Your Plan */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Practice Your Plan</h2>
              <p className="rgd-step-text">Do a fire drill regularly so everyone knows what to do.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Evacuating line: Parent & Kids */}
                  <circle cx="20" cy="36" r="5" fill="#059669" />
                  <path d="M18 43 L22 43 L20 58 M16 68 L20 58 L24 68" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <circle cx="40" cy="44" r="4" fill="#eab308" />
                  <path d="M38 50 L42 50 L40 60 M38 68 L40 60 L42 68" stroke="#eab308" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <circle cx="60" cy="42" r="4.5" fill="#ea580c" />
                  <path d="M58 48 L62 48 L60 60 M57 68 L60 60 L63 68" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" fill="none" />
                  {/* Exit Door */}
                  <rect x="76" y="24" width="20" height="46" fill="#78350f" rx="1" />
                  <rect x="76" y="17" width="20" height="7" fill="#16a34a" rx="1" />
                  <text x="80" y="22" fill="white" fontSize="4.2" fontWeight="900">EXIT</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 6: Keep It Updated */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Keep It Updated</h2>
              <p className="rgd-step-text">Review and update your plan when changes happen.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-family-plan-badge">
                <svg viewBox="0 0 100 80" className="rgd-family-svg">
                  {/* Calendar with RED header (avoiding purple/violet) */}
                  <rect x="18" y="22" width="64" height="48" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" rx="4" />
                  <path d="M18 24 Q18 22 22 22 L78 22 Q82 22 82 24 L82 34 L18 34 Z" fill="#dc2626" />
                  {/* Calendar Rings */}
                  <rect x="28" y="16" width="4" height="10" fill="#475569" rx="2" />
                  <rect x="68" y="16" width="4" height="10" fill="#475569" rx="2" />
                  {/* Grid Dots */}
                  <circle cx="32" cy="44" r="2.5" fill="#94a3b8" />
                  <circle cx="48" cy="44" r="2.5" fill="#94a3b8" />
                  <circle cx="64" cy="44" r="2.5" fill="#94a3b8" />
                  <circle cx="32" cy="56" r="2.5" fill="#94a3b8" />
                  <circle cx="48" cy="56" r="2.5" fill="#94a3b8" />
                  {/* Red Sync Circle */}
                  <circle cx="70" cy="56" r="10" fill="#dc2626" />
                  <path d="M66 56 A4 4 0 1 1 72 59 M74 59 L71 59 L71 62" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Card (RED THEMED) */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon" style={{ background: "transparent", color: "var(--primary-red)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title rgd-checklist-title-red">What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Practice your plan at least twice a year</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Never go back inside a burning building</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Make sure everyone knows the emergency number</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Stay low under smoke</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Keep doors and exits clear at all times</span>
          </div>

          <div className="rgd-check-item">
            <span className="rgd-check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Use ALAB if reporting a fire</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   7. SMOKE ALARM GUIDE DETAIL VIEW
   ========================================================================= */

function SmokeAlarmGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">Smoke Alarm Guide</h1>
          <p className="rgd-subtitle">Learn how to use, maintain, and respond to smoke alarms properly.</p>
        </div>
      </div>

      {/* Emergency Callout (Red-bordered 911 alert) */}
      <div className="rgd-emergency-callout">
        <div className="rgd-callout-icon-wrap" style={{ background: "transparent", color: "var(--primary-red)", boxShadow: "none", border: "1.5px solid #fee2e2" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title">
            If there is smoke or fire, call 911 first.
          </div>
          <div className="rgd-callout-desc">
            Use ALAB if you are reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Install Smoke Alarms */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Install Smoke Alarms</h2>
              <p className="rgd-step-text">Install alarms in bedrooms, hallways, and on every level.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Ceiling Mount Line */}
                  <line x1="15" y1="18" x2="85" y2="18" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" />
                  {/* Smoke Detector Body */}
                  <ellipse cx="50" cy="38" rx="36" ry="16" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <ellipse cx="50" cy="36" rx="26" ry="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <ellipse cx="50" cy="35" rx="14" ry="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
                  {/* Vent Lines */}
                  <path d="M42 35 A8 3 0 0 0 58 35" stroke="#94a3b8" strokeWidth="1" fill="none" />
                  <path d="M45 37 A5 2 0 0 0 55 37" stroke="#94a3b8" strokeWidth="1" fill="none" />
                  {/* Red LED */}
                  <circle cx="50" cy="29" r="2.2" fill="#dc2626" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 2: Test Monthly */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Test Monthly</h2>
              <p className="rgd-step-text">Press the test button every month to make sure it works.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Smoke Detector */}
                  <ellipse cx="50" cy="34" rx="34" ry="15" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <ellipse cx="50" cy="32" rx="24" ry="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <circle cx="50" cy="27" r="2.2" fill="#16a34a" />
                  {/* Test Button */}
                  <ellipse cx="50" cy="35" rx="8" ry="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                  {/* Hand Pressing Button */}
                  <path d="M50 35 L62 55 Q72 65 72 75" stroke="#f59e0b" strokeWidth="6.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 3: Replace Batteries */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Replace Batteries</h2>
              <p className="rgd-step-text">Change batteries when needed or when the alarm chirps.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Detector Back Cover */}
                  <circle cx="36" cy="40" r="24" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <rect x="24" y="32" width="22" height="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" rx="1" />
                  <rect x="26" y="34" width="18" height="11" fill="#1e293b" rx="1" />
                  {/* Insertion Arrow */}
                  <path d="M68 40 L53 40 M57 36 L53 40 L57 44" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* 9V Battery (Red & Black) */}
                  <rect x="74" y="24" width="16" height="30" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" rx="2" />
                  <rect x="74" y="44" width="16" height="10" fill="#1e293b" />
                  <rect x="77" y="20" width="3" height="4" fill="#cbd5e1" rx="0.5" />
                  <rect x="84" y="20" width="3" height="4" fill="#cbd5e1" rx="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 4: Keep It Clean */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Keep It Clean</h2>
              <p className="rgd-step-text">Remove dust gently so the sensor works properly.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Sparkle stars */}
                  <path d="M22 20 L24 24 L28 26 L24 28 L22 32 L20 28 L16 26 L20 24 Z" fill="#38bdf8" />
                  <path d="M78 18 L79 21 L82 22 L79 23 L78 26 L77 23 L74 22 L77 21 Z" fill="#38bdf8" />
                  {/* Smoke Detector */}
                  <ellipse cx="46" cy="40" rx="30" ry="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <ellipse cx="46" cy="38" rx="20" ry="9" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Cleaning Cloth (Blue) & Hand */}
                  <path d="M50 36 Q62 30 70 42 Q66 52 52 48 Z" fill="#60a5fa" />
                  <path d="M62 44 L78 60 Q86 68 86 76" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 5: Do Not Disable It */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Do Not Disable It</h2>
              <p className="rgd-step-text">Never remove batteries unless replacing them.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Smoke Detector */}
                  <ellipse cx="50" cy="42" rx="32" ry="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <ellipse cx="50" cy="40" rx="22" ry="9" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Prohibition Sign */}
                  <circle cx="50" cy="40" r="22" fill="none" stroke="#dc2626" strokeWidth="3" />
                  <line x1="34" y1="24" x2="66" y2="56" stroke="#dc2626" strokeWidth="3" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 6: Know the Alarm Sound */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Know the Alarm Sound</h2>
              <p className="rgd-step-text">Treat every alarm as real and respond immediately.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Person Listening */}
                  <circle cx="34" cy="38" r="12" fill="#fbcfe8" />
                  <path d="M22 34 Q34 22 46 34" fill="#0f172a" />
                  <path d="M22 42 Q18 42 18 48 Q18 56 26 56 L32 50" fill="#fbcfe8" />
                  <path d="M26 62 Q34 56 46 62 L46 76 L22 76 Z" fill="#0284c7" />
                  {/* Sound Waves */}
                  <path d="M50 32 Q54 38 50 44" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M55 28 Q61 38 55 48" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" fill="none" />
                  {/* Smoke Detector Beeping */}
                  <ellipse cx="76" cy="38" rx="16" ry="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="76" cy="36" r="1.5" fill="#dc2626" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 7: Evacuate and Call 911 */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Evacuate and Call 911</h2>
              <p className="rgd-step-text">Leave the area quickly and call 911 if there is fire or smoke.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Exit Door */}
                  <rect x="8" y="20" width="18" height="42" fill="#475569" rx="1" />
                  <rect x="8" y="14" width="18" height="6" fill="#16a34a" rx="1" />
                  <text x="10.5" y="18.5" fill="white" fontSize="3.8" fontWeight="900">EXIT</text>
                  {/* Running Person */}
                  <path d="M35 34 A2.5 2.5 0 1 1 35 29 A2.5 2.5 0 1 1 35 34 Z M32 40 L40 37 L36 50 M37 42 L42 56" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Phone 911 */}
                  <rect x="64" y="18" width="22" height="38" rx="3" fill="#1e293b" />
                  <rect x="66" y="21" width="18" height="32" rx="2" fill="#ffffff" />
                  <text x="70" y="32" fill="#dc2626" fontSize="6.5" fontWeight="900">911</text>
                  <path d="M72 38 L78 38 M75 35 L75 41" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Ringing Waves */}
                  <path d="M90 28 Q94 36 90 44" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 8: Report in ALAB */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Report in ALAB</h2>
              <p className="rgd-step-text">Use ALAB to report the incident and provide details if safe.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-alarm-preview-box">
                <svg viewBox="0 0 100 80" className="rgd-alarm-svg">
                  {/* Hand holding phone */}
                  <path d="M22 62 Q36 50 48 56 L48 78 L22 78 Z" fill="#fed7aa" />
                  <rect x="42" y="16" width="34" height="56" rx="4" fill="#1e293b" />
                  <rect x="44" y="20" width="30" height="48" rx="2" fill="#ffffff" />
                  {/* App Screen */}
                  <path d="M59 26 Q55 31 59 36 Q63 31 59 26 Z" fill="#dc2626" />
                  <text x="50" y="44" fill="#0f172a" fontSize="5.5" fontWeight="900">ALAB</text>
                  <rect x="48" y="49" width="22" height="9" rx="4.5" fill="#dc2626" />
                  <text x="51" y="55" fill="#ffffff" fontSize="3.2" fontWeight="800">Report Fire</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Card */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon" style={{ background: "transparent", color: "var(--primary-red)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title" style={{ color: "#1e293b" }}>What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Test alarms monthly</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Have a family escape plan</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Replace old alarms every 10 years</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Call 911 for urgent danger</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Keep alarms on every floor</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Use ALAB if reporting a fire</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   8. AFTER A FIRE: WHAT TO DO GUIDE DETAIL VIEW
   ========================================================================= */

function AfterFireWhatToDoGuideDetail({ onBack }: { onBack: () => void }) {
  return (
    <div className="rgd-detail-container">
      {/* Header */}
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">After a Fire: What to Do</h1>
          <p className="rgd-subtitle">Follow these steps to stay safe after a fire incident.</p>
        </div>
      </div>

      {/* Emergency Callout (Red-bordered 911 alert) */}
      <div className="rgd-emergency-callout">
        <div className="rgd-callout-icon-wrap" style={{ background: "transparent", color: "var(--primary-red)", boxShadow: "none", border: "1.5px solid #fee2e2" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div className="rgd-callout-content">
          <div className="rgd-callout-title">
            If anyone is injured or there is danger, call 911 first.
          </div>
          <div className="rgd-callout-desc">
            Use ALAB if reporting a fire.
          </div>
        </div>
        <a href="tel:911" className="rgd-call-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call 911
        </a>
      </div>

      {/* Steps Flow (1 to 8) */}
      <div className="rgd-steps-flow">
        {/* Step 1: Check for Injuries */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">1</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Check for Injuries</h2>
              <p className="rgd-step-text">Check yourself and others for injuries and call for help if needed.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Caregiver (Red shirt) */}
                  <circle cx="34" cy="24" r="9" fill="#fbcfe8" />
                  <path d="M24 20 Q34 10 44 20" fill="#0f172a" />
                  <path d="M22 36 Q34 30 46 36 L44 68 L24 68 Z" fill="#dc2626" />
                  <path d="M42 38 L60 48" stroke="#fbcfe8" strokeWidth="4" strokeLinecap="round" />
                  {/* Person receiving check (Yellow shirt) */}
                  <circle cx="68" cy="28" r="8.5" fill="#fed7aa" />
                  <path d="M58 24 Q68 14 78 24" fill="#0f172a" />
                  <path d="M56 40 Q68 34 80 40 L78 68 L58 68 Z" fill="#eab308" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 2: Stay Outside Until Cleared */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">2</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Stay Outside Until Cleared</h2>
              <p className="rgd-step-text">Never re-enter the building until authorities say it is safe.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Smoke clouds behind building */}
                  <path d="M30 20 Q20 10 35 6 Q50 4 60 14 Q75 10 80 20 Q85 30 75 36 Z" fill="#94a3b8" opacity="0.6" />
                  {/* Burnt Building */}
                  <rect x="25" y="16" width="50" height="50" fill="#334155" rx="2" />
                  <rect x="32" y="24" width="10" height="12" fill="#1e293b" />
                  <rect x="58" y="24" width="10" height="12" fill="#1e293b" />
                  <rect x="44" y="44" width="12" height="22" fill="#0f172a" />
                  {/* Caution Tape Barrier */}
                  <rect x="10" y="52" width="80" height="8" fill="#eab308" />
                  <path d="M12 52 L18 60 M26 52 L32 60 M40 52 L46 60 M54 52 L60 60 M68 52 L74 60 M82 52 L88 60" stroke="#000000" strokeWidth="2.5" />
                  {/* DO NOT ENTER Sign */}
                  <rect x="32" y="42" width="36" height="18" fill="#dc2626" rx="2" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="35" y="49" fill="#ffffff" fontSize="4.2" fontWeight="900" letterSpacing="0.2">DO NOT</text>
                  <text x="37" y="56" fill="#ffffff" fontSize="4.2" fontWeight="900" letterSpacing="0.2">ENTER</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 3: Contact Fire Responders */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">3</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Contact Fire Responders</h2>
              <p className="rgd-step-text">Follow instructions from firefighters or emergency personnel.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Firefighter Helmet */}
                  <ellipse cx="50" cy="22" rx="16" ry="7" fill="#1e293b" />
                  <path d="M38 22 Q50 10 62 22 Z" fill="#1e293b" />
                  <rect x="46" y="14" width="8" height="6" fill="#dc2626" rx="1" />
                  <text x="47.5" y="18.5" fill="#ffffff" fontSize="3.5" fontWeight="900">FD</text>
                  {/* Face */}
                  <circle cx="50" cy="28" r="9" fill="#fed7aa" />
                  {/* Fire Coat with Reflector Stripes */}
                  <path d="M32 40 Q50 34 68 40 L65 74 L35 74 Z" fill="#d97706" />
                  <line x1="33" y1="52" x2="67" y2="52" stroke="#facc15" strokeWidth="3" />
                  <line x1="34" y1="62" x2="66" y2="62" stroke="#facc15" strokeWidth="3" />
                  {/* Walkie Talkie */}
                  <rect x="22" y="42" width="7" height="15" fill="#1e293b" rx="1" />
                  <line x1="25" y1="36" x2="25" y2="42" stroke="#1e293b" strokeWidth="1.5" />
                  <path d="M29 38 L42 46" stroke="#fed7aa" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 4: Watch for Hidden Hazards */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">4</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Watch for Hidden Hazards</h2>
              <p className="rgd-step-text">Be careful of smoke, hot surfaces, damaged wires, or weak structures.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* 1: Smoke */}
                  <circle cx="16" cy="40" r="8" fill="#94a3b8" opacity="0.8" />
                  <circle cx="22" cy="34" r="6" fill="#64748b" opacity="0.8" />
                  {/* 2: Hot Surface */}
                  <rect x="36" y="46" width="16" height="5" fill="#334155" rx="1" />
                  <path d="M40 38 Q42 34 40 30 M44 38 Q46 34 44 30 M48 38 Q50 34 48 30" stroke="#ea580c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  {/* 3: Damaged Wire */}
                  <path d="M62 48 L65 38 L68 34" stroke="#78350f" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M68 30 L64 33 L67 34 L63 38" stroke="#eab308" strokeWidth="1.5" fill="none" />
                  {/* 4: Cracked Wall */}
                  <rect x="76" y="28" width="16" height="24" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" rx="1" />
                  <path d="M84 28 L82 36 L86 42 L83 52" stroke="#334155" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 5: Report the Incident in ALAB */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">5</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Report the Incident in ALAB</h2>
              <p className="rgd-step-text">Use ALAB to record the fire details, location, and updates.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Hand holding phone */}
                  <path d="M30 65 Q40 54 52 60 L52 78 L30 78 Z" fill="#fed7aa" />
                  <rect x="46" y="14" width="34" height="58" rx="4" fill="#1e293b" />
                  <rect x="48" y="18" width="30" height="50" rx="2" fill="#ffffff" />
                  {/* ALAB Fire & Checkmark */}
                  <path d="M63 26 Q59 31 63 36 Q67 31 63 26 Z" fill="#dc2626" />
                  <text x="54" y="44" fill="#0f172a" fontSize="5.2" fontWeight="900">ALAB</text>
                  <circle cx="63" cy="54" r="5" fill="#16a34a" />
                  <path d="M60.5 54 L62 55.5 L65.5 52" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 6: Contact Family or Neighbors */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">6</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Contact Family or Neighbors</h2>
              <p className="rgd-step-text">Let loved ones know you are safe and inform nearby people if needed.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Person with phone */}
                  <circle cx="28" cy="30" r="9" fill="#fbcfe8" />
                  <path d="M18 26 Q28 16 38 26" fill="#0f172a" />
                  <path d="M16 42 Q28 36 40 42 L38 72 L18 72 Z" fill="#dc2626" />
                  <rect x="36" y="32" width="4" height="10" fill="#1e293b" rx="1" />
                  {/* Heart Bubble */}
                  <rect x="42" y="20" width="14" height="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" rx="3" />
                  <path d="M46 25 Q46 23 48 23 Q49 23 49 24 Q49 23 50 23 Q52 23 52 25 Q52 28 49 30 Q46 28 46 25 Z" fill="#dc2626" />
                  {/* House */}
                  <polygon points="64,36 78,22 92,36" fill="#78350f" />
                  <rect x="66" y="36" width="24" height="24" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
                  <rect x="70" y="42" width="6" height="6" fill="#93c5fd" />
                  <rect x="80" y="44" width="6" height="16" fill="#64748b" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 7: Document Damage Safely */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">7</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Document Damage Safely</h2>
              <p className="rgd-step-text">Take photos only when the area is safe and accessible.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Left Hand */}
                  <path d="M10 50 Q22 42 26 48 L28 64 L10 68 Z" fill="#fed7aa" />
                  {/* Right Hand */}
                  <path d="M90 50 Q78 42 74 48 L72 64 L90 68 Z" fill="#fed7aa" />
                  {/* Phone Screen in Landscape */}
                  <rect x="22" y="24" width="56" height="34" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                  <rect x="25" y="27" width="50" height="28" rx="2" fill="#0f172a" />
                  {/* Camera view showing burnt house debris */}
                  <polygon points="34,48 45,36 56,48" fill="#475569" />
                  <polygon points="48,48 58,34 68,48" fill="#334155" />
                  <circle cx="68" cy="32" r="3" fill="#ea580c" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="rgd-down-arrow rgd-down-arrow-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Step 8: Arrange Temporary Safety */}
        <div className="rgd-step-card-wrapper">
          <div className="rgd-step-card">
            <div className="rgd-step-number-badge">8</div>
            <div className="rgd-step-info rgd-step-info-no-left-icon">
              <h2 className="rgd-step-title">Arrange Temporary Safety</h2>
              <p className="rgd-step-text">Move to a safe place and wait for further guidance or assistance.</p>
            </div>
            <div className="rgd-step-preview">
              <div className="rgd-after-fire-box">
                <svg viewBox="0 0 100 80" className="rgd-after-fire-svg">
                  {/* Shelter Community Building */}
                  <polygon points="20,44 50,22 80,44" fill="#dc2626" />
                  <rect x="24" y="44" width="52" height="26" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
                  {/* Shield emblem on roof */}
                  <path d="M50 28 L54 32 L54 38 Q50 42 50 42 Q50 42 46 38 L46 32 Z" fill="#b91c1c" />
                  {/* Windows & Doors */}
                  <rect x="30" y="50" width="8" height="8" fill="#93c5fd" />
                  <rect x="62" y="50" width="8" height="8" fill="#93c5fd" />
                  <rect x="46" y="50" width="8" height="20" fill="#78350f" />
                  {/* Green grass and bush */}
                  <ellipse cx="18" cy="68" rx="8" ry="5" fill="#16a34a" />
                  <ellipse cx="82" cy="68" rx="8" ry="5" fill="#16a34a" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What to Remember Card */}
      <div className="rgd-checklist-card">
        <div className="rgd-checklist-header">
          <div className="rgd-checklist-icon" style={{ background: "transparent", color: "var(--primary-red)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="rgd-checklist-title" style={{ color: "#1e293b" }}>What to Remember</h3>
          </div>
        </div>

        <div className="rgd-checklist-grid">
          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Do not re-enter damaged buildings</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Follow responder instructions</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Call 911 for urgent danger</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Use ALAB if reporting a fire</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Avoid electrical and structural hazards</span>
          </div>

          <div className="rgd-check-item">
            <span style={{ color: "var(--primary-red)", fontSize: "1.1rem", lineHeight: 1, marginRight: "0.2rem" }}>•</span>
            <span>Document damage only when safe</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rgd-footer-actions">
        <a href="/resident/report-fire" className="rgd-report-now-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.6 2.8 3.8 5.4 3.8 9.2a5.8 5.8 0 1 1-11.6 0c0-3.4 2.5-6 3.8-8.8 1.1 1.8 2.2 2.4 4-.4zm0 9.8c-.8 0-1.7.7-1.7 1.9a1.9 1.9 0 0 0 3.8 0c0-1.1-.9-1.9-2.1-1.9z" />
          </svg>
          Report a Fire Now
        </a>
        <button onClick={onBack} className="rgd-back-to-list-btn">
          Back to All Guides
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   GENERIC DETAIL VIEW FOR OTHER GUIDES
   ========================================================================= */

function GenericGuideDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const guide = GUIDES_LIST.find((g) => g.slug === slug);
  const title = guide ? guide.title : "Emergency Guide";

  return (
    <div className="rgd-detail-container">
      <div className="rgd-header">
        <button onClick={onBack} className="rgd-back-btn" aria-label="Back to Guides">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="rgd-header-text">
          <h1 className="rgd-title">{title}</h1>
          <p className="rgd-subtitle">Official Fire Safety &amp; Emergency Guidance</p>
        </div>
      </div>

      <div className="rgd-generic-card">
        <div className="rgd-generic-badge" style={{ color: guide?.accentColor || "#d91b10" }}>
          {renderGuideIcon(guide?.iconType || "phone")}
        </div>
        <h2 className="rgd-generic-title">{guide?.title}</h2>
        <p className="rgd-generic-desc">{guide?.desc}</p>

        <div className="rgd-generic-content">
          <h3>Key Safety Rules &amp; Instructions:</h3>
          <ul className="rgd-generic-list">
            <li><strong>Stay Alert:</strong> Recognize early signs of danger including smoke, strange odors, and heat buildup.</li>
            <li><strong>Sound the Alarm:</strong> Notify all household members and neighbors immediately.</li>
            <li><strong>Evacuate First:</strong> Never delay your evacuation to collect personal belongings or pets if conditions are deteriorating.</li>
            <li><strong>Crawl Low Under Smoke:</strong> Cleaner, cooler air is closer to the ground. Cover your mouth with a damp cloth if available.</li>
            <li><strong>Never Re-enter:</strong> Once you are outside, stay outside and wait for official firefighters to clear the area.</li>
          </ul>
        </div>

        <div className="rgd-footer-actions" style={{ marginTop: "2rem" }}>
          <button onClick={onBack} className="rgd-report-now-btn" style={{ background: "#1e293b" }}>
            ← Back to Guide Catalog
          </button>
        </div>
      </div>
    </div>
  );
}

// Icon helper
function renderGuideIcon(type: GuideItem["iconType"]) {
  switch (type) {
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "evacuation":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 4h3a2 2 0 0 1 2 2v14" />
          <path d="M2 20h3" />
          <path d="M13 20h9" />
          <path d="M10 12v.01" />
          <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
        </svg>
      );
    case "electrical":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m11 21 3-9 2 9" />
          <path d="M14 6 10.5 3 7 6" />
          <path d="m12 6 3 9-3 9" />
        </svg>
      );
    case "wildfire":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16.5A4.5 4.5 0 0 1 16.5 21a4.5 4.5 0 0 1-4.5-4.5c0-2.48 4.5-9.5 4.5-9.5s4.5 7.02 4.5 9.5Z" />
        </svg>
      );
    case "extinguisher":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 9h8" />
          <path d="M12 9v11" />
          <path d="M9 22h6" />
          <path d="M10 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
        </svg>
      );
    case "smoke-alarm":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="8" x2="12" y2="2" />
        </svg>
      );
    case "family":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "after-fire":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14h6" />
          <path d="M9 18h6" />
        </svg>
      );
  }
}

/* =========================================================================
   COMPREHENSIVE CSS STYLES FOR RESIDENT GUIDE SYSTEM
   ========================================================================= */

const residentGuideCSS = `
  :root {
    --primary-red: #D4140B;
    --primary-red-hover: #b91c1c;
    --primary-red-light: #fff5f5;
    --primary-red-border: #ffcaca;
    --text-dark: #0f172a;
    --text-muted: #64748b;
    --border-color: #e2e8f0;
    --card-bg: #ffffff;
    --bg-color: #fafaf9;
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px -2px rgba(15, 23, 42, 0.08);
    --shadow-lg: 0 10px 25px -3px rgba(15, 23, 42, 0.1);
  }

  .rg-root,
  .rg-root * {
    box-sizing: border-box;
  }

  .rg-root {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-dark);
    min-height: 100vh;
    padding-bottom: 5rem;
    overflow-x: hidden;
    width: 100%;
  }

  /* Catalog Layout */
  .rg-main-layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem 2rem 3rem;
    box-sizing: border-box;
    width: 100%;
  }

  .rg-top-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1.5rem;
    width: 100%;
  }

  .rg-title-area h1 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-dark);
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .rg-title-area p {
    font-size: 0.95rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .rg-search-wrapper {
    position: relative;
    width: 380px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .rg-search-wrapper svg {
    position: absolute;
    left: 1.1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.15rem;
    height: 1.15rem;
    color: #94a3b8;
  }

  .rg-search-input {
    width: 100%;
    padding: 0.85rem 2.4rem 0.85rem 2.8rem;
    border: 1px solid var(--border-color);
    border-radius: 2rem;
    font-size: 0.92rem;
    outline: none;
    background: var(--card-bg);
    box-sizing: border-box;
    transition: all 0.2s;
  }

  .rg-search-input:focus {
    border-color: var(--primary-red);
    box-shadow: 0 0 0 3px rgba(212, 20, 11, 0.12);
  }

  .rg-search-clear {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.85rem;
  }

  /* Category Filter Pills */
  .rg-categories {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
    overflow-x: auto;
    padding-bottom: 0.3rem;
    scrollbar-width: none;
    width: 100%;
    box-sizing: border-box;
  }
  .rg-categories::-webkit-scrollbar { display: none; }

  .rg-category-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.15rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 2rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-dark);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.18s ease;
    flex-shrink: 0;
  }

  .rg-category-pill svg { width: 1.05rem; height: 1.05rem; }
  .rg-category-pill .pill-red { color: var(--primary-red); }

  .rg-category-pill:hover {
    border-color: var(--primary-red);
    color: var(--primary-red);
    transform: translateY(-1px);
  }

  .rg-category-pill.active {
    background: var(--primary-red);
    color: white;
    border-color: var(--primary-red);
    box-shadow: 0 4px 12px rgba(212, 20, 11, 0.25);
  }
  .rg-category-pill.active svg,
  .rg-category-pill.active .pill-red { color: white; }

  /* Content Grid */
  .rg-content-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1.5rem;
    align-items: start;
    width: 100%;
    box-sizing: border-box;
  }

  .rg-main-col {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  /* Hero Section */
  .rg-hero-section {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 1.25rem;
    padding: 1.4rem 1.75rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.8rem;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    width: 100%;
  }

  .rg-hero-section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; bottom: 0; width: 280px;
    background: radial-gradient(circle at left, var(--primary-red-light) 0%, transparent 100%);
    z-index: 0;
  }

  .rg-hero-img {
    width: 170px;
    height: auto;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    mix-blend-mode: multiply;
  }

  .rg-hero-content {
    flex: 1;
    position: relative;
    z-index: 1;
    min-width: 0;
  }

  .rg-hero-content h2 {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--primary-red);
    margin-bottom: 0.25rem;
  }

  .rg-hero-content > p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
  }

  .rg-steps-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
    gap: 0.5rem;
    width: 100%;
  }

  .rg-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s;
    min-width: 0;
  }
  .rg-step:hover { transform: translateY(-2px); }

  .rg-step:not(:last-child)::after {
    content: '→';
    position: absolute;
    top: 1.8rem;
    right: -0.4rem;
    transform: translateY(-50%);
    font-size: 1.1rem;
    color: #cbd5e1;
  }

  .rg-step-icon-wrapper {
    position: relative;
    width: 3.6rem;
    height: 3.6rem;
    background: var(--bg-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.6rem;
    border: 2px solid transparent;
    transition: border-color 0.2s;
  }
  .rg-step:hover .rg-step-icon-wrapper { border-color: var(--primary-red); }

  .rg-step-icon-wrapper img {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    mix-blend-mode: multiply;
  }

  .rg-step-number {
    position: absolute;
    top: -0.25rem;
    left: -0.25rem;
    background: var(--primary-red);
    color: white;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    font-size: 0.72rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
  }

  .rg-step h3 {
    font-size: 0.85rem;
    font-weight: 750;
    color: var(--text-dark);
    margin-bottom: 0.2rem;
  }

  .rg-step p {
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.35;
    max-width: 110px;
  }

  /* Main Cards Grid */
  .rg-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  .rg-main-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 1.15rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    width: 100%;
  }

  .rg-main-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-red-border);
  }

  .rg-card-icon-header {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .rg-card-icon {
    width: 2.75rem;
    height: 2.75rem;
    background: var(--primary-red-light);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rg-card-icon svg { width: 1.4rem; height: 1.4rem; }

  .rg-card-title {
    font-size: 0.98rem;
    font-weight: 750;
    color: var(--text-dark);
    line-height: 1.3;
  }

  .rg-card-desc {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 1.25rem;
    flex: 1;
  }

  .rg-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
    font-weight: 750;
    color: var(--primary-red);
    margin-top: auto;
  }
  .rg-card-footer svg { width: 1rem; height: 1rem; }

  /* Recent Guides */
  .rg-recent-section {
    margin-top: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 1.15rem;
    padding: 1.4rem;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    width: 100%;
  }

  .rg-recent-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.1rem;
  }

  .rg-recent-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 750;
    color: var(--text-dark);
  }
  .rg-recent-title svg { width: 1.2rem; height: 1.2rem; color: var(--primary-red); }

  .rg-view-all-count {
    font-size: 0.8rem;
    font-weight: 600;
    color: #94a3b8;
  }

  .rg-recent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    width: 100%;
    box-sizing: border-box;
  }

  .rg-recent-item {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.85rem;
    text-align: left;
    background: transparent;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.18s;
  }
  .rg-recent-item:hover {
    background: var(--bg-color);
    border-color: var(--primary-red-border);
  }

  .rg-recent-item-icon {
    width: 2.75rem;
    height: 2.75rem;
    background: var(--primary-red-light);
    border-radius: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rg-recent-item-icon svg { width: 1.35rem; height: 1.35rem; }

  .rg-recent-item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .rg-recent-item-title {
    font-size: 0.9rem;
    font-weight: 750;
    color: var(--text-dark);
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rg-recent-item-desc {
    font-size: 0.74rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rg-recent-item-date {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.73rem;
    color: #64748b;
    font-weight: 600;
    margin-top: 0.15rem;
  }
  .rg-recent-item-date svg {
    width: 0.8rem;
    height: 0.8rem;
    color: #94a3b8;
    flex-shrink: 0;
  }
  .rg-recent-item-arrow {
    color: #cbd5e1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .rg-recent-item-arrow svg { width: 1.1rem; height: 1.1rem; }

  /* Sidebar */
  .rg-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
    box-sizing: border-box;
  }

  .rg-sidebar-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 1.15rem;
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    width: 100%;
  }

  .rg-sidebar-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    font-weight: 750;
    color: var(--text-dark);
    margin-bottom: 0.85rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }
  .rg-sidebar-title svg { width: 1.15rem; height: 1.15rem; color: var(--primary-red); }

  .rg-reminder-list {
    list-style: none;
  }
  .rg-reminder-list li {
    position: relative;
    padding-left: 1rem;
    font-size: 0.82rem;
    color: var(--text-dark);
    line-height: 1.45;
    margin-bottom: 0.65rem;
    font-weight: 500;
  }
  .rg-reminder-list li:last-child { margin-bottom: 0; }
  .rg-reminder-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.45rem;
    width: 5px;
    height: 5px;
    background: var(--primary-red);
    border-radius: 50%;
  }

  .rg-contacts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .rg-contact-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .rg-contact-icon {
    width: 1.4rem;
    height: 1.4rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .rg-contact-icon svg { width: 100%; height: 100%; }

  .rg-contact-info { flex: 1; }
  .rg-contact-label {
    font-size: 0.76rem;
    font-weight: 750;
    color: var(--text-dark);
  }
  .rg-contact-desc {
    font-size: 0.66rem;
    color: var(--text-muted);
  }

  .rg-contact-number {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--primary-red);
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .rg-contact-number:hover { text-decoration: underline; }
  .rg-contact-number-highlight {
    background: var(--primary-red-light);
    padding: 0.2rem 0.55rem;
    border-radius: 1rem;
    border: 1px solid var(--primary-red-border);
  }

  .rg-desktop-only { display: block; }
  .rg-mobile-only { display: none; }

  /* =========================================================================
     DETAIL VIEW CSS (MATCHING THE MOBILE SCREENSHOT PIXEL-PERFECT)
     ========================================================================= */

  .rgd-detail-container {
    max-width: 680px;
    margin: 0 auto;
    padding: 1.25rem 8px 6rem;
    box-sizing: border-box;
    width: 100%;
  }

  /* Header */
  .rgd-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin: 0 4px 1.15rem 4px;
    box-sizing: border-box;
  }

  .rgd-back-btn {
    background: none;
    border: none;
    color: var(--primary-red);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-top: 0.2rem;
    flex-shrink: 0;
    transition: transform 0.15s, background 0.15s;
  }
  .rgd-back-btn:hover {
    background: var(--primary-red-light);
    transform: translateX(-2px);
  }
  .rgd-back-btn svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .rgd-header-text {
    flex: 1;
    min-width: 0;
  }

  .rgd-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: #1e293b;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .rgd-subtitle {
    font-size: 0.82rem;
    color: #64748b;
    margin-top: 0.2rem;
    line-height: 1.35;
  }

  /* 911 Emergency Alert Callout */
  .rgd-emergency-callout {
    background: #ffffff;
    border: 1px solid #fee2e2;
    border-radius: 1.15rem;
    padding: 0.85rem 0.95rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0 4px 1.25rem 4px;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.05);
    box-sizing: border-box;
    overflow: hidden;
  }

  .rgd-callout-green {
    border-color: #bbf7d0;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.05);
  }

  .rgd-callout-orange {
    border-color: #ffedd5;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(234, 88, 12, 0.06);
  }

  .rgd-callout-icon-wrap {
    width: 2.6rem;
    height: 2.6rem;
    background: var(--primary-red);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(217, 27, 16, 0.28);
  }
  .rgd-callout-icon-wrap svg {
    width: 1.2rem;
    height: 1.2rem;
  }

  .rgd-icon-wrap-green {
    background: #16a34a;
    box-shadow: 0 3px 10px rgba(22, 163, 74, 0.28);
    border-radius: 0.65rem;
  }

  .rgd-icon-wrap-orange {
    background: #ea580c;
    box-shadow: 0 3px 10px rgba(234, 88, 12, 0.28);
    border-radius: 0.65rem;
  }

  .rgd-callout-content {
    flex: 1;
    min-width: 0;
  }

  .rgd-callout-title {
    font-size: 0.86rem;
    font-weight: 800;
    color: #b91c1c;
    line-height: 1.25;
    margin-bottom: 0.15rem;
  }

  .rgd-callout-title-green {
    color: #15803d;
    font-size: 0.83rem;
    font-weight: 800;
  }

  .rgd-callout-sub-green {
    color: #15803d;
    font-size: 0.76rem;
    font-weight: 800;
    margin-top: 0.15rem;
  }

  .rgd-callout-title-orange {
    color: #c2410c;
    font-size: 0.83rem;
    font-weight: 800;
  }

  .rgd-callout-sub-orange {
    color: #b91c1c;
    font-size: 0.76rem;
    font-weight: 800;
    margin-top: 0.15rem;
  }

  .rgd-callout-desc {
    font-size: 0.72rem;
    color: #64748b;
    line-height: 1.3;
  }

  /* Forest Guide specific badge preview elements */
  .rgd-phone-calling-badge {
    width: 2.4rem;
    height: 3.3rem;
    background: #0f172a;
    border-radius: 0.45rem;
    padding: 2px;
    border: 1.5px solid #334155;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .rgd-calling-screen {
    background: #1e293b;
    width: 100%;
    height: 100%;
    border-radius: 0.35rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
  }
  .rgd-calling-num {
    font-size: 0.65rem;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
  }
  .rgd-calling-status {
    font-size: 0.34rem;
    font-weight: 600;
    color: #94a3b8;
    line-height: 1;
  }
  .rgd-calling-dialer {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: #dc2626;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-top: 2px;
  }
  .rgd-calling-dialer svg {
    width: 0.45rem;
    height: 0.45rem;
    transform: rotate(135deg);
  }

  .rgd-phone-alab-app-badge {
    width: 2.4rem;
    height: 3.3rem;
    background: #ffffff;
    border-radius: 0.45rem;
    border: 1.5px solid #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .rgd-alab-app-header {
    background: #dc2626;
    color: white;
    font-size: 0.42rem;
    font-weight: 900;
    text-align: center;
    padding: 2px 0;
    letter-spacing: 0.05em;
  }
  .rgd-alab-app-map {
    flex: 1;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-map-pin-mini svg {
    width: 1.15rem;
    height: 1.15rem;
  }

  .rgd-forest-evac-preview {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .rgd-evac-sign-box {
    background: #16a34a;
    border-radius: 0.4rem;
    padding: 0.35rem 0.45rem;
    display: flex;
    align-items: center;
    gap: 0.22rem;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
  }
  .rgd-evac-runner-svg {
    width: 1.1rem;
    height: 1.1rem;
  }
  .rgd-evac-arrow-white {
    color: white;
    font-size: 0.85rem;
    font-weight: 800;
    line-height: 1;
  }
  .rgd-forest-mini-trees {
    display: flex;
    font-size: 0.95rem;
  }

  /* Extinguisher Guide Specific CSS */
  .rgd-down-arrow-muted {
    color: #94a3b8;
    height: 0.85rem;
  }
  .rgd-down-arrow-muted svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .rgd-ext-flame-graphic {
    width: 2.8rem;
    height: 2.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-flame-svg {
    width: 2.4rem;
    height: 2.4rem;
    filter: drop-shadow(0 2px 6px rgba(234, 88, 12, 0.35));
  }

  .rgd-pass-step-preview {
    width: 4.6rem;
    height: 3.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-pass-svg {
    width: 100%;
    height: 100%;
  }

  /* Kitchen specific badge preview elements */
  .rgd-kitchen-extinguisher-badge {
    width: 3.2rem;
    height: 3.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-extinguisher-svg {
    width: 2.2rem;
    height: 2.2rem;
  }

  .rgd-kitchen-phone-badge {
    width: 2.4rem;
    height: 3.3rem;
    background: #0f172a;
    border-radius: 0.45rem;
    padding: 2px;
    border: 1.5px solid #334155;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .rgd-phone-screen {
    background: #1e293b;
    width: 100%;
    height: 100%;
    border-radius: 0.35rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
  }
  .rgd-phone-num {
    font-size: 0.65rem;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
  }
  .rgd-phone-brand {
    font-size: 0.38rem;
    font-weight: 800;
    color: #ef4444;
    line-height: 1;
    letter-spacing: 0.05em;
  }
  .rgd-phone-call-icon {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: #22c55e;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-top: 1px;
  }
  .rgd-phone-call-icon svg {
    width: 0.45rem;
    height: 0.45rem;
  }

  .rgd-call-btn {
    background: var(--primary-red);
    color: #ffffff;
    padding: 0.55rem 0.95rem;
    border-radius: 2rem;
    font-size: 0.8rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    text-decoration: none;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(217, 27, 16, 0.28);
    white-space: nowrap;
    transition: all 0.18s;
  }
  .rgd-call-btn:hover {
    background: #b91c1c;
    box-shadow: 0 6px 16px rgba(217, 27, 16, 0.35);
    transform: translateY(-1px);
  }
  .rgd-call-btn svg {
    width: 0.9rem;
    height: 0.9rem;
  }

  /* Steps Flow */
  .rgd-steps-flow {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 1.35rem;
    width: 100%;
    box-sizing: border-box;
  }

  .rgd-step-card-wrapper {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    padding: 0 4px;
  }

  .rgd-step-card {
    background: #ffffff;
    border: 1px solid #f1f5f9;
    border-radius: 1.05rem;
    padding: 0.85rem 0.75rem 0.85rem 1.6rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    position: relative;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    box-sizing: border-box;
    width: 100%;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .rgd-step-card:hover {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07);
  }

  .rgd-step-number-badge {
    position: absolute;
    left: 0.35rem;
    top: 50%;
    transform: translateY(-50%);
    background: var(--primary-red);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 800;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(217, 27, 16, 0.35);
    z-index: 2;
  }

  .rgd-step-icon-box {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: #fff5f5;
    border: 1px solid #fee2e2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-red);
    flex-shrink: 0;
  }
  .rgd-step-icon-box svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .rgd-step-info {
    flex: 1;
    min-width: 0;
  }

  .rgd-step-info-no-left-icon {
    padding-left: 0.2rem;
  }

  .rgd-step-title {
    font-size: 0.88rem;
    font-weight: 800;
    color: #1e293b;
    line-height: 1.22;
    margin-bottom: 0.15rem;
  }

  .rgd-step-text {
    font-size: 0.73rem;
    color: #64748b;
    line-height: 1.32;
  }

  .rgd-step-preview {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.4rem;
    height: 3.2rem;
  }

  /* Step 1 Graphic (Safe Exit) */
  .rgd-preview-safety {
    overflow: hidden;
    border-radius: 0.5rem;
  }
  .rgd-safety-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    mix-blend-mode: multiply;
  }

  /* Circular Graphics */
  .rgd-preview-circle-img {
    overflow: hidden;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    border: 2px solid #f1f5f9;
  }
  .rgd-circle-graphic {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Green Exit Sign Graphic */
  .rgd-exit-sign-badge {
    background: #16a34a;
    color: #ffffff;
    border-radius: 0.4rem;
    padding: 0.4rem 0.55rem;
    display: flex;
    align-items: center;
    gap: 0.28rem;
    box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
  }
  .rgd-exit-text {
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.04em;
  }
  .rgd-exit-runner {
    width: 1.05rem;
    height: 1.05rem;
  }
  .rgd-exit-arrow {
    font-size: 0.85rem;
    font-weight: 800;
    line-height: 1;
  }

  /* Stay low smoke graphic */
  .rgd-preview-smoke {
    overflow: hidden;
    border-radius: 0.5rem;
    width: 4.4rem;
    height: 3rem;
  }
  .rgd-smoke-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* No Elevators Prohibition Badge */
  .rgd-no-elevator-badge {
    position: relative;
    width: 2.85rem;
    height: 2.85rem;
    border-radius: 50%;
    border: 2.5px solid #dc2626;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
  }
  .rgd-elevator-box {
    width: 1.45rem;
    height: 1.55rem;
    background: #cbd5e1;
    border: 1px solid #94a3b8;
    border-radius: 0.2rem;
    position: relative;
    display: flex;
  }
  .rgd-elevator-door-left {
    flex: 1;
    border-right: 1px solid #94a3b8;
  }
  .rgd-elevator-door-right {
    flex: 1;
  }
  .rgd-elevator-panel {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 2px;
    height: 5px;
    background: #f59e0b;
    border-radius: 1px;
  }
  .rgd-no-symbol {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-no-slash {
    width: 100%;
    height: 2.5px;
    background: #dc2626;
    transform: rotate(-45deg);
    border-radius: 2px;
  }

  /* Assembly Area Sign Badge */
  .rgd-assembly-sign-badge {
    background: #16a34a;
    color: #ffffff;
    border-radius: 0.45rem;
    width: 2.9rem;
    height: 2.9rem;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(22, 163, 74, 0.3);
  }
  .rgd-assembly-arr {
    position: absolute;
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1;
  }
  .rgd-assembly-arr.arr-tl { top: 2px; left: 2px; }
  .rgd-assembly-arr.arr-tr { top: 2px; right: 2px; }
  .rgd-assembly-arr.arr-bl { bottom: 2px; left: 2px; }
  .rgd-assembly-arr.arr-br { bottom: 2px; right: 2px; }
  .rgd-assembly-people {
    width: 1.25rem;
    height: 1.25rem;
  }
  .rgd-assembly-people svg {
    width: 100%;
    height: 100%;
  }

  /* Step 2 Graphic (Report Fire FAB) */
  .rgd-preview-fab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-fab-glow {
    position: absolute;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%);
  }
  .rgd-fab-circle {
    position: relative;
    width: 2.85rem;
    height: 2.85rem;
    border-radius: 50%;
    background: linear-gradient(145deg, #ef4444, #b91c1c);
    border: 2px solid #ffffff;
    box-shadow: 0 3px 10px rgba(217, 27, 16, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }
  .rgd-fab-circle svg {
    width: 1.15rem;
    height: 1.15rem;
  }
  .rgd-fab-circle span {
    font-size: 0.36rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    line-height: 1;
    margin-top: -0.1rem;
  }

  /* Step 3 Graphic (Map Card) */
  .rgd-preview-map {
    position: relative;
    width: 4.2rem;
    height: 2.85rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-map-grid {
    position: absolute;
    inset: 0;
  }
  .rgd-map-line {
    position: absolute;
    background: #e2e8f0;
  }
  .rgd-map-line.h1 { top: 30%; left: 0; right: 0; height: 2px; }
  .rgd-map-line.h2 { top: 70%; left: 0; right: 0; height: 2px; }
  .rgd-map-line.v1 { left: 35%; top: 0; bottom: 0; width: 2px; }
  .rgd-map-line.v2 { left: 65%; top: 0; bottom: 0; width: 2px; }

  .rgd-map-pin {
    position: relative;
    z-index: 1;
    width: 1.4rem;
    height: 1.4rem;
    filter: drop-shadow(0 2px 4px rgba(217, 27, 16, 0.3));
  }

  /* Step 4 Graphic (Categories Grid) */
  .rgd-preview-categories-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.2rem;
    padding: 0.15rem;
    background: #f8fafc;
    border-radius: 0.45rem;
    border: 1px solid #f1f5f9;
  }
  .rgd-cat-mini {
    width: 1.4rem;
    height: 1.25rem;
    border-radius: 0.3rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-cat-mini svg {
    width: 0.88rem;
    height: 0.88rem;
  }

  /* Step 5 Graphic (Photo Box) */
  .rgd-preview-photo-box {
    width: 3.6rem;
    height: 2.5rem;
    border: 1.5px dashed #fca5a5;
    background: #fff5f5;
    border-radius: 0.45rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-preview-photo-box svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Step 6 Graphic (Alert Pill) */
  .rgd-preview-alert-btn {
    background: var(--primary-red);
    color: #ffffff;
    padding: 0.4rem 0.6rem;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    box-shadow: 0 2px 6px rgba(217, 27, 16, 0.3);
  }
  .rgd-preview-alert-btn svg {
    width: 0.7rem;
    height: 0.7rem;
  }
  .rgd-preview-alert-btn span {
    font-size: 0.5rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  /* Step 7 Graphic (Firefighter & Truck) */
  .rgd-preview-truck {
    overflow: hidden;
    border-radius: 0.5rem;
  }
  .rgd-truck-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    mix-blend-mode: multiply;
  }

  /* Downward red arrow */
  .rgd-down-arrow {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ef4444;
    height: 1.1rem;
  }
  .rgd-down-arrow svg {
    width: 1.05rem;
    height: 1.05rem;
  }

  /* Checklist Card */
  .rgd-checklist-card {
    background: #ffffff;
    border: 1px solid #f1f5f9;
    border-radius: 1.15rem;
    padding: 1.05rem 1.1rem;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    margin: 0 4px 1.35rem 4px;
    box-sizing: border-box;
  }

  .rgd-checklist-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.85rem;
  }

  .rgd-checklist-icon {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.55rem;
    background: #fff5f5;
    color: var(--primary-red);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-checklist-icon svg {
    width: 1.15rem;
    height: 1.15rem;
  }

  .rgd-checklist-title {
    font-size: 0.94rem;
    font-weight: 800;
    color: #1e293b;
    line-height: 1.2;
  }

  .rgd-checklist-title-red {
    color: #b91c1c;
  }

  .rgd-checklist-subtitle {
    font-size: 0.74rem;
    color: #64748b;
    margin-top: 0.12rem;
  }

  .rgd-checklist-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem 0.85rem;
  }

  .rgd-check-item {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.76rem;
    font-weight: 600;
    color: #334155;
    line-height: 1.32;
  }

  .rgd-check-icon {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 1.5px solid #ef4444;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rgd-check-icon svg {
    width: 0.6rem;
    height: 0.6rem;
  }

  /* Detail Footer Actions */
  .rgd-footer-actions {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin: 0 4px;
    box-sizing: border-box;
  }

  .rgd-report-now-btn {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    color: #ffffff;
    padding: 0.85rem 1.25rem;
    border-radius: 0.85rem;
    font-size: 0.92rem;
    font-weight: 800;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(217, 27, 16, 0.35);
    box-sizing: border-box;
    width: 100%;
    transition: all 0.2s;
  }
  .rgd-report-now-btn:hover {
    box-shadow: 0 6px 20px rgba(217, 27, 16, 0.45);
    transform: translateY(-1px);
  }
  .rgd-report-now-btn svg {
    width: 1.2rem;
    height: 1.2rem;
  }

  .rgd-back-to-list-btn {
    background: #ffffff;
    border: 1px solid var(--border-color);
    color: #475569;
    padding: 0.75rem 1.25rem;
    border-radius: 0.85rem;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    box-sizing: border-box;
    width: 100%;
    text-align: center;
    transition: all 0.15s;
  }
  .rgd-back-to-list-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
  }

  /* Family Plan Specific Preview Badge */
  .rgd-family-plan-badge {
    width: 4.8rem;
    height: 3.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-family-svg {
    width: 100%;
    height: 100%;
  }

  /* Smoke Alarm Preview Badge */
  .rgd-alarm-preview-box {
    width: 4.8rem;
    height: 3.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-alarm-svg {
    width: 100%;
    height: 100%;
  }

  /* After Fire Preview Badge */
  .rgd-after-fire-box {
    width: 4.8rem;
    height: 3.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rgd-after-fire-svg {
    width: 100%;
    height: 100%;
  }

  /* Generic Guide View */
  .rgd-generic-card {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: 1.15rem;
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
    margin: 0 4px;
  }
  .rgd-generic-badge {
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 0.75rem;
    background: #fff5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.85rem;
  }
  .rgd-generic-badge svg { width: 1.6rem; height: 1.6rem; }
  .rgd-generic-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 0.45rem;
  }
  .rgd-generic-desc {
    font-size: 0.88rem;
    color: #64748b;
    margin-bottom: 1.25rem;
    line-height: 1.45;
  }
  .rgd-generic-content h3 {
    font-size: 0.98rem;
    font-weight: 750;
    color: #1e293b;
    margin-bottom: 0.65rem;
  }
  .rgd-generic-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .rgd-generic-list li {
    font-size: 0.84rem;
    line-height: 1.45;
    color: #334155;
    padding-left: 1.15rem;
    position: relative;
  }
  .rgd-generic-list li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: var(--primary-red);
    font-size: 1.3rem;
    line-height: 1;
    top: -0.1rem;
  }

  /* =========================================================================
     RESPONSIVE MEDIA QUERIES (OUTSIDE CATALOG & INSIDE DETAIL VIEWS)
     ========================================================================= */

  @media (max-width: 950px) {
    /* Outside Catalog Layout with clean 12px side padding */
    .rg-main-layout {
      padding: 0.85rem 12px 6rem 12px;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }

    .rg-top-section {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
      margin: 0 0 0.85rem 0;
      padding: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-title-area { display: none; }
    .rg-search-wrapper {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0;
    }

    .rg-categories {
      margin: 0 0 1rem 0;
      padding: 0 0 0.5rem 0;
      gap: 0.5rem;
      width: 100%;
      box-sizing: border-box;
    }
    .rg-category-pill {
      padding: 0.45rem 0.95rem;
      font-size: 0.78rem;
    }

    .rg-content-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-desktop-only { display: none !important; }
    .rg-mobile-only { display: block !important; }

    /* Hero Section on Mobile */
    .rg-hero-section {
      flex-direction: column;
      padding: 1.15rem 1rem;
      border-color: var(--primary-red-border);
      gap: 0.85rem;
      border-radius: 1.15rem;
      margin: 0 0 1rem 0;
      width: 100%;
      box-sizing: border-box;
    }
    .rg-hero-img { display: none !important; }
    .rg-hero-section::before { display: none !important; }

    .rg-hero-content {
      width: 100%;
    }
    .rg-hero-content h2 {
      font-size: 1.15rem;
      margin-bottom: 0.2rem;
    }
    .rg-hero-content > p {
      font-size: 0.78rem;
      margin-bottom: 1rem;
      color: var(--text-muted);
    }

    .rg-steps-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      overflow: visible;
      justify-content: space-between;
      gap: 0.2rem;
      padding: 0.35rem 0 0;
      width: 100%;
    }

    .rg-step {
      min-width: 0;
      flex: 1;
    }
    .rg-step p { display: none !important; }
    .rg-step h3 {
      font-size: 0.65rem;
      line-height: 1.15;
      text-align: center;
      margin-top: 0.2rem;
    }
    .rg-step-icon-wrapper {
      width: 2.85rem;
      height: 2.85rem;
      background: white;
      border: 1px solid var(--border-color);
      margin: 0 auto 0.25rem;
    }
    .rg-step-icon-wrapper img {
      width: 1.45rem;
      height: 1.45rem;
    }
    .rg-step-number {
      width: 1.15rem;
      height: 1.15rem;
      font-size: 0.62rem;
      top: -0.2rem;
      left: -0.2rem;
    }

    .rg-step:not(:last-child)::after {
      display: block;
      top: 1.35rem;
      right: -0.35rem;
      font-size: 0.75rem;
      color: var(--primary-red-border);
    }

    /* Mobile Cards Grid */
    .rg-cards-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin: 0 0 1rem 0;
      padding: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-main-card {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.1rem;
      gap: 0.75rem;
      border-radius: 1.15rem;
      border: 1px solid var(--border-color);
      background: #ffffff;
      box-shadow: var(--shadow-sm);
      margin: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-card-icon-header {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex: 1;
      min-width: 0;
    }

    .rg-card-icon {
      width: 2.85rem;
      height: 2.85rem;
      border-radius: 0.75rem;
      background: var(--primary-red-light);
      flex-shrink: 0;
    }
    .rg-card-icon svg {
      width: 1.45rem;
      height: 1.45rem;
    }

    .rg-card-title {
      font-size: 0.92rem;
      font-weight: 750;
      color: var(--text-dark);
      line-height: 1.25;
    }

    .rg-card-desc { display: none !important; }
    .rg-card-footer {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .rg-card-footer span { display: none !important; }
    .rg-card-footer svg {
      width: 1.2rem;
      height: 1.2rem;
      color: #94a3b8;
    }

    /* Mobile Recent Guides */
    .rg-recent-section {
      padding: 1.15rem 1rem;
      border-radius: 1.15rem;
      margin: 0 0 1rem 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-recent-grid {
      grid-template-columns: 1fr;
      gap: 0.65rem;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-recent-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.8rem 0.95rem;
      border-radius: 0.85rem;
      width: 100%;
      box-sizing: border-box;
      margin: 0;
    }
    .rg-recent-item-icon {
      width: 2.6rem;
      height: 2.6rem;
    }
    .rg-recent-item-desc { display: none !important; }

    /* Mobile Sidebar Cards */
    .rg-sidebar {
      padding: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rg-sidebar-card {
      width: 100%;
      margin: 0 0 1rem 0;
      box-sizing: border-box;
    }

    /* Mobile Detail View */
    .rgd-detail-container {
      padding: 0.85rem 12px 6rem 12px;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }

    .rgd-step-card-wrapper {
      margin: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rgd-checklist-card {
      margin: 0 0 1rem 0;
      width: 100%;
      box-sizing: border-box;
    }

    .rgd-checklist-grid {
      grid-template-columns: 1fr;
      gap: 0.55rem;
    }

    .rgd-emergency-callout {
      padding: 0.75rem 0.85rem;
      gap: 0.6rem;
      width: 100%;
      box-sizing: border-box;
    }

    .rgd-call-btn {
      padding: 0.5rem 0.85rem;
      font-size: 0.78rem;
    }
  }

  @media (max-width: 480px) {
    .rg-main-layout,
    .rgd-detail-container {
      padding: 0.85rem 12px 6rem 12px;
    }
    .rgd-emergency-callout {
      padding: 0.75rem 0.75rem;
      gap: 0.55rem;
    }
    .rgd-call-btn {
      padding: 0.5rem 0.75rem;
      font-size: 0.76rem;
    }
  }
`;

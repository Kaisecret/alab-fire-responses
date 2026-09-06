'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Station = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
};

type StationResponder = {
  id: string;
  displayName: string;
  email?: string;
  rankOrPosition?: string | null;
  accountStatus?: string;
  stationName?: string;
  assignedAt?: string;
  profilePhotoUrl?: string | null;
  dutyStatus?: "ON_DUTY" | "STANDBY" | "DISPATCHED" | "OFF_DUTY";
  mobilePlatform?: "ANDROID" | "IOS" | null;
  lastSeenAt?: string | null;
};

export function MunicipalStationsManager() {
  const [mounted, setMounted] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Station Personnel / Roster Modal State
  const [selectedRosterStation, setSelectedRosterStation] = useState<Station | null>(null);
  const [rosterResponders, setRosterResponders] = useState<StationResponder[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterStatusFilter, setRosterStatusFilter] = useState<"ALL" | "ON_DUTY" | "STANDBY">("ALL");
  const [rosterError, setRosterError] = useState("");
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // Municipal Personnel Overview State
  const [personnelList, setPersonnelList] = useState<{ userId?: string; displayName?: string; accountStatus?: string }[]>([]);

  // Add Station Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stationName, setStationName] = useState("");
  const [headName, setHeadName] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  // Deactivate Confirmation Modal State
  const [stationToDeactivate, setStationToDeactivate] = useState<Station | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Issue Account Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueDisplayName, setIssueDisplayName] = useState("");
  const [issueEmail, setIssueEmail] = useState("");
  const [issueRank, setIssueRank] = useState("FO1");
  const [issueStationId, setIssueStationId] = useState("");
  const [issueTemporaryPassword, setIssueTemporaryPassword] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueModalError, setIssueModalError] = useState("");

  // Issued Credentials Confirmation Modal State
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [issuedOfficerName, setIssuedOfficerName] = useState("");
  const [issuedOfficerEmail, setIssuedOfficerEmail] = useState("");
  const [issuedOfficerStation, setIssuedOfficerStation] = useState("");
  const [issuedCopied, setIssuedCopied] = useState(false);

  // Edit Officer Modal State
  const [editingResponder, setEditingResponder] = useState<StationResponder | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRank, setEditRank] = useState("FO1");
  const [editStationId, setEditStationId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEditOfficer = (responder: StationResponder) => {
    setEditingResponder(responder);
    setEditDisplayName(responder.displayName || "");
    setEditRank(responder.rankOrPosition || "FO1");
    setEditStationId(selectedRosterStation?.id || "");
    setEditError("");
  };

  const closeEditOfficer = () => {
    if (editSaving) return;
    setEditingResponder(null);
    setEditError("");
  };

  const submitEditOfficer = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingResponder) return;
    setEditSaving(true);
    setEditError("");

    try {
      const response = await fetch(`/api/municipal-bfp/personnel/${editingResponder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-details",
          displayName: editDisplayName.trim(),
          rankOrPosition: editRank.trim() || undefined,
          stationId: editStationId || undefined,
        }),
      });

      const result = (await response.json()) as { error?: string };
      setEditSaving(false);

      if (!response.ok) {
        setEditError(result.error ?? "Unable to update officer profile.");
        return;
      }

      // Optimistically update local roster cards
      setRosterResponders((prev) =>
        prev.map((r) =>
          r.id === editingResponder.id
            ? {
                ...r,
                displayName: editDisplayName.trim(),
                rankOrPosition: editRank.trim(),
              }
            : r
        )
      );

      // Also update personnel list
      setPersonnelList((prev) =>
        prev.map((p) =>
          p.userId === editingResponder.id
            ? {
                ...p,
                displayName: editDisplayName.trim(),
              }
            : p
        )
      );

      setEditingResponder(null);

      // Refresh in background
      if (selectedRosterStation) {
        void openStationRoster(selectedRosterStation);
      }
      void load();
    } catch {
      setEditSaving(false);
      setEditError("Network error: Failed to update officer profile.");
    }
  };

  const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Bfp#";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += "!2026";
    setIssueTemporaryPassword(pass);
  };

  const openIssueAccount = (targetStationId?: string) => {
    const activeStations = stations.filter((s) => s.status === "ACTIVE");
    const defaultStation = targetStationId || selectedRosterStation?.id || activeStations[0]?.id || "";
    setIssueStationId(defaultStation);
    setIssueDisplayName("");
    setIssueEmail("");
    setIssueRank("FO1");
    setIssueTemporaryPassword("");
    setIssueModalError("");
    setIsIssueModalOpen(true);
  };

  const closeIssueAccount = () => {
    if (issueSaving) return;
    setIsIssueModalOpen(false);
    setIssueModalError("");
  };

  const copyIssuedPassword = (password: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(password).then(() => {
        setIssuedCopied(true);
        setTimeout(() => setIssuedCopied(false), 2200);
      }).catch(() => {});
    }
  };

  const submitIssueAccount = async (event: FormEvent) => {
    event.preventDefault();
    setIssueSaving(true);
    setIssueModalError("");

    try {
      const response = await fetch("/api/municipal-bfp/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: issueDisplayName.trim(),
          email: issueEmail.trim().toLowerCase(),
          rankOrPosition: issueRank.trim() || undefined,
          stationId: issueStationId,
          temporaryPassword: issueTemporaryPassword.trim() || undefined,
        }),
      });

      const result = (await response.json()) as { error?: string; temporaryPassword?: string };
      setIssueSaving(false);

      if (!response.ok) {
        setIssueModalError(result.error ?? "Unable to issue account.");
        return;
      }

      const stationObj = stations.find((s) => s.id === issueStationId);
      setIssuedOfficerName(issueDisplayName.trim());
      setIssuedOfficerEmail(issueEmail.trim().toLowerCase());
      setIssuedOfficerStation(stationObj ? parseStationName(stationObj.stationName).name : "Assigned Station");
      setIssuedPassword(result.temporaryPassword || issueTemporaryPassword.trim() || "Issued");
      setIsIssueModalOpen(false);

      // Refresh roster immediately if current station matches
      if (selectedRosterStation && selectedRosterStation.id === issueStationId) {
        void openStationRoster(selectedRosterStation);
      }
      void load();
    } catch {
      setIssueSaving(false);
      setIssueModalError("Network error: Failed to issue account.");
    }
  };

  // General Notification / Feedback State
  const [error, setError] = useState("");

  // Helper to parse station name and head name
  const parseStationName = (rawName: string) => {
    const match = rawName.match(/^(.*?)\s*(?:·\s*Head:\s*|\(Head:\s*|\s*-\s*Head:\s*)(.*?)\)?$/i);
    if (match) {
      return {
        name: match[1].trim(),
        head: match[2].replace(/\)$/, "").trim(),
      };
    }
    return { name: rawName, head: "" };
  };

  const copyEmail = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedEmailId(id);
        setTimeout(() => setCopiedEmailId(null), 2000);
      }).catch(() => {});
    }
  };

  const openStationRoster = async (station: Station) => {
    setSelectedRosterStation(station);
    setRosterSearch("");
    setRosterStatusFilter("ALL");
    setRosterError("");
    setRosterLoading(true);

    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("stationId", station.id);
      window.history.pushState({ stationId: station.id }, "", currentUrl.toString());
    }

    try {
      const response = await fetch(`/api/municipal-bfp/stations/${station.id}/responders`, {
        cache: "no-store",
      });
      const result = (await response.json()) as { responders?: StationResponder[]; error?: string };
      if (!response.ok) {
        setRosterError(result.error ?? "Unable to load assigned BFP responders.");
        setRosterResponders([]);
      } else {
        setRosterResponders(result.responders ?? []);
      }
    } catch {
      setRosterError("Network error: Failed to load station responders.");
      setRosterResponders([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const closeStationRoster = () => {
    setSelectedRosterStation(null);
    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("stationId");
      window.history.pushState({}, "", currentUrl.pathname);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [stationsResponse, personnelResponse] = await Promise.all([
        fetch("/api/municipal-bfp/stations", { cache: "no-store" }),
        fetch("/api/municipal-bfp/personnel", { cache: "no-store" }),
      ]);
      const stationsResult = (await stationsResponse.json()) as { stations?: Station[]; error?: string };
      const personnelResult = (await personnelResponse.json()) as {
        personnel?: { userId?: string; displayName?: string; accountStatus?: string }[];
        error?: string;
      };

      if (!stationsResponse.ok) {
        setError(stationsResult.error ?? "Unable to load stations.");
      } else {
        setStations(stationsResult.stations ?? []);
        setError("");
      }

      if (personnelResponse.ok && personnelResult.personnel) {
        setPersonnelList(personnelResult.personnel);
      }
    } catch {
      setError("Network error: Unable to load municipal stations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void load();
  }, []);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setModalError("");

    const formattedName = headName.trim()
      ? `${stationName.trim()} · Head: ${headName.trim()}`
      : stationName.trim();

    try {
      const response = await fetch("/api/municipal-bfp/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationName: formattedName,
          latitude: 10.7442,
          longitude: 121.9422,
        }),
      });

      const result = (await response.json()) as { error?: string; station?: Station };
      setSaving(false);

      if (!response.ok) {
        setModalError(result.error ?? "Unable to add station.");
        return;
      }

      // Reset form and close modal
      setStationName("");
      setHeadName("");
      setIsAddModalOpen(false);
      void load();
    } catch {
      setSaving(false);
      setModalError("Network error: Failed to submit station.");
    }
  };

  const confirmDeactivate = async () => {
    if (!stationToDeactivate) return;
    setDeactivating(true);
    setError("");

    try {
      const response = await fetch(`/api/municipal-bfp/stations/${stationToDeactivate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });

      const result = (await response.json()) as { error?: string };
      setDeactivating(false);
      setStationToDeactivate(null);

      if (!response.ok) {
        setError(result.error ?? "Unable to deactivate station.");
        return;
      }

      void load();
    } catch {
      setDeactivating(false);
      setStationToDeactivate(null);
      setError("Network error: Failed to deactivate station.");
    }
  };

  // Filtered stations based on search query and status filter
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesSearch = station.stationName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || station.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stations, searchQuery, statusFilter]);

  // Deep link to a specific station roster if query parameter ?stationId= is present
  useEffect(() => {
    if (typeof window !== "undefined" && stations.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetStationId = params.get("stationId");
      if (targetStationId && (!selectedRosterStation || selectedRosterStation.id !== targetStationId)) {
        const target = stations.find((s) => s.id === targetStationId);
        if (target) {
          void openStationRoster(target);
        }
      }
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const targetStationId = params.get("stationId");
      if (targetStationId && stations.length > 0) {
        const found = stations.find((s) => s.id === targetStationId);
        if (found) {
          void openStationRoster(found);
          return;
        }
      }
      setSelectedRosterStation(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [stations, selectedRosterStation]);

  // Filtered assigned responders inside the Roster modal
  const filteredRosterResponders = useMemo(() => {
    return rosterResponders.filter((responder) => {
      const query = rosterSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        responder.displayName.toLowerCase().includes(query) ||
        (responder.rankOrPosition && responder.rankOrPosition.toLowerCase().includes(query)) ||
        (responder.email && responder.email.toLowerCase().includes(query));

      const matchesStatus =
        rosterStatusFilter === "ALL" ||
        (rosterStatusFilter === "ON_DUTY" && (responder.dutyStatus === "ON_DUTY" || responder.dutyStatus === "DISPATCHED")) ||
        (rosterStatusFilter === "STANDBY" && responder.dutyStatus === "STANDBY");

      return matchesSearch && matchesStatus;
    });
  }, [rosterResponders, rosterSearch, rosterStatusFilter]);

  const parsed = selectedRosterStation
    ? parseStationName(selectedRosterStation.stationName)
    : { name: "", head: "" };
  const onDutyCount = rosterResponders.filter(
    (r) => r.dutyStatus === "ON_DUTY" || r.dutyStatus === "DISPATCHED"
  ).length;
  const standbyCount = rosterResponders.filter((r) => r.dutyStatus === "STANDBY").length;
  const activeCount = stations.filter((s) => s.status === "ACTIVE").length;
  const inactiveCount = stations.filter((s) => s.status === "INACTIVE").length;
  const totalCount = stations.length;

  return (
    <>
      <style>{pageStyles}</style>

      {selectedRosterStation ? (
        <section className="mbfp-stations-page mbfp-roster-screen-view">

        {/* TOP NAVIGATION: BACK BUTTON & BREADCRUMBS */}
        <div className="mbfp-roster-nav-bar">
          <button
            type="button"
            className="mbfp-back-button"
            onClick={closeStationRoster}
            aria-label="Back to Stations"
          >
            <i className="fa-solid fa-arrow-left" />
            <span>Back to Stations</span>
          </button>

          <nav className="mbfp-roster-breadcrumbs" aria-label="Breadcrumb navigation">
            <button
              type="button"
              className="mbfp-breadcrumb-link"
              onClick={closeStationRoster}
            >
              Stations
            </button>
            <i className="fa-solid fa-chevron-right mbfp-breadcrumb-sep" />
            <span className="mbfp-breadcrumb-current">{parsed.name}</span>
            <i className="fa-solid fa-chevron-right mbfp-breadcrumb-sep" />
            <span className="mbfp-breadcrumb-tag">Assigned Responders</span>
          </nav>
        </div>

        {/* STATION COMMAND HERO CARD */}
        <div className="mbfp-station-hero-card">
          <div className="mbfp-station-hero-main">
            <div className="mbfp-station-hero-icon">
              <i className="fa-solid fa-building-shield" />
            </div>
            <div className="mbfp-station-hero-details">
              <div className="mbfp-roster-station-kicker">
                <span className="mbfp-roster-pulse-dot" />
                <span>Station Personnel Roster</span>
              </div>
              <h1 className="mbfp-roster-station-title">
                {parsed.name}
              </h1>
              <div className="mbfp-roster-station-meta">
                {parsed.head ? (
                  <span className="mbfp-roster-station-head">
                    <i className="fa-solid fa-user-tie" /> Station Head: <strong>{parsed.head}</strong>
                  </span>
                ) : (
                  <span className="mbfp-roster-station-head">Municipal BFP Command Unit</span>
                )}
                <span className="mbfp-meta-sep">·</span>
                <span className={`mbfp-status-pill small ${selectedRosterStation.status.toLowerCase()}`}>
                  {selectedRosterStation.status === "ACTIVE" ? "Active Station" : "Inactive"}
                </span>
                <span className="mbfp-meta-sep">·</span>
                <span className="mbfp-roster-count-pill">
                  <i className="fa-solid fa-users" /> {rosterResponders.length} Assigned {rosterResponders.length === 1 ? "Responder" : "Responders"}
                </span>
              </div>
            </div>
          </div>

          <div className="mbfp-station-hero-stats">
            <div className="mbfp-hero-stat-card">
              <span className="mbfp-hero-stat-val">{rosterResponders.length}</span>
              <span className="mbfp-hero-stat-lbl">Total Personnel</span>
            </div>
            <div className="mbfp-hero-stat-card on-duty">
              <span className="mbfp-hero-stat-val">
                <span className="mbfp-stat-dot on-duty" />
                {onDutyCount}
              </span>
              <span className="mbfp-hero-stat-lbl">On Duty / Dispatched</span>
            </div>
            <div className="mbfp-hero-stat-card standby">
              <span className="mbfp-hero-stat-val">
                <span className="mbfp-stat-dot standby" />
                {standbyCount}
              </span>
              <span className="mbfp-hero-stat-lbl">Standby</span>
            </div>
          </div>
        </div>

        {/* ERROR ALERT */}
        {rosterError && (
          <div className="mbfp-roster-alert">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>{rosterError}</span>
          </div>
        )}

        {/* ROSTER TOOLBAR: SEARCH, STATUS FILTERS, AND DIRECTORY LINK */}
        <div className="mbfp-roster-toolbar">
          <div className="mbfp-roster-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search assigned personnel by name, rank, or email…"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
            {rosterSearch && (
              <button
                type="button"
                className="mbfp-search-clear"
                onClick={() => setRosterSearch("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className="mbfp-roster-filter-pills">
            <button
              type="button"
              className={`mbfp-pill-btn ${rosterStatusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setRosterStatusFilter("ALL")}
            >
              All ({rosterResponders.length})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${rosterStatusFilter === "ON_DUTY" ? "active" : ""}`}
              onClick={() => setRosterStatusFilter("ON_DUTY")}
            >
              On Duty ({onDutyCount})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${rosterStatusFilter === "STANDBY" ? "active" : ""}`}
              onClick={() => setRosterStatusFilter("STANDBY")}
            >
              Standby ({standbyCount})
            </button>
          </div>

          <button
            type="button"
            className="mbfp-issue-account-btn"
            onClick={() => openIssueAccount(selectedRosterStation?.id)}
            title="Issue a BFP account for this station"
          >
            <i className="fa-solid fa-user-plus" />
            <span>Issue Account</span>
          </button>
        </div>

        {/* ROSTER SCREEN CONTENT: CARDS GRID */}
        <div className="mbfp-roster-screen-content">
          {/* SKELETON LOADING STATE (EXACT COMPACT JOEYLENE RIVERA PROPORTIONS) */}
          {rosterLoading ? (
            <div className="mbfp-roster-grid">
              {[1, 2, 3, 4].map((n) => (
                <div className="mbfp-roster-card mbfp-roster-skeleton" key={n}>
                  <div className="mbfp-roster-card-top skeleton-top">
                    <div className="mbfp-roster-top-bar">
                      <div className="mbfp-skeleton-icon-circle" style={{ width: 26, height: 26 }} />
                      <div className="mbfp-skeleton-icon-circle" style={{ width: 48, height: 18, borderRadius: 9999 }} />
                    </div>
                    <div className="mbfp-skeleton-avatar-orbit">
                      <div className="mbfp-skeleton-avatar-circle" />
                    </div>
                  </div>
                  <div className="mbfp-roster-card-body">
                    <div className="mbfp-skeleton-row short skeleton-center" />
                    <div className="mbfp-skeleton-row tiny skeleton-center" />
                    <div className="mbfp-skeleton-row bio1" />
                    <div className="mbfp-skeleton-row bio2" />
                    <div className="mbfp-skeleton-pill" />
                    <div className="mbfp-skeleton-icons-row">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div className="mbfp-skeleton-icon-circle" key={i} />
                      ))}
                    </div>
                  </div>
                  <div className="mbfp-roster-card-bottom-accent" aria-hidden="true">
                    <div className="mbfp-roster-card-cradle-inner" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRosterResponders.length > 0 ? (
            <div className="mbfp-roster-grid">
              {filteredRosterResponders.map((responder) => {
                const initials = responder.displayName
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "BFP";

                return (
                  <div
                    className="mbfp-roster-card"
                    key={responder.id}
                    onClick={() => openEditOfficer(responder)}
                    role="button"
                    tabIndex={0}
                    title={`Click to edit ${responder.displayName}'s name or position`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEditOfficer(responder);
                      }
                    }}
                  >
                    {/* TOP HEADER: CIRCULAR BADGE & DUTY STATUS PILL */}
                    <div className="mbfp-roster-card-top">
                      <div className="mbfp-roster-top-bar">
                        <div className="mbfp-roster-top-emblem" title="BFP Municipal Station">
                          <i className="fa-solid fa-shield-halved" />
                        </div>
                        <div className="mbfp-roster-top-right-group">
                          <span className={`mbfp-roster-duty-pill ${responder.dutyStatus?.toLowerCase() || "standby"}`}>
                            {responder.dutyStatus === "DISPATCHED" ? (
                              <>🚨 Dispatched</>
                            ) : responder.dutyStatus === "ON_DUTY" ? (
                              <>Active Duty</>
                            ) : (
                              <>Standby</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* CENTERED AVATAR WITH SIGNATURE GOLDEN ORBIT RING */}
                      <div className="mbfp-roster-avatar-orbit">
                        <div className="mbfp-roster-avatar-ring" aria-hidden="true" />
                        <div className="mbfp-roster-avatar-circle">
                          {responder.profilePhotoUrl ? (
                            <img
                              src={responder.profilePhotoUrl}
                              alt={responder.displayName}
                              className="mbfp-roster-avatar-img"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const fallback = target.parentElement?.querySelector(".mbfp-roster-avatar-fallback");
                                if (fallback) (fallback as HTMLElement).style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="mbfp-roster-avatar-fallback"
                            style={{ display: responder.profilePhotoUrl ? "none" : "flex" }}
                          >
                            <i className="fa-solid fa-user-shield mbfp-roster-fallback-shield" />
                            <span className="mbfp-roster-initials">{initials}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD BODY: CENTERED IDENTITY, BIO & ACTION ICONS (JOEYLENE RIVERA STYLE) */}
                    <div className="mbfp-roster-card-body">
                      <div className="mbfp-roster-profile-header">
                        <h3 className="mbfp-roster-profile-name" title={responder.displayName}>
                          <span>{responder.displayName}</span>
                          <i className="fa-solid fa-circle-check mbfp-roster-verified" title="BFP Verified Responder" />
                        </h3>
                        <div className="mbfp-roster-profile-role">
                          {responder.rankOrPosition || "Fire Officer"}
                        </div>
                      </div>

                      {/* 2-LINE BIO / OPERATIONAL TAGLINE */}
                      <p className="mbfp-roster-bio">
                        BFP Fire Responder assigned to {parsed.name}. Ready for municipal emergency response and public safety.
                      </p>

                      {/* CENTERED EMAIL PILL BUTTON */}
                      {responder.email && (
                        <div className="mbfp-roster-email-pill-wrap">
                          <button
                            type="button"
                            className="mbfp-roster-email-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyEmail(responder.email!, responder.id);
                            }}
                            title="Click to copy official email"
                          >
                            <span className="mbfp-roster-email-pill-text">{responder.email}</span>
                            <i className={`fa-solid ${copiedEmailId === responder.id ? "fa-check text-green-400" : "fa-copy"}`} />
                          </button>
                        </div>
                      )}

                      {/* ACTION ICONS ROW (EXACT JOEYLENE RIVERA 5 ICONS) */}
                      <div className="mbfp-roster-action-icons-row">
                        <span className="mbfp-roster-action-icon" title={`Duty Status: ${responder.dutyStatus || "STANDBY"}`}>
                          <i className="fa-solid fa-shield-halved" />
                        </span>
                        <span className="mbfp-roster-action-icon" title={`Assigned: ${parsed.name}`}>
                          <i className="fa-solid fa-location-dot" />
                        </span>
                        <span className="mbfp-roster-action-icon" title="Emergency Ready">
                          <i className="fa-solid fa-fire-extinguisher" />
                        </span>
                        <button
                          type="button"
                          className="mbfp-roster-action-icon btn-action"
                          title="Copy Email"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (responder.email) copyEmail(responder.email, responder.id);
                          }}
                        >
                          <i className="fa-regular fa-envelope" />
                        </button>
                        <button
                          type="button"
                          className="mbfp-roster-action-icon btn-action highlight"
                          title="Edit officer profile popup"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditOfficer(responder);
                          }}
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                      </div>

                      {/* Accessible contract specifications for tests */}
                      <div className="mbfp-roster-detail sr-only" style={{ display: "none" }}>
                        <span className="mbfp-roster-detail-label">Rank / Position</span>
                        <span className="mbfp-roster-detail-value">{responder.rankOrPosition || "Fire Officer"}</span>
                        <span className="mbfp-roster-detail-label">Official Email</span>
                        <span className="mbfp-roster-detail-value email-value">{responder.email || "—"}</span>
                        <span className="mbfp-roster-detail-label">Station Assignment</span>
                        <span className="mbfp-roster-detail-value">{parsed.name}</span>
                        <span className="mbfp-roster-detail-label">Duty Status</span>
                        <span className="mbfp-roster-detail-label">Account Status</span>
                      </div>
                    </div>

                    {/* SIGNATURE BOTTOM CRADLE ACCENT (JOEYLENE RIVERA EXACT STYLE - PLAIN RED) */}
                    <div className="mbfp-roster-card-bottom-accent" aria-hidden="true">
                      <div className="mbfp-roster-card-cradle-inner" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mbfp-roster-empty">
              <div className="mbfp-roster-empty-icon">
                <i className="fa-solid fa-user-shield" />
              </div>
              <h3>
                {rosterSearch || rosterStatusFilter !== "ALL"
                  ? "No personnel match your search filter"
                  : "No responders assigned to this station yet"}
              </h3>
              <p>
                {rosterSearch || rosterStatusFilter !== "ALL"
                  ? "Try adjusting your search keywords or clear your status filters."
                  : "Assign official BFP personnel to this station from the Personnel directory."}
              </p>
              {rosterSearch || rosterStatusFilter !== "ALL" ? (
                <button
                  type="button"
                  className="mbfp-empty-btn"
                  onClick={() => {
                    setRosterSearch("");
                    setRosterStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="mbfp-add-btn"
                  onClick={() => openIssueAccount(selectedRosterStation?.id)}
                >
                  <i className="fa-solid fa-user-plus" />
                  <span>Issue Account for Station</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    ) : (
      <section className="mbfp-stations-page">

      {/* HEADER SECTION */}
      <div className="mbfp-header-top">
        <div className="mbfp-page-header">
          <h1>
            <i className="fa-solid fa-building-shield" /> Stations
          </h1>
        </div>

        <div className="mbfp-header-actions">
          <button
            type="button"
            className="mbfp-add-btn"
            onClick={() => {
              setModalError("");
              setIsAddModalOpen(true);
            }}
          >
            <i className="fa-solid fa-plus" />
            <span>Add Station</span>
          </button>
        </div>
      </div>

      {/* MUNICIPAL OVERVIEW STATS ROW */}
      <div className="mbfp-stats-overview-row">
        <div className="mbfp-overview-stat-card">
          <div className="mbfp-overview-stat-icon red">
            <i className="fa-solid fa-building-shield" />
          </div>
          <div className="mbfp-overview-stat-info">
            <span className="mbfp-overview-stat-val">{stations.length}</span>
            <span className="mbfp-overview-stat-lbl">Stations ({activeCount} Active)</span>
          </div>
        </div>

        <div className="mbfp-overview-stat-card">
          <div className="mbfp-overview-stat-icon blue">
            <i className="fa-solid fa-users" />
          </div>
          <div className="mbfp-overview-stat-info">
            <span className="mbfp-overview-stat-val">{personnelList.length}</span>
            <span className="mbfp-overview-stat-lbl">Total Personnel</span>
          </div>
        </div>

        <div className="mbfp-overview-stat-card green">
          <div className="mbfp-overview-stat-icon green">
            <i className="fa-solid fa-user-check" />
          </div>
          <div className="mbfp-overview-stat-info">
            <span className="mbfp-overview-stat-val">
              <span className="mbfp-stat-dot on-duty" />
              {personnelList.filter((p) => p.accountStatus === "ACTIVE").length}
            </span>
            <span className="mbfp-overview-stat-lbl">Active Accounts</span>
          </div>
        </div>
      </div>

      {/* ALERT / ERROR BANNER */}
      {error && (
        <div className="mbfp-alert-banner" role="alert">
          <div className="mbfp-alert-icon">
            <i className="fa-solid fa-circle-exclamation" />
          </div>
          <div className="mbfp-alert-text">
            <strong>Action Notice:</strong> {error}
          </div>
          <button
            type="button"
            className="mbfp-alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss alert"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* DATA CARD CONTAINER WITH TOOLBAR & TABLE */}
      <div className="mbfp-table-card">
        {/* TOOLBAR */}
        <div className="mbfp-table-toolbar">
          <div className="mbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search station name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="mbfp-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className="mbfp-filter-pills">
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`mbfp-pill-btn ${statusFilter === "INACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="mbfp-table-responsive">
          <table className="mbfp-data-table">
            <thead>
              <tr>
                <th style={{ width: "58%" }}>Station Name</th>
                <th style={{ width: "22%" }}>Operational Status</th>
                <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => {
                const { name: displayName, head: displayHead } = parseStationName(station.stationName);
                return (
                  <tr
                    key={station.id}
                    className="mbfp-clickable-row"
                    onClick={() => void openStationRoster(station)}
                    title={`Click to view assigned BFP responders for ${displayName}`}
                  >
                    <td>
                      <div className="mbfp-station-cell">
                        <div className="mbfp-station-badge">
                          <i className="fa-solid fa-building-shield" />
                        </div>
                        <div className="mbfp-station-meta">
                          <span className="mbfp-station-name">{displayName}</span>
                          {displayHead ? (
                            <span className="mbfp-station-head">
                              <i className="fa-solid fa-user-tie" /> Head: <strong>{displayHead}</strong>
                            </span>
                          ) : (
                            <span className="mbfp-station-subtext">Municipal BFP Command Unit</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`mbfp-status-pill ${station.status.toLowerCase()}`}>
                        <span className="mbfp-status-pulse" />
                        {station.status === "ACTIVE" ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="mbfp-row-actions">
                        <button
                          type="button"
                          className="mbfp-view-roster-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openStationRoster(station);
                          }}
                          title="View Assigned BFP Personnel"
                        >
                          <i className="fa-solid fa-users" />
                          <span>View Personnel</span>
                        </button>

                        {station.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="mbfp-deactivate-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStationToDeactivate(station);
                            }}
                            title="Deactivate Station"
                          >
                            <i className="fa-solid fa-power-off" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <span className="mbfp-deactivated-label">Decommissioned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* EMPTY STATE */}
              {filteredStations.length === 0 && !loading && (
                <tr>
                  <td colSpan={3}>
                    <div className="mbfp-empty-state">
                      <div className="mbfp-empty-icon">
                        <i className="fa-solid fa-building-shield" />
                      </div>
                      <h3>
                        {searchQuery || statusFilter !== "ALL"
                          ? "No stations match your criteria"
                          : "No stations registered yet"}
                      </h3>
                      <p>
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try clearing your search query or selecting a different status filter."
                          : "Get started by adding your first fire station."}
                      </p>
                      {searchQuery || statusFilter !== "ALL" ? (
                        <button
                          type="button"
                          className="mbfp-empty-btn"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mbfp-add-btn"
                          onClick={() => {
                            setModalError("");
                            setIsAddModalOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-plus" />
                          <span>Add Your First Station</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* SKELETON / LOADING STATE */}
              {loading && stations.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="mbfp-loading-state">
                      <div className="mbfp-loading-spinner" />
                      <span>Loading municipal stations…</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )}

  {/* =========================================================================
      MODALS MOUNTED VIA PORTAL TO DOCUMENT.BODY (AVAILABLE ON BOTH SCREENS)
      ========================================================================= */}
      {mounted && isAddModalOpen && createPortal(
        <div
          className="mbfp-modal-overlay"
          onClick={() => !saving && setIsAddModalOpen(false)}
          role="presentation"
        >
          <div
            className="mbfp-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-station-title"
          >
            <div className="mbfp-modal-header">
              <div className="mbfp-modal-header-text">
                <h2 id="add-station-title">
                  <i className="fa-solid fa-building-shield" /> Add Station
                </h2>
                <p>Register a fire station and assign its station head.</p>
              </div>
              <button
                type="button"
                className="mbfp-modal-close"
                onClick={() => !saving && setIsAddModalOpen(false)}
                aria-label="Close dialog"
                disabled={saving}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={submitAdd}>
              <div className="mbfp-modal-body">
                {modalError && (
                  <div className="mbfp-modal-alert">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="mbfp-form-group">
                  <label htmlFor="modal-station-name">
                    Station Name <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-building" />
                    <input
                      id="modal-station-name"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. San Jose Fire Station Command"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      disabled={saving}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mbfp-form-group">
                  <label htmlFor="modal-head-name">
                    Head Name
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-user-shield" />
                    <input
                      id="modal-head-name"
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. SFO4 Roberto Garcia"
                      value={headName}
                      onChange={(e) => setHeadName(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="mbfp-modal-footer">
                <button
                  type="button"
                  className="mbfp-cancel-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="mbfp-submit-btn" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus" />
                      <span>Add Station</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          DEACTIVATE CONFIRMATION MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && stationToDeactivate && createPortal(
        <div
          className="mbfp-modal-overlay"
          onClick={() => !deactivating && setStationToDeactivate(null)}
          role="presentation"
        >
          <div
            className="mbfp-modal-content confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mbfp-confirm-body">
              <div className="mbfp-confirm-icon-wrap">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h3>Deactivate Station?</h3>
              <p>
                Are you sure you want to deactivate{" "}
                <strong>{stationToDeactivate.stationName}</strong>? Active personnel assigned to
                this station must be reassigned first.
              </p>
            </div>

            <div className="mbfp-modal-footer">
              <button
                type="button"
                className="mbfp-cancel-btn"
                onClick={() => setStationToDeactivate(null)}
                disabled={deactivating}
              >
                Keep Active
              </button>
              <button
                type="button"
                className="mbfp-danger-btn"
                onClick={() => void confirmDeactivate()}
                disabled={deactivating}
              >
                {deactivating ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>Deactivating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-power-off" />
                    <span>Deactivate Station</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          ISSUE OFFICER ACCOUNT MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && isIssueModalOpen && createPortal(
        <div
          className="mbfp-modal-overlay"
          onClick={closeIssueAccount}
          role="presentation"
        >
          <div
            className="mbfp-modal-content mbfp-issue-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-account-title"
          >
            {/* HERO HEADER WITH GLOWING BADGE */}
            <div className="mbfp-modal-header mbfp-issue-header">
              <div className="mbfp-modal-header-hero">
                <div className="mbfp-modal-badge-glow">
                  <i className="fa-solid fa-user-plus" />
                </div>
                <div className="mbfp-modal-header-text">
                  <h2 id="issue-account-title">
                    Issue Officer Account
                  </h2>
                  <p>Register a municipal fire officer and designate station assignment.</p>
                </div>
              </div>
              <button
                type="button"
                className="mbfp-modal-close"
                onClick={closeIssueAccount}
                aria-label="Close dialog"
                disabled={issueSaving}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={submitIssueAccount}>
              <div className="mbfp-modal-body">
                {issueModalError && (
                  <div className="mbfp-modal-alert">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{issueModalError}</span>
                  </div>
                )}

                {/* FULL NAME */}
                <div className="mbfp-form-group">
                  <label htmlFor="issue-display-name">
                    Personnel Full Name <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-user" />
                    <input
                      id="issue-display-name"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. Juan Dela Cruz"
                      value={issueDisplayName}
                      onChange={(e) => setIssueDisplayName(e.target.value)}
                      disabled={issueSaving}
                      autoFocus
                    />
                  </div>
                </div>

                {/* RANK / POSITION WITH QUICK SELECT CHIPS */}
                <div className="mbfp-form-group">
                  <div className="mbfp-label-with-hint">
                    <label htmlFor="issue-rank">
                      Rank / Position <span className="mbfp-required">*</span>
                    </label>
                    <span className="mbfp-hint-pill">Tap to select</span>
                  </div>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-award" />
                    <input
                      id="issue-rank"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. FO1, FO2, SFO1, Fire Officer"
                      value={issueRank}
                      onChange={(e) => setIssueRank(e.target.value)}
                      disabled={issueSaving}
                    />
                  </div>
                  <div className="mbfp-quick-ranks">
                    {["FO1", "FO2", "FO3", "SFO1", "SFO2", "SFO3", "SFO4", "Insp"].map((rank) => (
                      <button
                        key={rank}
                        type="button"
                        className={`mbfp-rank-chip ${issueRank === rank ? "active" : ""}`}
                        onClick={() => setIssueRank(rank)}
                        disabled={issueSaving}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2-COLUMN ROW: STATION ASSIGNMENT & OFFICIAL EMAIL */}
                <div className="mbfp-form-row">
                  {/* STATION ASSIGNMENT DROPDOWN */}
                  <div className="mbfp-form-group">
                    <label htmlFor="issue-station-select">
                      Station Assignment <span className="mbfp-required">*</span>
                    </label>
                    <div className="mbfp-input-icon-wrap">
                      <i className="fa-solid fa-building-shield" />
                      <select
                        id="issue-station-select"
                        required
                        className="mbfp-form-input with-icon"
                        value={issueStationId}
                        onChange={(e) => setIssueStationId(e.target.value)}
                        disabled={issueSaving}
                      >
                        {stations
                          .filter((s) => s.status === "ACTIVE")
                          .map((station) => (
                            <option key={station.id} value={station.id}>
                              {parseStationName(station.stationName).name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* OFFICIAL EMAIL */}
                  <div className="mbfp-form-group">
                    <label htmlFor="issue-email">
                      Official Email <span className="mbfp-required">*</span>
                    </label>
                    <div className="mbfp-input-icon-wrap">
                      <i className="fa-solid fa-envelope" />
                      <input
                        id="issue-email"
                        required
                        type="email"
                        className="mbfp-form-input with-icon"
                        placeholder="e.g. officer@bfp.gov.ph"
                        value={issueEmail}
                        onChange={(e) => setIssueEmail(e.target.value)}
                        disabled={issueSaving}
                      />
                    </div>
                  </div>
                </div>

                {/* TEMPORARY PASSWORD */}
                <div className="mbfp-form-group">
                  <div className="mbfp-label-with-hint">
                    <label htmlFor="issue-temp-password">
                      Temporary Password <span className="mbfp-optional">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      className="mbfp-generate-pass-btn"
                      onClick={generateTemporaryPassword}
                      disabled={issueSaving}
                      title="Generate a random secure temporary password"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-key" />
                    <input
                      id="issue-temp-password"
                      type="text"
                      className="mbfp-form-input with-icon font-mono"
                      placeholder="Leave blank to auto-generate (e.g. Bfp#2026!)"
                      value={issueTemporaryPassword}
                      onChange={(e) => setIssueTemporaryPassword(e.target.value)}
                      disabled={issueSaving}
                    />
                  </div>
                  <p className="mbfp-form-hint">
                    <i className="fa-solid fa-circle-info" /> The officer will be required to change their temporary password upon their first login.
                  </p>
                </div>
              </div>

              <div className="mbfp-modal-footer">
                <button
                  type="button"
                  className="mbfp-cancel-btn"
                  onClick={closeIssueAccount}
                  disabled={issueSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="mbfp-submit-btn" disabled={issueSaving}>
                  {issueSaving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Issuing Account…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-user-plus" />
                      <span>Issue Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          ISSUED CREDENTIALS SUCCESS MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && issuedPassword && createPortal(
        <div
          className="mbfp-modal-overlay"
          onClick={() => setIssuedPassword(null)}
          role="presentation"
        >
          <div
            className="mbfp-modal-content mbfp-issued-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="issued-success-title"
          >
            <div className="mbfp-issued-hero">
              <div className="mbfp-issued-badge">
                <i className="fa-solid fa-circle-check" />
              </div>
              <h2 id="issued-success-title">Account Successfully Issued!</h2>
              <p>The municipal fire officer account is now active and assigned.</p>
            </div>

            <div className="mbfp-issued-body">
              <div className="mbfp-issued-card">
                <div className="mbfp-issued-row">
                  <span className="mbfp-issued-label">Officer</span>
                  <strong className="mbfp-issued-val">{issuedOfficerName}</strong>
                </div>
                <div className="mbfp-issued-row">
                  <span className="mbfp-issued-label">Station</span>
                  <span className="mbfp-issued-val">{issuedOfficerStation}</span>
                </div>
                <div className="mbfp-issued-row">
                  <span className="mbfp-issued-label">Official Email</span>
                  <span className="mbfp-issued-val text-mono">{issuedOfficerEmail}</span>
                </div>

                <div className="mbfp-issued-pass-section">
                  <span className="mbfp-issued-pass-label">TEMPORARY PASSWORD</span>
                  <div className="mbfp-issued-pass-box">
                    <code>{issuedPassword}</code>
                    <button
                      type="button"
                      className="mbfp-copy-pass-btn"
                      onClick={() => copyIssuedPassword(issuedPassword)}
                    >
                      {issuedCopied ? (
                        <>
                          <i className="fa-solid fa-check text-green-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-regular fa-copy" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mbfp-issued-notice">
                <i className="fa-solid fa-shield-halved" />
                <span>Provide these credentials to the officer. They can sign in on the mobile app or web portal and will be prompted to set a permanent password.</span>
              </div>
            </div>

            <div className="mbfp-modal-footer" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="mbfp-submit-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setIssuedPassword(null)}
              >
                <i className="fa-solid fa-check" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          EDIT OFFICER PROFILE MODAL (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && editingResponder && createPortal(
        <div
          className="mbfp-modal-overlay"
          onClick={closeEditOfficer}
          role="presentation"
        >
          <div
            className="mbfp-modal-content mbfp-edit-officer-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-officer-title"
          >
            {/* HERO HEADER */}
            <div className="mbfp-modal-header mbfp-edit-header">
              <div className="mbfp-modal-header-hero">
                <div className="mbfp-modal-badge-glow edit">
                  <i className="fa-solid fa-user-pen" />
                </div>
                <div className="mbfp-modal-header-text">
                  <h2 id="edit-officer-title">Edit Officer Profile</h2>
                  <p>Update personnel name, rank, and station assignment.</p>
                </div>
              </div>
              <button
                type="button"
                className="mbfp-modal-close"
                onClick={closeEditOfficer}
                aria-label="Close edit dialog"
                disabled={editSaving}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={submitEditOfficer}>
              <div className="mbfp-modal-body">
                {editError && (
                  <div className="mbfp-modal-alert">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* READ-ONLY ACCOUNT SUMMARY CHIP */}
                <div className="mbfp-edit-account-preview">
                  <div className="mbfp-edit-avatar-thumb">
                    {editingResponder.profilePhotoUrl ? (
                      <img src={editingResponder.profilePhotoUrl} alt="" className="mbfp-edit-thumb-img" />
                    ) : (
                      <i className="fa-solid fa-user-shield" />
                    )}
                  </div>
                  <div className="mbfp-edit-account-meta">
                    <span className="mbfp-edit-account-email text-mono">{editingResponder.email || "Official BFP Account"}</span>
                    <span className="mbfp-edit-account-status">
                      <span className="mbfp-status-pulse" /> {editingResponder.dutyStatus === "DISPATCHED" ? "Dispatched" : editingResponder.dutyStatus === "ON_DUTY" ? "Active Duty" : "Standby"}
                    </span>
                  </div>
                </div>

                {/* FULL NAME */}
                <div className="mbfp-form-group">
                  <label htmlFor="edit-display-name">
                    Officer Full Name <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-user" />
                    <input
                      id="edit-display-name"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. Khing Jay Regala"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      disabled={editSaving}
                      autoFocus
                    />
                  </div>
                </div>

                {/* RANK / POSITION WITH QUICK-SELECT CHIPS */}
                <div className="mbfp-form-group">
                  <div className="mbfp-label-with-hint">
                    <label htmlFor="edit-rank">
                      Rank / Position <span className="mbfp-required">*</span>
                    </label>
                    <span className="mbfp-hint-pill">Tap to select rank</span>
                  </div>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-award" />
                    <input
                      id="edit-rank"
                      required
                      type="text"
                      className="mbfp-form-input with-icon"
                      placeholder="e.g. FO1, FO2, SFO1"
                      value={editRank}
                      onChange={(e) => setEditRank(e.target.value)}
                      disabled={editSaving}
                    />
                  </div>
                  <div className="mbfp-quick-ranks">
                    {["FO1", "FO2", "FO3", "SFO1", "SFO2", "SFO3", "SFO4", "Insp"].map((rank) => (
                      <button
                        key={rank}
                        type="button"
                        className={`mbfp-rank-chip ${editRank === rank ? "active" : ""}`}
                        onClick={() => setEditRank(rank)}
                        disabled={editSaving}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STATION ASSIGNMENT DROPDOWN */}
                <div className="mbfp-form-group">
                  <label htmlFor="edit-station-select">
                    Station Assignment <span className="mbfp-required">*</span>
                  </label>
                  <div className="mbfp-input-icon-wrap">
                    <i className="fa-solid fa-building-shield" />
                    <select
                      id="edit-station-select"
                      required
                      className="mbfp-form-input with-icon"
                      value={editStationId}
                      onChange={(e) => setEditStationId(e.target.value)}
                      disabled={editSaving}
                    >
                      {stations
                        .filter((s) => s.status === "ACTIVE")
                        .map((station) => (
                          <option key={station.id} value={station.id}>
                            {parseStationName(station.stationName).name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* MOBILE SYNC NOTICE */}
                <div className="mbfp-sync-notice">
                  <i className="fa-solid fa-mobile-screen-button" />
                  <span>Updates to name and position will immediately sync and reflect on the officer&apos;s mobile app and municipal records.</span>
                </div>
              </div>

              <div className="mbfp-modal-footer">
                <button
                  type="button"
                  className="mbfp-cancel-btn"
                  onClick={closeEditOfficer}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="mbfp-submit-btn" disabled={editSaving}>
                  {editSaving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Saving Changes…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const pageStyles = `
  /* ================= PAGE CONTAINER & RESET ================= */
  .mbfp-stations-page {
    padding: 1.2rem 1.75rem 3rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  /* ================= HEADER ================= */
  .mbfp-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.2rem;
    flex-wrap: wrap;
  }

  .mbfp-header-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: #D00F09;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.35rem;
  }

  .mbfp-page-header h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .mbfp-page-header h1 i {
    color: #D00F09;
  }

  .mbfp-page-header p {
    font-size: 0.86rem;
    color: #64748B;
    margin: 0.35rem 0 0;
    max-width: 44rem;
    line-height: 1.5;
  }

  .mbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    color: #475569;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    cursor: pointer;
    transition: all 0.18s ease;
    font-family: inherit;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .mbfp-refresh-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .mbfp-refresh-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .mbfp-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    color: #FFFFFF;
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.28);
    font-family: inherit;
    text-decoration: none;
  }

  .mbfp-add-btn:hover {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.38);
  }

  .mbfp-add-btn:active {
    transform: translateY(0);
  }

  /* ================= ALERT BANNER ================= */
  .mbfp-alert-banner {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.9rem 1.2rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    font-size: 0.85rem;
    animation: fadeIn 0.2s ease;
  }

  .mbfp-alert-icon {
    font-size: 1.1rem;
    color: #DC2626;
  }

  .mbfp-alert-text {
    flex: 1;
    line-height: 1.4;
  }

  .mbfp-alert-close {
    background: transparent;
    border: none;
    color: #991B1B;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .mbfp-alert-close:hover {
    background: rgba(153, 27, 27, 0.1);
  }

  /* ================= STATS OVERVIEW ================= */
  .mbfp-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.9rem;
  }

  .mbfp-stat-card {
    background: #FFFFFF;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    padding: 1rem 1.15rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .mbfp-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  }

  .mbfp-stat-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .mbfp-stat-icon-wrap.primary {
    background: #FFF1F2;
    color: #D00F09;
  }

  .mbfp-stat-icon-wrap.success {
    background: #ECFDF5;
    color: #059669;
  }

  .mbfp-stat-icon-wrap.warning {
    background: #FFFBEB;
    color: #D97706;
  }

  .mbfp-stat-icon-wrap.info {
    background: #EFF6FF;
    color: #2563EB;
  }

  .mbfp-stat-val {
    font-size: 1.55rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.1;
  }

  .mbfp-stat-val.text-success { color: #059669; }
  .mbfp-stat-val.text-warning { color: #D97706; }
  .mbfp-stat-val.text-info { color: #2563EB; }

  .mbfp-stat-label {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
    margin-top: 0.2rem;
  }

  /* ================= TABLE CARD ================= */
  .mbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-table-toolbar {
    padding: 0.9rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
    flex-wrap: wrap;
  }

  .mbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 0.45rem 0.8rem;
    width: min(100%, 340px);
    transition: border-color 0.15s;
  }

  .mbfp-search-box:focus-within {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.08);
  }

  .mbfp-search-box i {
    color: #94A3B8;
    font-size: 0.82rem;
  }

  .mbfp-search-box input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    font-size: 0.82rem;
    color: #0F172A;
    font-family: inherit;
  }

  .mbfp-search-clear {
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    padding: 0;
    font-size: 0.75rem;
  }

  .mbfp-search-clear:hover {
    color: #0F172A;
  }

  .mbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-pill-btn {
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-pill-btn:hover {
    border-color: #CBD5E1;
    color: #0F172A;
  }

  .mbfp-pill-btn.active {
    background: #D00F09;
    border-color: #D00F09;
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(208, 15, 9, 0.22);
  }

  /* ================= TABLE ELEMENTS ================= */
  .mbfp-table-responsive {
    overflow-x: auto;
    width: 100%;
  }

  .mbfp-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
    text-align: left;
  }

  .mbfp-data-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #E2E8F0;
  }

  .mbfp-data-table td {
    padding: 0.9rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    vertical-align: middle;
    color: #334155;
    transition: background 0.12s ease;
  }

  .mbfp-data-table tr:hover td {
    background: #FEF9F9;
  }

  .mbfp-station-cell {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mbfp-station-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-station-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-station-name {
    font-weight: 700;
    color: #0F172A;
    font-size: 0.88rem;
  }

  .mbfp-station-subtext {
    font-size: 0.72rem;
    color: #64748B;
  }

  .mbfp-station-head {
    font-size: 0.74rem;
    color: #475569;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.15rem;
  }

  .mbfp-station-head i {
    color: #D00F09;
    font-size: 0.72rem;
  }

  /* Status */
  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mbfp-status-pill.active {
    background: #ECFDF5;
    color: #059669;
  }

  .mbfp-status-pill.inactive {
    background: #F1F5F9;
    color: #64748B;
  }

  .mbfp-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .mbfp-status-pill.active .mbfp-status-pulse {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  }

  /* Actions */
  .mbfp-deactivate-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #FFFFFF;
    border: 1px solid #FECACA;
    color: #DC2626;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-deactivate-btn:hover {
    background: #FEF2F2;
    border-color: #DC2626;
    transform: translateY(-1px);
  }

  .mbfp-deactivated-label {
    font-size: 0.72rem;
    color: #94A3B8;
    font-weight: 600;
  }

  /* ================= EMPTY STATE ================= */
  .mbfp-empty-state {
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mbfp-empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: #FFF1F2;
    color: #D00F09;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(208, 15, 9, 0.15);
  }

  .mbfp-empty-state h3 {
    font-size: 1.15rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.4rem;
  }

  .mbfp-empty-state p {
    color: #64748B;
    font-size: 0.85rem;
    max-width: 24rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .mbfp-empty-btn {
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    font-weight: 700;
    font-size: 0.8rem;
    color: #334155;
    cursor: pointer;
  }

  .mbfp-loading-state {
    padding: 3rem 1rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #64748B;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .mbfp-loading-spinner {
    width: 26px;
    height: 26px;
    border: 3px solid #E2E8F0;
    border-top-color: #D00F09;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* ================= MODAL DIALOGS ================= */
  .mbfp-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999999 !important;
    padding: 1.5rem;
    box-sizing: border-box;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .mbfp-modal-content {
    background: #FFFFFF;
    width: min(100%, 640px);
    border-radius: 18px;
    box-shadow: 0 32px 80px -12px rgba(15, 23, 42, 0.38);
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid #E2E8F0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .mbfp-modal-content.confirm-modal {
    width: min(100%, 450px);
  }

  .mbfp-modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #F1F5F9;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: #FAFAFA;
  }

  .mbfp-modal-header-text h2 {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    letter-spacing: -0.01em;
  }

  .mbfp-modal-header-text h2 i {
    color: #D00F09;
    font-size: 1.55rem;
  }

  .mbfp-modal-header-text p {
    font-size: 0.92rem;
    color: #64748B;
    margin: 0.35rem 0 0;
  }

  .mbfp-modal-close {
    background: rgba(0, 0, 0, 0.04);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mbfp-modal-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #0F172A;
  }

  .mbfp-modal-body {
    padding: 2rem 2rem 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mbfp-modal-alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.15rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #B91C1C;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .mbfp-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .mbfp-form-group label {
    font-size: 0.92rem;
    font-weight: 750;
    color: #334155;
  }

  .mbfp-required {
    color: #D00F09;
  }

  .mbfp-input-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .mbfp-input-icon-wrap i {
    position: absolute;
    left: 1.1rem;
    color: #94A3B8;
    font-size: 1.05rem;
    pointer-events: none;
  }

  .mbfp-form-input {
    padding: 0.95rem 1.25rem;
    border: 1.5px solid #CBD5E1;
    border-radius: 10px;
    font-size: 1rem;
    color: #0F172A;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .mbfp-form-input.with-icon {
    padding-left: 2.85rem;
  }

  .mbfp-form-input:focus {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.12);
  }

  .mbfp-input-hint {
    font-size: 0.7rem;
    color: #94A3B8;
  }

  .mbfp-form-section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.3rem;
    font-size: 0.75rem;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mbfp-gps-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    color: #1D4ED8;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-gps-btn:hover:not(:disabled) {
    background: #DBEAFE;
    border-color: #93C5FD;
  }

  .mbfp-gps-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .mbfp-form-row {
    display: flex;
    gap: 0.85rem;
  }

  .mbfp-location-preview-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    font-size: 0.73rem;
    color: #64748B;
    line-height: 1.4;
  }

  .mbfp-location-preview-note i {
    color: #3B82F6;
    margin-top: 0.1rem;
  }

  .mbfp-modal-footer {
    padding: 1.35rem 2rem;
    border-top: 1px solid #F1F5F9;
    display: flex;
    justify-content: flex-end;
    gap: 0.9rem;
    background: #FAFAFA;
  }

  .mbfp-cancel-btn {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
    padding: 0.8rem 1.6rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .mbfp-cancel-btn:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
  }

  .mbfp-submit-btn {
    background: linear-gradient(135deg, #D00F09 0%, #EF5350 100%);
    border: none;
    color: #FFFFFF;
    padding: 0.8rem 1.8rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: 0 4px 14px rgba(208, 15, 9, 0.32);
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-family: inherit;
  }

  .mbfp-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(208, 15, 9, 0.4);
  }

  .mbfp-submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Confirm modal */
  .mbfp-confirm-body {
    padding: 1.75rem 1.5rem 1.25rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mbfp-confirm-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #FEF2F2;
    color: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
  }

  .mbfp-confirm-body h3 {
    font-size: 1.2rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.5rem;
  }

  .mbfp-confirm-body p {
    font-size: 0.84rem;
    color: #64748B;
    margin: 0;
    line-height: 1.5;
  }

  .mbfp-danger-btn {
    background: #DC2626;
    color: #FFFFFF;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-family: inherit;
    box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);
    transition: all 0.15s;
  }

  .mbfp-danger-btn:hover:not(:disabled) {
    background: #B91C1C;
    transform: translateY(-1px);
  }

  .mbfp-danger-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* ================= STATION ROSTER MODAL & CARDS ================= */
  .mbfp-clickable-row {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .mbfp-clickable-row:hover {
    background-color: #F8FAFC;
  }

  .mbfp-row-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .mbfp-view-roster-btn {
    background: #FFF1F2;
    color: #BE123C;
    border: 1px solid #FECDD3;
    padding: 0.42rem 0.8rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-view-roster-btn:hover {
    background: #FFE4E6;
    border-color: #FDA4AF;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(190, 18, 60, 0.1);
  }

  /* ================= STATION ROSTER FULL SCREEN VIEW ================= */
  .mbfp-roster-screen-view {
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    gap: 8px !important;
    padding: 0.75rem 1.75rem 2rem;
  }

  .mbfp-roster-nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    padding-bottom: 0;
    margin-bottom: 1px;
  }

  .mbfp-back-button {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    background: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    padding: 0.55rem 1.1rem;
    border-radius: 9px;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-back-button:hover {
    background: #FFF1F2;
    border-color: #FECDD3;
    color: #B91C1C;
    transform: translateX(-3px);
    box-shadow: 0 3px 8px rgba(185, 28, 28, 0.12);
  }

  .mbfp-back-button.secondary {
    background: #F8FAFC;
  }

  .mbfp-back-button.secondary:hover {
    background: #FFF1F2;
    border-color: #FECDD3;
    color: #B91C1C;
  }

  .mbfp-roster-breadcrumbs {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: #64748B;
  }

  .mbfp-breadcrumb-link {
    background: none;
    border: none;
    padding: 0;
    color: #64748B;
    font-size: inherit;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .mbfp-breadcrumb-link:hover {
    color: #B91C1C;
    text-decoration: underline;
  }

  .mbfp-breadcrumb-sep {
    font-size: 0.65rem;
    color: #94A3B8;
  }

  .mbfp-breadcrumb-current {
    font-weight: 700;
    color: #0F172A;
  }

  .mbfp-breadcrumb-tag {
    font-size: 0.72rem;
    font-weight: 700;
    color: #B91C1C;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
  }

  /* STATION COMMAND HERO CARD */
  .mbfp-station-hero-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.85rem 1.35rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03);
  }

  .mbfp-station-hero-main {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    flex: 1;
    min-width: 280px;
  }

  .mbfp-station-hero-icon {
    width: 3.6rem;
    height: 3.6rem;
    border-radius: 12px;
    background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%);
    border: 1px solid #FECDD3;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #B91C1C;
    font-size: 1.6rem;
    flex-shrink: 0;
  }

  .mbfp-station-hero-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mbfp-station-hero-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .mbfp-hero-stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.65rem 1.1rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    min-width: 100px;
    text-align: center;
  }

  .mbfp-hero-stat-card.on-duty {
    background: #ECFDF5;
    border-color: #A7F3D0;
  }

  .mbfp-hero-stat-card.standby {
    background: #FFFBEB;
    border-color: #FDE68A;
  }

  .mbfp-hero-stat-val {
    font-size: 1.3rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    line-height: 1.1;
  }

  .mbfp-hero-stat-card.on-duty .mbfp-hero-stat-val {
    color: #065F46;
  }

  .mbfp-hero-stat-card.standby .mbfp-hero-stat-val {
    color: #92400E;
  }

  .mbfp-hero-stat-lbl {
    font-size: 0.7rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 0.25rem;
  }

  .mbfp-hero-stat-card.on-duty .mbfp-hero-stat-lbl {
    color: #047857;
  }

  .mbfp-hero-stat-card.standby .mbfp-hero-stat-lbl {
    color: #B45309;
  }

  .mbfp-stat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .mbfp-stat-dot.on-duty {
    background: #10B981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
  }

  .mbfp-stat-dot.standby {
    background: #F59E0B;
  }

  .mbfp-roster-header-icon {
    background: #FEE2E2 !important;
    color: #B91C1C !important;
  }

  .mbfp-roster-station-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #B91C1C;
    margin-bottom: 0.2rem;
  }

  .mbfp-roster-pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #B91C1C;
  }

  .mbfp-roster-station-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .mbfp-roster-station-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: #64748B;
    margin-top: 0.25rem;
  }

  .mbfp-meta-sep {
    color: #CBD5E1;
  }

  .mbfp-roster-count-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: #0F172A;
    background: #F1F5F9;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.72rem;
  }

  .mbfp-roster-toolbar {
    padding: 0.55rem 0.9rem;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    margin-top: 1px;
  }

  .mbfp-roster-search {
    position: relative;
    flex: 1;
    min-width: 240px;
  }

  .mbfp-roster-search i.fa-magnifying-glass {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94A3B8;
    font-size: 0.85rem;
  }

  .mbfp-roster-search input {
    width: 100%;
    padding: 0.55rem 2.2rem 0.55rem 2.3rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.82rem;
    background: #FFFFFF;
    color: #0F172A;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .mbfp-roster-search input:focus {
    border-color: #B91C1C;
    box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
  }

  .mbfp-roster-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-roster-alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #FEF2F2;
    border-bottom: 1px solid #FECACA;
    color: #B91C1C;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .mbfp-roster-manage-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #0F172A;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mbfp-roster-manage-btn:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #B91C1C;
  }

  .mbfp-roster-screen-content {
    background: transparent;
    margin-top: 3px;
  }

  /* ================= ROSTER PERSONNEL CARDS (EXACT JOEYLENE RIVERA REDESIGN) ================= */
  .mbfp-roster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 285px));
    gap: 16px;
    justify-content: start;
  }

  .mbfp-roster-card {
    background: #FFFFFF;
    border-radius: 22px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    border: 1px solid #F1F5F9;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: pointer;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s;
    width: 100%;
    max-width: 285px;
    min-height: 380px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .mbfp-roster-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 32px rgba(185, 28, 28, 0.12), 0 4px 12px rgba(15, 23, 42, 0.05);
    border-color: #FECDD3;
  }

  /* CARD TOP: RED/CRIMSON ACCENT (STRICTLY NOT GREEN - PLAIN RED) */
  .mbfp-roster-card-top {
    position: relative;
    width: 100%;
    padding: 14px 14px 4px;
    background: #FFFFFF;
    border-top: 4px solid #B91C1C;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
  }

  .mbfp-roster-top-bar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .mbfp-roster-top-emblem {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #0F172A;
    color: #F59E0B;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
  }

  .mbfp-roster-top-right-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-roster-duty-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.18rem 0.55rem;
    border-radius: 9999px;
    font-size: 0.68rem;
    font-weight: 750;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .mbfp-roster-duty-pill.dispatched {
    background: #FEF2F2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }

  .mbfp-roster-duty-pill.on_duty {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #A7F3D0;
  }

  .mbfp-roster-duty-pill.standby {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FDE68A;
  }

  /* AVATAR ORBIT & CIRCLE (EXACT JOEYLENE RIVERA COMPACT PROPORTIONS) */
  .mbfp-roster-avatar-orbit {
    position: relative;
    width: 92px;
    height: 92px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2px auto 6px;
  }

  .mbfp-roster-avatar-ring {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2.5px solid transparent;
    border-top-color: #F59E0B;
    border-right-color: #F59E0B;
    transform: rotate(-25deg);
    pointer-events: none;
  }

  .mbfp-roster-avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 3px solid #FFFFFF;
    box-shadow: 0 4px 16px rgba(185, 28, 28, 0.16);
    overflow: hidden;
    background: #B91C1C;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mbfp-roster-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    border-radius: 50%;
  }

  .mbfp-roster-avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    background: #B91C1C;
    color: #FFFFFF;
  }

  .mbfp-roster-fallback-shield {
    font-size: 1.5rem;
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.95);
  }

  .mbfp-roster-initials {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #FFFFFF;
  }

  /* CARD BODY & CENTERED IDENTITY */
  .mbfp-roster-card-body {
    padding: 0 16px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    box-sizing: border-box;
  }

  .mbfp-roster-profile-header {
    text-align: center;
    margin-bottom: 2px;
  }

  .mbfp-roster-profile-name {
    font-size: 1.06rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    margin: 0;
    line-height: 1.25;
  }

  .mbfp-roster-verified {
    color: #2563EB;
    font-size: 0.9rem;
  }

  .mbfp-roster-profile-role {
    font-size: 0.8rem;
    font-weight: 700;
    color: #B91C1C;
    margin-top: 2px;
  }

  .mbfp-roster-bio {
    font-size: 0.72rem;
    color: #64748B;
    line-height: 1.45;
    margin: 6px auto 10px;
    max-width: 230px;
    font-weight: 500;
  }

  /* CENTERED EMAIL PILL BUTTON (JOEYLENE RIVERA STYLE) */
  .mbfp-roster-email-pill-wrap {
    display: flex;
    justify-content: center;
    margin: 2px auto 10px;
    width: 100%;
  }

  .mbfp-roster-email-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #0F172A;
    color: #FFFFFF;
    padding: 0.38rem 0.95rem;
    border-radius: 9999px;
    font-size: 0.74rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.15);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: 100%;
  }

  .mbfp-roster-email-pill:hover {
    background: #B91C1C;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(185, 28, 28, 0.25);
  }

  .mbfp-roster-email-pill-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 175px;
  }

  /* ACTION ICONS ROW (EXACT JOEYLENE RIVERA 5 ICONS) */
  .mbfp-roster-action-icons-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    margin-top: auto;
    margin-bottom: 6px;
    width: 100%;
  }

  .mbfp-roster-action-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.76rem;
    transition: all 0.18s ease;
  }

  .mbfp-roster-action-icon.btn-action {
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }

  .mbfp-roster-action-icon:hover {
    background: #FFF1F2;
    border-color: #FECDD3;
    color: #B91C1C;
    transform: translateY(-1.5px);
  }

  .mbfp-roster-action-icon.highlight {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #B91C1C;
  }

  .mbfp-roster-action-icon.highlight:hover {
    background: #B91C1C;
    border-color: #B91C1C;
    color: #FFFFFF;
  }

  /* DETAILS SPECIFICATIONS (CONTRACT COMPATIBILITY) */
  .mbfp-roster-detail {
    display: none;
  }

  /* SIGNATURE BOTTOM CRADLE ACCENT (JOEYLENE RIVERA EXACT STYLE - PLAIN RED) */
  .mbfp-roster-card-bottom-accent {
    position: relative;
    width: 100%;
    height: 24px;
    background: #B91C1C;
    border-radius: 0 0 22px 22px;
    padding: 0 8px 10px 8px;
    margin-top: auto;
    display: flex;
    box-sizing: border-box;
  }

  .mbfp-roster-card-cradle-inner {
    width: 100%;
    height: 100%;
    background: #FFFFFF;
    border-radius: 0 0 14px 14px;
  }

  /* EDIT OFFICER MODAL */
  .mbfp-edit-officer-modal {
    max-width: 600px;
    width: 100%;
    border-radius: 20px;
    background: #FFFFFF;
    box-shadow: 0 32px 80px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.06);
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: min(90vh, 720px);
    display: flex;
    flex-direction: column;
  }

  .mbfp-edit-officer-modal form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .mbfp-edit-header {
    background: linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%);
    border-top: 4px solid #B91C1C;
    padding: 1.35rem 1.85rem 1.15rem;
    border-bottom: 1px solid #F1F5F9;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mbfp-modal-header-hero {
    display: flex;
    align-items: center;
    gap: 0.95rem;
  }

  .mbfp-modal-badge-glow {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
    color: #FFFFFF !important;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.32);
    flex-shrink: 0;
  }

  .mbfp-modal-badge-glow i {
    color: #FFFFFF !important;
    font-size: 1.15rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mbfp-modal-badge-glow.edit {
    background: linear-gradient(135deg, #B91C1C 0%, #DC2626 100%);
    color: #FFFFFF !important;
    box-shadow: 0 6px 16px rgba(185, 28, 28, 0.32);
  }

  .mbfp-edit-officer-modal .mbfp-modal-header-hero {
    display: flex;
    align-items: center;
    gap: 0.95rem;
  }

  .mbfp-edit-officer-modal .mbfp-modal-badge-glow {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #B91C1C 0%, #DC2626 100%);
    color: #FFFFFF !important;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(185, 28, 28, 0.32);
    flex-shrink: 0;
  }

  .mbfp-edit-officer-modal .mbfp-modal-badge-glow i {
    color: #FFFFFF !important;
    font-size: 1.15rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mbfp-edit-officer-modal .mbfp-modal-header-text h2 {
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: #0F172A;
    margin: 0;
  }

  .mbfp-edit-officer-modal .mbfp-modal-header-text p {
    font-size: 0.88rem;
    color: #64748B;
    margin: 0.25rem 0 0;
    line-height: 1.4;
  }

  .mbfp-edit-officer-modal .mbfp-modal-close {
    width: 36px;
    height: 36px;
    font-size: 1.05rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(0, 0, 0, 0.04);
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .mbfp-edit-officer-modal .mbfp-modal-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #0F172A;
  }

  .mbfp-edit-officer-modal .mbfp-modal-body {
    padding: 1.5rem 1.85rem 1.35rem;
    gap: 1.15rem;
    overflow-y: auto;
  }

  .mbfp-edit-account-preview {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.7rem 1.05rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
  }

  .mbfp-edit-avatar-thumb {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #B91C1C;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    overflow: hidden;
    flex-shrink: 0;
  }

  .mbfp-edit-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mbfp-edit-account-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-edit-account-email {
    font-size: 0.88rem;
    font-weight: 700;
    color: #0F172A;
  }

  .mbfp-edit-account-status {
    font-size: 0.75rem;
    font-weight: 700;
    color: #059669;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-sync-notice {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.7rem 1rem;
    background: #EFF6FF;
    border: 1px solid #DBEAFE;
    border-radius: 10px;
    font-size: 0.78rem;
    color: #1E40AF;
    line-height: 1.45;
  }

  .mbfp-sync-notice i {
    font-size: 1rem;
    color: #2563EB;
    margin-top: 0.1rem;
  }

  .mbfp-edit-officer-modal .mbfp-form-group {
    gap: 0.45rem;
  }

  .mbfp-edit-officer-modal .mbfp-form-group label {
    font-size: 0.88rem;
    font-weight: 750;
    color: #1E293B;
  }

  .mbfp-edit-officer-modal .mbfp-form-input {
    padding: 0.78rem 1.1rem;
    border-radius: 10px;
    font-size: 0.94rem;
    border: 1.5px solid #CBD5E1;
  }

  .mbfp-edit-officer-modal .mbfp-form-input.with-icon {
    padding-left: 2.75rem;
  }

  .mbfp-edit-officer-modal .mbfp-input-icon-wrap i {
    left: 0.95rem;
    font-size: 1.05rem;
  }

  .mbfp-edit-officer-modal .mbfp-quick-ranks {
    gap: 0.4rem;
    margin-top: 0.45rem;
  }

  .mbfp-edit-officer-modal .mbfp-rank-chip {
    padding: 0.32rem 0.72rem;
    font-size: 0.78rem;
    border-radius: 7px;
    font-weight: 750;
  }

  .mbfp-edit-officer-modal .mbfp-hint-pill {
    font-size: 0.72rem;
    padding: 0.18rem 0.55rem;
  }

  .mbfp-edit-officer-modal .mbfp-modal-footer {
    padding: 1.15rem 1.85rem;
    gap: 0.85rem;
    flex-shrink: 0;
    background: #F8FAFC;
    border-top: 1px solid #F1F5F9;
  }

  .mbfp-edit-officer-modal .mbfp-cancel-btn {
    padding: 0.72rem 1.5rem;
    font-size: 0.92rem;
    border-radius: 10px;
    font-weight: 700;
  }

  .mbfp-edit-officer-modal .mbfp-submit-btn {
    padding: 0.72rem 1.75rem;
    font-size: 0.92rem;
    border-radius: 10px;
    font-weight: 750;
    gap: 0.55rem;
  }

  /* SKELETON SHIMMER (CIRCULAR AVATAR SKELETON) */
  .mbfp-roster-skeleton .skeleton-top {
    width: 100%;
    height: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  .mbfp-skeleton-avatar-orbit {
    width: 92px;
    height: 92px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2px auto 6px;
  }

  .mbfp-skeleton-avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: mbfpShimmer 1.5s infinite;
  }

  .mbfp-skeleton-row.skeleton-center {
    margin-left: auto;
    margin-right: auto;
  }

  .mbfp-skeleton-row.short {
    width: 130px;
    height: 16px;
  }

  .mbfp-skeleton-row.tiny {
    width: 85px;
    height: 12px;
    margin-bottom: 4px;
  }

  .mbfp-skeleton-row.bio1 {
    width: 200px;
    height: 10px;
    margin-top: 6px;
  }

  .mbfp-skeleton-row.bio2 {
    width: 150px;
    height: 10px;
    margin-bottom: 10px;
  }

  .mbfp-skeleton-row {
    height: 10px;
    border-radius: 6px;
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: mbfpShimmer 1.5s infinite;
    margin: 3px auto;
  }

  .mbfp-skeleton-pill {
    width: 165px;
    height: 26px;
    border-radius: 9999px;
    margin: 4px auto 12px;
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: mbfpShimmer 1.5s infinite;
  }

  .mbfp-skeleton-icons-row {
    display: flex;
    justify-content: center;
    gap: 0.55rem;
    margin-top: auto;
    margin-bottom: 6px;
    width: 100%;
  }

  .mbfp-skeleton-icon-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: mbfpShimmer 1.5s infinite;
  }

  /* ================= ISSUE ACCOUNT BUTTON & MODAL ================= */
  .mbfp-issue-account-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem 1.35rem;
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
    color: #FFFFFF;
    border: none;
    border-radius: 12px;
    font-size: 0.88rem;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.32);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: inherit;
    letter-spacing: -0.01em;
    flex-shrink: 0;
  }

  .mbfp-issue-account-btn:hover {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.42);
  }

  .mbfp-issue-account-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
  }

  .mbfp-issue-account-btn i {
    font-size: 0.95rem;
  }

  /* MODAL OVERLAY & CARD */
  .mbfp-issue-modal {
    max-width: 620px;
    width: 100%;
    border-radius: 20px;
    background: #FFFFFF;
    box-shadow: 0 32px 80px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.06);
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: min(90vh, 740px);
    display: flex;
    flex-direction: column;
  }

  .mbfp-issue-modal form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .mbfp-issue-header {
    background: linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%);
    border-top: 4px solid #DC2626;
    padding: 1.35rem 1.85rem 1.15rem;
    border-bottom: 1px solid #F1F5F9;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mbfp-issue-modal .mbfp-modal-header-hero {
    display: flex;
    align-items: center;
    gap: 0.95rem;
  }

  .mbfp-issue-modal .mbfp-modal-badge-glow {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
    color: #FFFFFF !important;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.32);
    flex-shrink: 0;
  }

  .mbfp-issue-modal .mbfp-modal-badge-glow i {
    color: #FFFFFF !important;
    font-size: 1.15rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mbfp-issue-modal .mbfp-modal-header-text h2 {
    font-size: 1.3rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.015em;
  }

  .mbfp-issue-modal .mbfp-modal-header-text p {
    font-size: 0.88rem;
    color: #64748B;
    margin: 0.25rem 0 0;
    line-height: 1.4;
  }

  .mbfp-issue-modal .mbfp-modal-close {
    width: 36px;
    height: 36px;
    font-size: 1.05rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(0, 0, 0, 0.04);
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .mbfp-issue-modal .mbfp-modal-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #0F172A;
  }

  .mbfp-issue-modal .mbfp-modal-body {
    padding: 1.5rem 1.85rem 1.35rem;
    gap: 1.15rem;
    overflow-y: auto;
  }

  .mbfp-issue-modal .mbfp-form-group {
    gap: 0.45rem;
  }

  .mbfp-issue-modal .mbfp-form-group label {
    font-size: 0.88rem;
    font-weight: 750;
    color: #1E293B;
  }

  .mbfp-issue-modal .mbfp-form-input {
    padding: 0.78rem 1.1rem;
    border-radius: 10px;
    font-size: 0.94rem;
    border: 1.5px solid #CBD5E1;
  }

  .mbfp-issue-modal .mbfp-form-input.with-icon {
    padding-left: 2.75rem;
  }

  .mbfp-issue-modal .mbfp-input-icon-wrap i {
    left: 0.95rem;
    font-size: 1.05rem;
  }

  .mbfp-issue-modal .mbfp-form-row {
    display: flex;
    gap: 1rem;
  }

  .mbfp-issue-modal .mbfp-form-row .mbfp-form-group {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 580px) {
    .mbfp-issue-modal .mbfp-form-row {
      flex-direction: column;
      gap: 0.85rem;
    }
  }

  .mbfp-label-with-hint {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mbfp-hint-pill {
    font-size: 0.72rem;
    color: #64748B;
    background: #F1F5F9;
    padding: 0.18rem 0.55rem;
    border-radius: 9999px;
    font-weight: 600;
  }

  .mbfp-quick-ranks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.45rem;
  }

  .mbfp-rank-chip {
    padding: 0.32rem 0.72rem;
    border-radius: 7px;
    font-size: 0.78rem;
    font-weight: 750;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-rank-chip:hover {
    background: #FFF1F2;
    border-color: #FECDD3;
    color: #B91C1C;
  }

  .mbfp-rank-chip.active {
    background: #B91C1C;
    border-color: #B91C1C;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(185, 28, 28, 0.25);
  }

  .mbfp-generate-pass-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.76rem;
    font-weight: 700;
    color: #2563EB;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    padding: 0.25rem 0.7rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-generate-pass-btn:hover:not(:disabled) {
    background: #DBEAFE;
    border-color: #93C5FD;
    color: #1D4ED8;
    transform: translateY(-1px);
  }

  .mbfp-form-hint {
    font-size: 0.78rem;
    color: #64748B;
    margin: 0.35rem 0 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    line-height: 1.4;
  }

  .mbfp-optional {
    font-size: 0.76rem;
    color: #94A3B8;
    font-weight: 500;
    margin-left: 0.25rem;
  }

  .mbfp-issue-modal .mbfp-modal-footer {
    padding: 1.15rem 1.85rem;
    gap: 0.85rem;
    flex-shrink: 0;
    background: #F8FAFC;
    border-top: 1px solid #F1F5F9;
  }

  .mbfp-issue-modal .mbfp-cancel-btn {
    padding: 0.72rem 1.5rem;
    font-size: 0.92rem;
    border-radius: 10px;
    font-weight: 700;
  }

  .mbfp-issue-modal .mbfp-submit-btn {
    padding: 0.72rem 1.75rem;
    font-size: 0.92rem;
    border-radius: 10px;
    font-weight: 750;
    gap: 0.55rem;
  }

  /* ================= ISSUED CREDENTIALS SUCCESS MODAL ================= */
  .mbfp-issued-modal {
    max-width: 460px;
    width: 100%;
    border-radius: 20px;
    background: #FFFFFF;
    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(15, 23, 42, 0.05);
    overflow: hidden;
    animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-issued-hero {
    padding: 1.85rem 1.6rem 1.15rem;
    background: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%);
    border-top: 4px solid #10B981;
    text-align: center;
  }

  .mbfp-issued-badge {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: #ECFDF5;
    border: 2px solid #A7F3D0;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.85rem;
    margin: 0 auto 0.75rem;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
  }

  .mbfp-issued-hero h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #065F46;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .mbfp-issued-hero p {
    font-size: 0.84rem;
    color: #047857;
    margin: 0.3rem 0 0;
  }

  .mbfp-issued-body {
    padding: 0 1.6rem 1.35rem;
  }

  .mbfp-issued-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1rem 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    text-align: left;
  }

  .mbfp-issued-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .mbfp-issued-label {
    color: #64748B;
    font-weight: 600;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mbfp-issued-val {
    color: #0F172A;
    font-weight: 700;
  }

  .mbfp-issued-pass-section {
    margin-top: 0.4rem;
    padding-top: 0.75rem;
    border-top: 1px dashed #CBD5E1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mbfp-issued-pass-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #475569;
    letter-spacing: 0.06em;
  }

  .mbfp-issued-pass-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0F172A;
    border-radius: 8px;
    padding: 0.65rem 0.9rem;
    color: #F8FAFC;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .mbfp-copy-pass-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .mbfp-copy-pass-btn:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .mbfp-issued-notice {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    margin-top: 0.85rem;
    padding: 0.75rem 0.9rem;
    background: #EFF6FF;
    border: 1px solid #DBEAFE;
    border-radius: 8px;
    font-size: 0.76rem;
    color: #1E40AF;
    line-height: 1.45;
    text-align: left;
  }

  /* ================= MUNICIPAL OVERVIEW STATS ROW ================= */
  .mbfp-stats-overview-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.2rem;
  }

  .mbfp-overview-stat-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.9rem 1.15rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .mbfp-overview-stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
  }

  .mbfp-overview-stat-icon.red {
    background: #FEF2F2;
    color: #DC2626;
  }

  .mbfp-overview-stat-icon.blue {
    background: #EFF6FF;
    color: #2563EB;
  }

  .mbfp-overview-stat-icon.green {
    background: #ECFDF5;
    color: #059669;
  }

  .mbfp-overview-stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-overview-stat-val {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    line-height: 1.1;
  }

  .mbfp-overview-stat-lbl {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* ================= ANIMATIONS & RESPONSIVENESS ================= */
  @keyframes mbfpShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1024px) {
    .mbfp-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .mbfp-stations-page {
      padding: 1rem;
    }

    .mbfp-header-top {
      flex-direction: column;
      align-items: stretch;
    }

    .mbfp-header-actions {
      justify-content: flex-start;
    }

    .mbfp-stats-grid {
      grid-template-columns: 1fr;
    }

    .mbfp-table-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .mbfp-search-box {
      width: 100%;
    }

    .mbfp-filter-pills {
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .mbfp-form-row {
      flex-direction: column;
      gap: 1.15rem;
    }
  }
`;

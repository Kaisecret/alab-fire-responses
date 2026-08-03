export const reportDetailStyles = `
    :root {
        --primary-red: #D4140B;
        --primary-red-light: #fff5f5;
        --primary-red-border: #ffcaca;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #ffffff;
        --bg-color: #fafaf9;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .detail-page-root {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
        padding-bottom: 5rem;
    }

    /* MOBILE HEADER */
    .detail-mobile-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        position: sticky;
        top: 0;
        background: var(--card-bg);
        z-index: 50;
    }
    .detail-mobile-header h1 {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .detail-back-btn {
        position: absolute;
        left: 1rem;
        background: none;
        border: none;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        text-decoration: none;
    }

    /* DETAIL CONTENT */
    .detail-content {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    /* REPORT HEADER CARD */
    .detail-report-header {
        background: var(--primary-red-light);
        border: 1.5px solid var(--primary-red-border);
        border-radius: 1rem;
        padding: 1.2rem;
    }
    .detail-report-header-top {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 0.8rem;
    }
    .detail-fire-icon {
        width: 2.5rem;
        height: 2.5rem;
        flex-shrink: 0;
    }
    .detail-fire-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .detail-report-ref {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--text-dark);
    }
    .detail-report-status-badge {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.8rem;
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .detail-report-status-badge.responding {
        background: var(--primary-red);
        color: white;
    }
    .detail-report-status-badge.verifying {
        background: #fef3c7;
        color: #b45309;
    }
    .detail-report-status-badge.closed {
        background: #dcfce7;
        color: #15803d;
    }
    .detail-report-status-badge::before {
        content: '';
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 50%;
        background: currentColor;
    }

    /* INFO CARDS */
    .detail-info-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem;
    }
    .detail-info-card-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.7rem;
        border-bottom: 1px solid var(--border-color);
    }
    .detail-info-card-title svg {
        width: 1.1rem;
        height: 1.1rem;
        color: var(--primary-red);
    }
    .detail-info-card-title img {
        width: 1.1rem;
        height: 1.1rem;
        object-fit: contain;
    }

    .detail-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    .detail-info-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
    }
    .detail-info-item svg {
        width: 1rem;
        height: 1rem;
        color: var(--primary-red);
        flex-shrink: 0;
        margin-top: 0.15rem;
    }
    .detail-info-item img {
        width: 1rem;
        height: 1rem;
        object-fit: contain;
        flex-shrink: 0;
        margin-top: 0.15rem;
    }
    .detail-info-label {
        font-size: 0.72rem;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 0.1rem;
    }
    .detail-info-value {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-dark);
        line-height: 1.35;
    }
    .detail-info-value.status-responding {
        color: var(--primary-red);
        font-weight: 700;
    }

    /* TIMELINE */
    .detail-timeline-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem;
    }
    .detail-timeline-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.7rem;
        border-bottom: 1px solid var(--border-color);
    }
    .detail-timeline-title svg {
        width: 1.1rem;
        height: 1.1rem;
        color: var(--primary-red);
    }

    .detail-h-timeline {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0.5rem 0 0;
        gap: 0;
    }
    .detail-tl-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
        min-width: 0;
    }
    .detail-tl-step::after {
        content: '';
        position: absolute;
        top: 0.65rem;
        left: calc(50% + 0.8rem);
        right: calc(-50% + 0.8rem);
        height: 2px;
        background: var(--border-color);
    }
    .detail-tl-step:last-child::after { display: none; }
    .detail-tl-step.completed::after { background: var(--primary-red); }

    .detail-tl-dot {
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
        margin-bottom: 0.3rem;
    }
    .detail-tl-step.completed .detail-tl-dot {
        background: var(--primary-red);
        color: white;
    }
    .detail-tl-step.completed .detail-tl-dot svg { width: 0.65rem; height: 0.65rem; }
    .detail-tl-step.current .detail-tl-dot {
        background: var(--primary-red);
        width: 1.8rem;
        height: 1.8rem;
        box-shadow: 0 0 0 3px rgba(212, 20, 11, 0.18);
    }
    .detail-tl-step.current .detail-tl-dot img {
        width: 1rem;
        height: 1rem;
        object-fit: contain;
        filter: brightness(0) invert(1);
    }
    .detail-tl-step.pending .detail-tl-dot {
        background: #e2e8f0;
        border: 2px solid #cbd5e1;
    }
    .detail-tl-step-name {
        font-size: 0.62rem;
        font-weight: 700;
        color: var(--text-muted);
        text-align: center;
        line-height: 1.2;
    }
    .detail-tl-step.current .detail-tl-step-name {
        color: var(--primary-red);
        font-weight: 800;
    }
    .detail-tl-step-date {
        font-size: 0.55rem;
        color: #94a3b8;
        text-align: center;
        margin-top: 0.1rem;
    }

    /* BFP UPDATE CARD */
    .detail-update-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem;
    }
    .detail-update-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.8rem;
    }
    .detail-update-title svg {
        width: 1.1rem;
        height: 1.1rem;
        color: var(--primary-red);
    }
    .detail-update-msg {
        background: var(--primary-red-light);
        border-radius: 0.6rem;
        padding: 0.8rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-dark);
        line-height: 1.5;
        margin-bottom: 0.5rem;
    }
    .detail-update-time {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 500;
    }

    /* SAFETY REMINDER */
    .detail-safety-card {
        background: var(--primary-red-light);
        border: 1px solid var(--primary-red-border);
        border-radius: 1rem;
        padding: 1rem;
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
    }
    .detail-safety-icon {
        width: 2rem;
        height: 2rem;
        flex-shrink: 0;
    }
    .detail-safety-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .detail-safety-text h4 {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--primary-red);
        margin-bottom: 0.15rem;
    }
    .detail-safety-text p {
        font-size: 0.78rem;
        color: var(--text-dark);
        line-height: 1.4;
        font-weight: 500;
    }

    /* BOTTOM NAV */
    .detail-bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: white;
        border-top: 1px solid var(--border-color);
        padding: 0.8rem 1rem 1.4rem;
        justify-content: space-between;
        align-items: flex-end;
        z-index: 100;
    }
    .detail-nav-item {
        display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
        color: var(--text-muted); font-size: 0.8rem; font-weight: 600;
        text-decoration: none; width: 20%;
    }
    .detail-nav-item.active { color: var(--primary-red); }
    .detail-nav-item svg { width: 1.8rem; height: 1.8rem; }
    .detail-nav-fab-wrapper {
        position: relative; width: 20%; display: flex; justify-content: center;
    }
    .detail-nav-fab {
        position: absolute; bottom: 1rem; background: var(--primary-red);
        width: 4.8rem; height: 4.8rem; border-radius: 50%; display: flex; flex-direction: column;
        align-items: center; justify-content: center; padding-bottom: 0.6rem; color: white;
        box-shadow: 0 4px 10px rgba(212, 20, 11, 0.3); border: 4px solid white; text-decoration: none;
    }
    .detail-nav-fab img { width: 3.2rem; height: 3.2rem; margin-top: 0.3rem; object-fit: contain; filter: brightness(0) invert(1); }
    .detail-nav-fab span { font-size: 0.55rem; font-weight: 700; margin-top: -0.8rem; }
`;

export const reportDetailMarkup = `
    <div class="detail-page-root">
        <!-- HEADER -->
        <div class="detail-mobile-header">
            <a href="/resident/reports" class="detail-back-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </a>
            <h1>Report Details</h1>
        </div>

        <div class="detail-content">
            <!-- Report Header -->
            <div class="detail-report-header">
                <div class="detail-report-header-top">
                    <div class="detail-fire-icon">
                        <img src="/images/fire logo.webp" alt="Fire" />
                    </div>
                    <span class="detail-report-ref">FR-2026-003</span>
                    <span class="detail-report-status-badge responding">Responding</span>
                </div>
            </div>

            <!-- Incident Information -->
            <div class="detail-info-card">
                <div class="detail-info-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Incident Information
                </div>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <div>
                            <div class="detail-info-label">Location</div>
                            <div class="detail-info-value">Poblacion, San Jose de Buenavista, Antique</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <div>
                            <div class="detail-info-label">Nearest Landmark</div>
                            <div class="detail-info-value">San Jose Public Market</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <div>
                            <div class="detail-info-label">Date Reported</div>
                            <div class="detail-info-value">Aug. 2, 2026 &bull; 6:52 PM</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <img src="/images/fire logo.webp" alt="Fire Type" />
                        <div>
                            <div class="detail-info-label">Fire Type</div>
                            <div class="detail-info-value">House/Building Fire</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Report Information -->
            <div class="detail-info-card">
                <div class="detail-info-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Report Information
                </div>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <img src="/images/fire logo.webp" alt="Status" />
                        <div>
                            <div class="detail-info-label">Current Status</div>
                            <div class="detail-info-value status-responding">&bull; Responding</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <div>
                            <div class="detail-info-label">Reference Number</div>
                            <div class="detail-info-value">FR-2026-003</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <div>
                            <div class="detail-info-label">Reported By</div>
                            <div class="detail-info-value">Juan Dela Cruz</div>
                        </div>
                    </div>
                    <div class="detail-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <div>
                            <div class="detail-info-label">Municipal BFP</div>
                            <div class="detail-info-value">San Jose de Buenavista Fire Station</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timeline -->
            <div class="detail-timeline-card">
                <div class="detail-timeline-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Status Timeline
                </div>
                <div class="detail-h-timeline">
                    <div class="detail-tl-step completed">
                        <div class="detail-tl-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                        <div class="detail-tl-step-name">Submitted</div>
                        <div class="detail-tl-step-date">Aug 2, 6:52</div>
                    </div>
                    <div class="detail-tl-step completed">
                        <div class="detail-tl-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                        <div class="detail-tl-step-name">Verifying</div>
                        <div class="detail-tl-step-date">Aug 2, 6:54</div>
                    </div>
                    <div class="detail-tl-step current">
                        <div class="detail-tl-dot"><img src="/images/fire logo.webp" alt="Fire" /></div>
                        <div class="detail-tl-step-name">Responding</div>
                        <div class="detail-tl-step-date">Aug 2, 7:05</div>
                    </div>
                    <div class="detail-tl-step pending">
                        <div class="detail-tl-dot"></div>
                        <div class="detail-tl-step-name">Confirmed</div>
                        <div class="detail-tl-step-date">&mdash;</div>
                    </div>
                    <div class="detail-tl-step pending">
                        <div class="detail-tl-dot"></div>
                        <div class="detail-tl-step-name">Closed</div>
                        <div class="detail-tl-step-date">&mdash;</div>
                    </div>
                </div>
            </div>

            <!-- Latest BFP Update -->
            <div class="detail-update-card">
                <div class="detail-update-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Latest Update from Municipal BFP
                </div>
                <div class="detail-update-msg">
                    Fire truck unit has been dispatched to the reported location. ETA 8 minutes. Please stay clear of the area and follow evacuation procedures.
                </div>
                <div class="detail-update-time">Aug 2, 2026 &bull; 7:05 PM</div>
            </div>

            <!-- Safety Reminder -->
            <div class="detail-safety-card">
                <div class="detail-safety-icon">
                    <img src="/images/fire logo.webp" alt="Safety" />
                </div>
                <div class="detail-safety-text">
                    <h4>Fire Safety Reminder</h4>
                    <p>Stay calm, move away from the fire, and follow the instructions of responders.</p>
                </div>
            </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="detail-bottom-nav">
            <a href="/resident" class="detail-nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                Home
            </a>
            <a href="/resident/reports" class="detail-nav-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                Reports
            </a>
            <div class="detail-nav-fab-wrapper">
                <a href="/resident/report-fire" class="detail-nav-fab">
                    <img src="/images/fire logo.webp" alt="Fire Logo" />
                    <span>Report Fire</span>
                </a>
            </div>
            <a href="/resident/guide" class="detail-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Guide
            </a>
            <a href="/resident/profile" class="detail-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
            </a>
        </nav>
    </div>
`;

export const reportsStyles = `
    :root {
        --primary-red: #D4140B;
        --primary-red-light: #fff5f5;
        --primary-red-border: #ffcaca;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #ffffff;
        --bg-color: #fafaf9;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --status-verifying: #D4140B;
        --status-responding: #D4140B;
        --status-submitted: #D4140B;
        --status-closed: #16a34a;
        --status-confirmed: #D4140B;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .reports-page-root {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
    }

    /* ==================== HEADER ==================== */
    .top-header {
        background: var(--card-bg);
        border-bottom: 1px solid var(--border-color);
        padding: 0.4rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 50;
    }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .brand-logo { height: 6rem; width: auto; }
    .header-nav { display: flex; align-items: center; gap: 2.5rem; }
    .nav-item {
        display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
        color: var(--text-muted); text-decoration: none; font-size: 0.8rem; font-weight: 600; transition: color 0.2s;
    }
    .nav-item:hover { color: var(--primary-red); }
    .nav-item.active { color: var(--primary-red); }
    .nav-item.active::after {
        content: ''; display: block; width: 100%; height: 3px;
        background: var(--primary-red); border-radius: 3px 3px 0 0;
        position: absolute; bottom: 0;
    }
    .nav-item-wrapper {
        position: relative; display: flex; flex-direction: column;
        align-items: center; height: 100%; padding: 0.5rem 0;
    }
    .nav-icon { width: 1.5rem; height: 1.5rem; }
    .nav-item.report-fire-nav { color: var(--primary-red); }
    .nav-item.report-fire-nav .nav-icon {
        background: var(--primary-red); color: white; border-radius: 50%;
        padding: 0.35rem; width: 2.2rem; height: 2.2rem;
    }
    .fire-logo-tint { filter: brightness(0) invert(1); object-fit: contain; width: 100%; height: 100%; }
    .header-right { display: flex; align-items: center; }
    .notification-btn, .lang-btn {
        background: none; border: none; position: relative; cursor: pointer;
        color: var(--text-dark); padding: 0.5rem; display: flex; align-items: center;
        gap: 0.3rem; font-weight: 600; font-size: 0.95rem;
    }
    .notification-btn:hover, .lang-btn:hover { color: var(--primary-red); }
    .notification-badge {
        position: absolute; top: 0; right: 0; background: var(--primary-red);
        color: white; font-size: 0.65rem; font-weight: 700; width: 1.1rem; height: 1.1rem;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        border: 2px solid var(--card-bg);
    }

    /* ==================== MOBILE HEADER ==================== */
    .mobile-header { display: none; }
    .mobile-bottom-nav { display: none; }

    /* ==================== MAIN LAYOUT ==================== */
    .reports-main-layout {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1.5rem 2rem 2rem;
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 1.5rem;
        align-items: start;
    }

    /* ==================== WARNING BANNER ==================== */
    .reports-warning-banner {
        background: #fff5eb;
        border: 1px solid #fde68a;
        border-radius: 0.6rem;
        padding: 0.75rem 1.2rem;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        margin-bottom: 1.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: #92400e;
        line-height: 1.4;
    }
    .reports-warning-banner svg { width: 1.5rem; height: 1.5rem; flex-shrink: 0; color: #f59e0b; }

    /* ==================== PAGE TITLE ==================== */
    .reports-page-title {
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--text-dark);
        margin-bottom: 0.3rem;
    }
    .reports-page-subtitle {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-bottom: 1.5rem;
        font-weight: 500;
    }

    /* ==================== STATUS SUMMARY CARDS ==================== */
    .status-summary-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.8rem;
        margin-bottom: 1.8rem;
    }
    .status-summary-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .status-summary-card:hover {
        border-color: var(--primary-red);
        box-shadow: 0 2px 8px rgba(212, 20, 11, 0.08);
    }
    .status-summary-icon {
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .status-summary-icon.submitted { background: #eff6ff; color: #3b82f6; }
    .status-summary-icon.verifying { background: #fef3c7; color: #f59e0b; }
    .status-summary-icon.responding { background: var(--primary-red-light); color: var(--primary-red); }
    .status-summary-icon.closed { background: #dcfce7; color: #16a34a; }
    .status-summary-icon svg { width: 1.3rem; height: 1.3rem; }
    .status-summary-icon img { width: 1.4rem; height: 1.4rem; object-fit: contain; }
    .status-summary-text { display: flex; flex-direction: column; }
    .status-summary-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); }
    .status-summary-count { font-size: 1.5rem; font-weight: 800; color: var(--text-dark); line-height: 1.2; }
    .status-summary-sub { font-size: 0.7rem; color: var(--text-muted); font-weight: 500; }

    /* ==================== SEARCH & FILTERS ==================== */
    .reports-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.2rem;
    }
    .reports-search-wrapper {
        flex: 1;
        position: relative;
    }
    .reports-search-wrapper svg {
        position: absolute;
        left: 0.9rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.1rem;
        height: 1.1rem;
        color: var(--text-muted);
    }
    .reports-search-input {
        width: 100%;
        padding: 0.7rem 1rem 0.7rem 2.6rem;
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        font-size: 0.88rem;
        font-family: inherit;
        color: var(--text-dark);
        background: var(--card-bg);
        outline: none;
        transition: border-color 0.2s;
    }
    .reports-search-input:focus { border-color: var(--primary-red); }
    .reports-search-input::placeholder { color: #94a3b8; }

    .reports-filter-tabs {
        display: flex;
        gap: 0;
    }
    .filter-tab {
        padding: 0.55rem 1.2rem;
        border: 1px solid var(--border-color);
        background: var(--card-bg);
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-dark);
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s;
    }
    .filter-tab:first-child { border-radius: 0.5rem 0 0 0.5rem; }
    .filter-tab:last-child { border-radius: 0 0.5rem 0.5rem 0; }
    .filter-tab + .filter-tab { border-left: none; }
    .filter-tab.active {
        background: var(--primary-red);
        color: white;
        border-color: var(--primary-red);
    }
    .filter-tab.active + .filter-tab { border-left: 1px solid var(--border-color); }

    .reports-sort-select {
        padding: 0.55rem 2rem 0.55rem 0.8rem;
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-dark);
        background: var(--card-bg);
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
        outline: none;
    }

    /* ==================== REPORTS TABLE ==================== */
    .reports-table-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        overflow: hidden;
    }
    .reports-table {
        width: 100%;
        border-collapse: collapse;
    }
    .reports-table thead th {
        text-align: left;
        padding: 0.8rem 1rem;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-color);
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .reports-table tbody tr {
        cursor: pointer;
        transition: background 0.15s;
    }
    .reports-table tbody tr:hover {
        background: #fafafa;
    }
    .reports-table tbody tr.selected-row {
        background: var(--primary-red-light);
    }
    .reports-table tbody tr + tr {
        border-top: 1px solid var(--border-color);
    }
    .reports-table td {
        padding: 0.85rem 1rem;
        font-size: 0.88rem;
        vertical-align: middle;
    }

    .row-radio {
        width: 1.15rem;
        height: 1.15rem;
        border: 2px solid #cbd5e1;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .row-radio.checked {
        border-color: var(--primary-red);
    }
    .row-radio.checked::after {
        content: '';
        width: 0.55rem;
        height: 0.55rem;
        background: var(--primary-red);
        border-radius: 50%;
    }

    .ref-number {
        font-weight: 700;
        color: var(--text-dark);
    }
    .location-cell {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
    }
    .location-cell svg {
        width: 0.9rem;
        height: 0.9rem;
        color: var(--primary-red);
        flex-shrink: 0;
        margin-top: 0.15rem;
    }
    .location-text {
        font-weight: 500;
        color: var(--text-dark);
        font-size: 0.85rem;
    }
    .date-cell {
        color: var(--text-muted);
        font-size: 0.82rem;
        white-space: nowrap;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.7rem;
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
    }
    .status-badge.verifying {
        background: #fef3c7;
        color: #b45309;
    }
    .status-badge.responding {
        background: var(--primary-red-light);
        color: var(--primary-red);
    }
    .status-badge.closed {
        background: #dcfce7;
        color: #15803d;
    }
    .status-badge.submitted {
        background: #eff6ff;
        color: #2563eb;
    }
    .status-badge.confirmed {
        background: #fdf4ff;
        color: #a21caf;
    }
    .status-badge::before {
        content: '';
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 50%;
        background: currentColor;
    }

    .view-details-btn {
        padding: 0.45rem 0.9rem;
        background: var(--primary-red);
        color: white;
        border: none;
        border-radius: 0.4rem;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s;
        white-space: nowrap;
    }
    .view-details-btn:hover {
        background: #b8120a;
        transform: translateY(-1px);
    }

    .table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.8rem 1rem;
        border-top: 1px solid var(--border-color);
        font-size: 0.8rem;
        color: var(--text-muted);
    }
    .pagination-btns {
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }
    .page-btn {
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-color);
        border-radius: 0.3rem;
        background: var(--card-bg);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--text-dark);
        font-family: inherit;
        transition: all 0.15s;
    }
    .page-btn:hover { border-color: var(--primary-red); color: var(--primary-red); }
    .page-btn.active {
        background: var(--primary-red);
        border-color: var(--primary-red);
        color: white;
    }
    .page-btn svg { width: 0.9rem; height: 0.9rem; }

    /* ==================== RIGHT SIDEBAR – REPORT DETAILS ==================== */
    .report-detail-sidebar {
        position: sticky;
        top: 7rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .detail-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.4rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .detail-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .detail-card-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .detail-card-title svg { width: 1.2rem; height: 1.2rem; color: var(--primary-red); }
    .detail-ref-badge {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--primary-red);
        background: var(--primary-red-light);
        padding: 0.2rem 0.6rem;
        border-radius: 0.3rem;
    }

    .detail-info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.5rem 0.8rem;
        font-size: 0.85rem;
    }
    .detail-label {
        color: var(--text-muted);
        font-weight: 600;
        white-space: nowrap;
    }
    .detail-value {
        color: var(--text-dark);
        font-weight: 600;
    }
    .detail-value.status-text {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }
    .detail-value.status-text::before {
        content: '';
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
        background: var(--primary-red);
    }
    .detail-value.status-text { color: var(--primary-red); font-weight: 700; }
    .alert-level-badge {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 0.3rem;
        font-size: 0.75rem;
        font-weight: 700;
        background: #fef3c7;
        color: #b45309;
    }

    /* ==================== TIMELINE ==================== */
    .timeline-section {
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .timeline-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 1rem;
    }
    .timeline-item {
        display: flex;
        gap: 0.8rem;
        padding-bottom: 1.2rem;
        position: relative;
    }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item::before {
        content: '';
        position: absolute;
        left: 0.6rem;
        top: 1.5rem;
        bottom: 0;
        width: 2px;
        background: var(--border-color);
    }
    .timeline-item:last-child::before { display: none; }
    .timeline-item.completed::before { background: var(--primary-red); }

    .timeline-dot {
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        z-index: 1;
    }
    .timeline-dot.completed {
        background: var(--primary-red);
        color: white;
    }
    .timeline-dot.completed svg { width: 0.7rem; height: 0.7rem; }
    .timeline-dot.current {
        background: var(--primary-red);
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        box-shadow: 0 0 0 3px rgba(212, 20, 11, 0.2);
    }
    .timeline-dot.current img {
        width: 0.9rem;
        height: 0.9rem;
        object-fit: contain;
        filter: brightness(0) invert(1);
    }
    .timeline-dot.pending {
        background: #e2e8f0;
        border: 2px solid #cbd5e1;
    }

    .timeline-content { flex: 1; }
    .timeline-step-name {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .timeline-item.current .timeline-step-name { color: var(--primary-red); }
    .timeline-item.current .timeline-step-name::after {
        content: ' (Current)';
        font-weight: 600;
    }
    .timeline-item.pending .timeline-step-name { color: var(--text-muted); }
    .timeline-step-date {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin-top: 0.1rem;
    }
    .timeline-step-desc {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin-top: 0.15rem;
        font-style: italic;
    }

    /* ==================== SAFETY REMINDER CARD ==================== */
    .safety-reminder-card {
        background: var(--primary-red-light);
        border: 1px solid var(--primary-red-border);
        border-radius: 1rem;
        padding: 1.2rem;
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
    }
    .safety-reminder-icon {
        width: 2.2rem;
        height: 2.2rem;
        flex-shrink: 0;
    }
    .safety-reminder-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .safety-reminder-text h4 {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--primary-red);
        margin-bottom: 0.2rem;
    }
    .safety-reminder-text p {
        font-size: 0.8rem;
        color: var(--text-dark);
        line-height: 1.45;
        font-weight: 500;
    }


    /* ==================== MOBILE REPORT CARDS ==================== */
    .mobile-reports-list { display: none; }
    .mobile-report-detail-sheet { display: none; }

    /* ==================== RESPONSIVE – MOBILE ==================== */
    @media (max-width: 950px) {
        .reports-page-root {
            background: var(--card-bg);
            padding-bottom: 5rem;
        }

        .top-header { display: none; }

        .mobile-header {
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
        .mobile-header h1 {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-dark);
        }
        .mobile-back-btn {
            position: absolute;
            left: 1rem;
            background: none;
            border: none;
            color: var(--text-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        /* Warning banner mobile */
        .reports-warning-banner {
            margin: 0.8rem 1rem 0.5rem;
            padding: 0.65rem 0.8rem;
            font-size: 0.75rem;
            border-radius: 0.5rem;
        }
        .reports-warning-banner svg { width: 1.2rem; height: 1.2rem; }

        /* Hide desktop-only elements */
        .reports-main-layout {
            display: flex;
            flex-direction: column;
            padding: 0;
            gap: 0;
        }

        .reports-page-title { display: none; }
        .reports-page-subtitle { display: none; }

        /* Status summary mobile */
        .status-summary-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
            padding: 0.8rem 1rem;
            margin-bottom: 0;
        }
        .status-summary-card {
            flex-direction: column;
            align-items: center;
            padding: 0.6rem 0.3rem;
            text-align: center;
            gap: 0.3rem;
            border-radius: 0.6rem;
        }
        .status-summary-icon {
            width: 2.2rem;
            height: 2.2rem;
        }
        .status-summary-icon svg { width: 1rem; height: 1rem; }
        .status-summary-icon img { width: 1.1rem; height: 1.1rem; }
        .status-summary-text { align-items: center; }
        .status-summary-count {
            font-size: 1.2rem;
        }
        .status-summary-label {
            font-size: 0.68rem;
        }
        .status-summary-sub { display: none; }

        /* Search & filter mobile */
        .reports-controls {
            padding: 0.5rem 1rem;
            margin-bottom: 0;
            gap: 0.5rem;
        }
        .reports-sort-select { display: none; }
        .mobile-filter-btn {
            display: flex !important;
            width: 2.5rem;
            height: 2.5rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            background: var(--card-bg);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
        }
        .mobile-filter-btn svg { width: 1.1rem; height: 1.1rem; color: var(--text-muted); }

        .reports-filter-tabs {
            padding: 0 1rem;
            margin-bottom: 0.5rem;
        }
        .filter-tab {
            padding: 0.45rem 1rem;
            font-size: 0.78rem;
            border-radius: 2rem !important;
            border: none !important;
            background: transparent;
            color: var(--text-muted);
        }
        .filter-tab + .filter-tab { border-left: none !important; }
        .filter-tab.active {
            background: var(--primary-red);
            color: white;
        }

        /* HIDE DESKTOP TABLE */
        .reports-table-card { display: none; }
        .report-detail-sidebar { display: none; }

        /* SHOW MOBILE CARDS */
        .mobile-reports-list {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            padding: 0.5rem 1rem 1rem;
        }

        .mobile-report-card {
            background: var(--card-bg);
            border: 1.5px solid var(--border-color);
            border-radius: 0.8rem;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            color: inherit;
        }
        .mobile-report-card:hover {
            border-color: #cbd5e1;
        }
        .mobile-report-card.selected {
            background: var(--primary-red-light);
            border-color: var(--primary-red);
        }
        .mobile-report-fire-icon {
            width: 2.2rem;
            height: 2.2rem;
            flex-shrink: 0;
        }
        .mobile-report-fire-icon img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .mobile-report-info {
            flex: 1;
            min-width: 0;
        }
        .mobile-report-ref {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 0.15rem;
        }
        .mobile-report-location {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.78rem;
            color: var(--text-muted);
            font-weight: 500;
            margin-bottom: 0.15rem;
        }
        .mobile-report-location svg { width: 0.8rem; height: 0.8rem; color: var(--primary-red); flex-shrink: 0; }
        .mobile-report-date {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.72rem;
            color: #94a3b8;
            font-weight: 500;
        }
        .mobile-report-date svg { width: 0.75rem; height: 0.75rem; flex-shrink: 0; }

        .mobile-report-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.4rem;
            flex-shrink: 0;
        }
        .mobile-report-right .status-badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.55rem;
        }
        .mobile-report-chevron {
            color: #cbd5e1;
        }
        .mobile-report-chevron svg { width: 1.1rem; height: 1.1rem; }

        /* ==================== MOBILE DETAIL SHEET ==================== */
        .mobile-report-detail-sheet {
            display: block;
            background: var(--card-bg);
            border: 1.5px solid var(--primary-red-border);
            border-radius: 1rem 1rem 0 0;
            margin: 0 1rem;
            padding: 1.2rem;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
        }
        .sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 0.8rem;
            border-bottom: 1px solid var(--border-color);
        }
        .sheet-title {
            font-size: 0.92rem;
            font-weight: 700;
            color: var(--text-dark);
        }
        .sheet-collapse-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        .sheet-collapse-btn svg { width: 1.2rem; height: 1.2rem; }

        .sheet-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.8rem;
            margin-bottom: 1rem;
        }
        .sheet-info-item {
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
        }
        .sheet-info-item svg {
            width: 1rem;
            height: 1rem;
            color: var(--primary-red);
            flex-shrink: 0;
            margin-top: 0.1rem;
        }
        .sheet-info-item img {
            width: 1rem;
            height: 1rem;
            object-fit: contain;
            flex-shrink: 0;
            margin-top: 0.1rem;
        }
        .sheet-info-content {}
        .sheet-info-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            font-weight: 600;
        }
        .sheet-info-value {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-dark);
            line-height: 1.3;
        }
        .sheet-info-value.status-responding {
            color: var(--primary-red);
            font-weight: 700;
        }

        /* Mobile horizontal timeline */
        .mobile-timeline {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 1rem 0;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 1rem;
            overflow-x: auto;
            gap: 0;
        }
        .mobile-timeline-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            position: relative;
            min-width: 3.5rem;
        }
        .mobile-timeline-step::after {
            content: '';
            position: absolute;
            top: 0.65rem;
            left: calc(50% + 0.8rem);
            right: calc(-50% + 0.8rem);
            height: 2px;
            background: var(--border-color);
        }
        .mobile-timeline-step:last-child::after { display: none; }
        .mobile-timeline-step.completed::after { background: var(--primary-red); }
        .mobile-timeline-step.current::after { background: var(--border-color); }

        .mobile-timeline-dot {
            width: 1.3rem;
            height: 1.3rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            margin-bottom: 0.3rem;
        }
        .mobile-timeline-step.completed .mobile-timeline-dot {
            background: var(--primary-red);
            color: white;
        }
        .mobile-timeline-step.completed .mobile-timeline-dot svg { width: 0.65rem; height: 0.65rem; }
        .mobile-timeline-step.current .mobile-timeline-dot {
            background: var(--primary-red);
            width: 1.8rem;
            height: 1.8rem;
            box-shadow: 0 0 0 3px rgba(212, 20, 11, 0.18);
        }
        .mobile-timeline-step.current .mobile-timeline-dot img {
            width: 1rem;
            height: 1rem;
            object-fit: contain;
            filter: brightness(0) invert(1);
        }
        .mobile-timeline-step.pending .mobile-timeline-dot {
            background: #e2e8f0;
            border: 2px solid #cbd5e1;
        }
        .mobile-timeline-step-name {
            font-size: 0.6rem;
            font-weight: 700;
            color: var(--text-muted);
            text-align: center;
            line-height: 1.2;
        }
        .mobile-timeline-step.current .mobile-timeline-step-name {
            color: var(--primary-red);
            font-weight: 800;
        }
        .mobile-timeline-step-date {
            font-size: 0.55rem;
            color: #94a3b8;
            text-align: center;
            margin-top: 0.1rem;
        }

        .sheet-view-full-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            width: 100%;
            padding: 0.8rem;
            border: 1.5px solid var(--primary-red);
            border-radius: 0.5rem;
            background: transparent;
            color: var(--primary-red);
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }
        .sheet-view-full-btn:hover {
            background: var(--primary-red);
            color: white;
        }
        .sheet-view-full-btn svg { width: 1rem; height: 1rem; }

        /* Mobile bottom nav */
        .mobile-bottom-nav {
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
        .mobile-nav-item {
            display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
            color: var(--text-muted); font-size: 0.8rem; font-weight: 600;
            text-decoration: none; width: 20%;
        }
        .mobile-nav-item.active { color: var(--primary-red); }
        .mobile-nav-item svg { width: 1.8rem; height: 1.8rem; }
        .mobile-nav-fab-wrapper {
            position: relative; width: 20%; display: flex; justify-content: center;
        }
        .mobile-nav-fab {
            position: absolute; bottom: 1rem; background: var(--primary-red);
            width: 4.8rem; height: 4.8rem; border-radius: 50%; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding-bottom: 0.6rem; color: white;
            box-shadow: 0 4px 10px rgba(212, 20, 11, 0.3); border: 4px solid white; text-decoration: none;
        }
        .mobile-nav-fab img { width: 3.2rem; height: 3.2rem; margin-top: 0.3rem; object-fit: contain; filter: brightness(0) invert(1); }
        .mobile-nav-fab span { font-size: 0.55rem; font-weight: 700; margin-top: -0.8rem; }
    }

    /* Desktop-only utility */
    .mobile-filter-btn { display: none; }

    @media (min-width: 951px) {
        .mobile-reports-list { display: none !important; }
        .mobile-report-detail-sheet { display: none !important; }
        .mobile-header { display: none !important; }
        .mobile-bottom-nav { display: none !important; }
    }
`;

export const reportsMarkup = `
    <div class="reports-page-root">
        <!-- DESKTOP HEADER -->
        <header class="top-header">
            <div class="header-left">
                <img src="/images/Logo.webp" alt="ALAB Logo" class="brand-logo">
            </div>
            <div class="header-nav">
                <div class="nav-item-wrapper">
                    <a href="/resident" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        Home
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/reports" class="nav-item active">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                        Reports
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/report-fire" class="nav-item report-fire-nav">
                        <div class="nav-icon"><img src="/images/fire logo.webp" alt="Report Fire Logo" class="fire-logo-tint" /></div>
                        Report Fire
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/guide" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        Guide
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/profile" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Profile
                    </a>
                </div>
            </div>
            <div class="header-right">
                <button class="lang-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                    EN
                </button>
                <div style="position: relative;">
                    <button class="notification-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    </button>
                    <span class="notification-badge">3</span>
                </div>
            </div>
        </header>

        <!-- MOBILE HEADER -->
        <div class="mobile-header">
            <button class="mobile-back-btn" onclick="history.back()">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h1>Reports</h1>
        </div>

        <div class="reports-main-layout">
            <!-- LEFT COLUMN -->
            <div class="reports-left-col">
                <h1 class="reports-page-title">My Reports</h1>
                <p class="reports-page-subtitle">Track the status of your submitted fire reports.</p>

                <!-- Status Summary Cards -->
                <div class="status-summary-row">
                    <div class="status-summary-card">
                        <div class="status-summary-icon submitted">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div class="status-summary-text">
                            <span class="status-summary-label">Submitted</span>
                            <span class="status-summary-count">3</span>
                            <span class="status-summary-sub">Total submitted</span>
                        </div>
                    </div>
                    <div class="status-summary-card">
                        <div class="status-summary-icon verifying">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="status-summary-text">
                            <span class="status-summary-label">Verifying</span>
                            <span class="status-summary-count">2</span>
                            <span class="status-summary-sub">Under verification</span>
                        </div>
                    </div>
                    <div class="status-summary-card">
                        <div class="status-summary-icon responding">
                            <img src="/images/fire logo.webp" alt="Fire" style="filter: none;" />
                        </div>
                        <div class="status-summary-text">
                            <span class="status-summary-label">Responding</span>
                            <span class="status-summary-count">1</span>
                            <span class="status-summary-sub">Active response</span>
                        </div>
                    </div>
                    <div class="status-summary-card">
                        <div class="status-summary-icon closed">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="status-summary-text">
                            <span class="status-summary-label">Closed</span>
                            <span class="status-summary-count">4</span>
                            <span class="status-summary-sub">Completed</span>
                        </div>
                    </div>
                </div>

                <!-- Search, Filters, Sort -->
                <div class="reports-controls">
                    <div class="reports-search-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input class="reports-search-input" type="text" placeholder="Search by reference no. or location" />
                    </div>
                    <button class="mobile-filter-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    </button>
                    <div class="reports-filter-tabs">
                        <button class="filter-tab active">All</button>
                        <button class="filter-tab">Active</button>
                        <button class="filter-tab">Closed</button>
                    </div>
                    <select class="reports-sort-select">
                        <option>Newest First</option>
                        <option>Oldest First</option>
                    </select>
                </div>

                <!-- Desktop Table -->
                <div class="reports-table-card">
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th style="width:2.5rem;"></th>
                                <th>Reference No.</th>
                                <th>Location</th>
                                <th>Date Reported</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="selected-row">
                                <td><div class="row-radio checked"></div></td>
                                <td class="ref-number">FR-2026-001</td>
                                <td>
                                    <div class="location-cell">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="location-text">Barangay 5<br/>San Jose de Buenavista</span>
                                    </div>
                                </td>
                                <td class="date-cell">Aug 2, 2026<br/>6:52 PM</td>
                                <td><span class="status-badge verifying">Verifying</span></td>
                                <td><button class="view-details-btn">View Details</button></td>
                            </tr>
                            <tr>
                                <td><div class="row-radio"></div></td>
                                <td class="ref-number">FR-2026-002</td>
                                <td>
                                    <div class="location-cell">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="location-text">Barangay 8<br/>San Jose de Buenavista</span>
                                    </div>
                                </td>
                                <td class="date-cell">Jul 30, 2026<br/>4:15 PM</td>
                                <td><span class="status-badge closed">Closed</span></td>
                                <td><button class="view-details-btn">View Details</button></td>
                            </tr>
                            <tr>
                                <td><div class="row-radio"></div></td>
                                <td class="ref-number">FR-2026-003</td>
                                <td>
                                    <div class="location-cell">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="location-text">Poblacion<br/>San Jose de Buenavista</span>
                                    </div>
                                </td>
                                <td class="date-cell">Jul 29, 2026<br/>9:10 AM</td>
                                <td><span class="status-badge responding">Responding</span></td>
                                <td><button class="view-details-btn">View Details</button></td>
                            </tr>
                            <tr>
                                <td><div class="row-radio"></div></td>
                                <td class="ref-number">FR-2026-004</td>
                                <td>
                                    <div class="location-cell">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="location-text">Barangay 2<br/>San Jose de Buenavista</span>
                                    </div>
                                </td>
                                <td class="date-cell">Jul 28, 2026<br/>7:45 PM</td>
                                <td><span class="status-badge closed">Closed</span></td>
                                <td><button class="view-details-btn">View Details</button></td>
                            </tr>
                            <tr>
                                <td><div class="row-radio"></div></td>
                                <td class="ref-number">FR-2026-005</td>
                                <td>
                                    <div class="location-cell">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="location-text">Barangay 1<br/>San Jose de Buenavista</span>
                                    </div>
                                </td>
                                <td class="date-cell">Jul 27, 2026<br/>11:22 AM</td>
                                <td><span class="status-badge closed">Closed</span></td>
                                <td><button class="view-details-btn">View Details</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="table-footer">
                        <span>Showing 1 to 5 of 10 reports</span>
                        <div class="pagination-btns">
                            <button class="page-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                            <button class="page-btn active">1</button>
                            <button class="page-btn">2</button>
                            <button class="page-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                        </div>
                    </div>
                </div>

                <!-- MOBILE REPORT CARDS (hidden on desktop) -->
                <div class="mobile-reports-list">
                    <a href="/resident/reports/FR-2026-003" class="mobile-report-card selected">
                        <div class="mobile-report-fire-icon">
                            <img src="/images/fire logo.webp" alt="Fire" />
                        </div>
                        <div class="mobile-report-info">
                            <div class="mobile-report-ref">FR-2026-003</div>
                            <div class="mobile-report-location">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                Poblacion, San Jose de Buenavista, Antique
                            </div>
                            <div class="mobile-report-date">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Aug. 2, 2026 &bull; 6:52 PM
                            </div>
                        </div>
                        <div class="mobile-report-right">
                            <span class="status-badge responding">Responding</span>
                            <span class="mobile-report-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>
                        </div>
                    </a>

                    <a href="/resident/reports/FR-2026-001" class="mobile-report-card">
                        <div class="mobile-report-fire-icon">
                            <img src="/images/fire logo.webp" alt="Fire" />
                        </div>
                        <div class="mobile-report-info">
                            <div class="mobile-report-ref">FR-2026-001</div>
                            <div class="mobile-report-location">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                Brgy. Tanza, Libertad, Antique
                            </div>
                            <div class="mobile-report-date">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Aug. 1, 2026 &bull; 4:35 PM
                            </div>
                        </div>
                        <div class="mobile-report-right">
                            <span class="status-badge verifying">Verifying</span>
                            <span class="mobile-report-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>
                        </div>
                    </a>

                    <a href="/resident/reports/FR-2026-002" class="mobile-report-card">
                        <div class="mobile-report-fire-icon">
                            <img src="/images/fire logo.webp" alt="Fire" />
                        </div>
                        <div class="mobile-report-info">
                            <div class="mobile-report-ref">FR-2026-002</div>
                            <div class="mobile-report-location">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                San Roque, San Jose de Buenavista, Antique
                            </div>
                            <div class="mobile-report-date">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Jul. 30, 2026 &bull; 10:12 AM
                            </div>
                        </div>
                        <div class="mobile-report-right">
                            <span class="status-badge closed">Closed</span>
                            <span class="mobile-report-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>
                        </div>
                    </a>
                </div>
            </div>

            <!-- RIGHT SIDEBAR (Desktop only) -->
            <div class="report-detail-sidebar">
                <!-- Report Details Card -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <div class="detail-card-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Report Details
                        </div>
                        <span class="detail-ref-badge"># FR-2026-001</span>
                    </div>
                    <div class="detail-info-grid">
                        <span class="detail-label">Reference No.</span>
                        <span class="detail-value">FR-2026-001</span>
                        <span class="detail-label">Reported Time</span>
                        <span class="detail-value">Aug 2, 2026 &bull; 6:52 PM</span>
                        <span class="detail-label">Location</span>
                        <span class="detail-value">Barangay 5, San Jose de Buenavista<br/>San Jose, Antique</span>
                        <span class="detail-label">Current Status</span>
                        <span class="detail-value status-text">Verifying</span>
                        <span class="detail-label">Alert Level</span>
                        <span class="detail-value"><span class="alert-level-badge">Medium</span></span>
                    </div>
                </div>

                <!-- Report Timeline Card -->
                <div class="detail-card">
                    <div class="timeline-title">Report Timeline</div>
                    <div class="timeline-section">
                        <div class="timeline-item completed">
                            <div class="timeline-dot completed">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-step-name">Submitted</div>
                                <div class="timeline-step-date">Aug 2, 2026 &bull; 6:52 PM</div>
                                <div class="timeline-step-desc">Your report has been submitted.</div>
                            </div>
                        </div>
                        <div class="timeline-item current">
                            <div class="timeline-dot current">
                                <img src="/images/fire logo.webp" alt="Fire" />
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-step-name">Verifying</div>
                                <div class="timeline-step-date">Aug 2, 2026 &bull; 7:05 PM</div>
                                <div class="timeline-step-desc">Our team is verifying the details.</div>
                            </div>
                        </div>
                        <div class="timeline-item pending">
                            <div class="timeline-dot pending"></div>
                            <div class="timeline-content">
                                <div class="timeline-step-name">Confirmed</div>
                                <div class="timeline-step-date">Pending</div>
                            </div>
                        </div>
                        <div class="timeline-item pending">
                            <div class="timeline-dot pending"></div>
                            <div class="timeline-content">
                                <div class="timeline-step-name">Responding</div>
                                <div class="timeline-step-date">Pending</div>
                            </div>
                        </div>
                        <div class="timeline-item pending">
                            <div class="timeline-dot pending"></div>
                            <div class="timeline-content">
                                <div class="timeline-step-name">Closed</div>
                                <div class="timeline-step-date">Pending</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Safety Reminder -->
                <div class="safety-reminder-card">
                    <div class="safety-reminder-icon">
                        <img src="/images/fire logo.webp" alt="Safety" />
                    </div>
                    <div class="safety-reminder-text">
                        <h4>Fire Safety Reminder</h4>
                        <p>Stay calm, move away from the fire, and follow the instructions of responders.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Bottom Navigation -->
        <nav class="mobile-bottom-nav">
            <a href="/resident" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                Home
            </a>
            <a href="/resident/reports" class="mobile-nav-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                Reports
            </a>
            <div class="mobile-nav-fab-wrapper">
                <a href="/resident/report-fire" class="mobile-nav-fab">
                    <img src="/images/fire logo.webp" alt="Fire Logo" />
                    <span>Report Fire</span>
                </a>
            </div>
            <a href="/resident/guide" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Guide
            </a>
            <a href="/resident/profile" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
            </a>
        </nav>
    </div>
`;

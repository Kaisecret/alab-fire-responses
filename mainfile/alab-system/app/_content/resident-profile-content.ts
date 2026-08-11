export const profileStyles = `
    :root {
        --primary-red: #D4140B;
        --primary-red-light: #fef2f2;
        --primary-red-border: #fca5a5;
        --success-green: #16a34a;
        --success-green-light: #f0fdf4;
        --warning-orange: #f59e0b;
        --warning-orange-light: #fff7ed;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #ffffff;
        --bg-color: #fafaf9;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .profile-page-root {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
        padding-bottom: 2rem;
    }


    /* ==================== UTILITIES ==================== */
    .desktop-only { display: block; }
    .mobile-only { display: none; }

    /* ==================== PAGE LAYOUT ==================== */
    .profile-main-layout {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem 2rem 2rem;
    }

    /* ==================== PROFILE HEADER CARD ==================== */
    .profile-header-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1.2rem;
        padding: 1.2rem 2rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
    }
    /* Decorative faint red background */
    .profile-header-card::before {
        content: '';
        position: absolute;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        width: 280px;
        height: 280px;
        background-image: url('/images/fire logo.webp');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: right center;
        opacity: 0.05;
        z-index: 0;
        pointer-events: none;
    }
    
    .profile-avatar-container {
        position: relative;
        z-index: 1;
        flex-shrink: 0;
    }
    .profile-avatar {
        width: 6rem;
        height: 6rem;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid white;
        box-shadow: var(--shadow-sm);
        background: #e2e8f0;
    }
    .profile-camera-btn {
        position: absolute;
        bottom: 0.2rem;
        right: 0.2rem;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--shadow-md);
        color: var(--text-dark);
        transition: color 0.2s;
    }
    .profile-camera-btn:hover { color: var(--primary-red); }
    .profile-camera-btn svg { width: 1.1rem; height: 1.1rem; }
    
    .profile-header-info {
        flex: 1;
        z-index: 1;
    }
    .profile-name-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.3rem;
    }
    .profile-name-row h2 {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text-dark);
    }
    .verified-icon-blue { color: #3b82f6; width: 1.2rem; height: 1.2rem; }
    
    .profile-verified-status {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--success-green);
        font-weight: 700;
        font-size: 0.9rem;
        margin-bottom: 0.8rem;
    }
    .profile-verified-status svg { width: 1rem; height: 1rem; }
    
    .profile-location-row {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 0.5rem;
    }
    .profile-location-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-dark);
        font-size: 0.85rem;
        font-weight: 600;
    }
    .profile-location-item svg { width: 1.1rem; height: 1.1rem; color: var(--primary-red); }
    
    .profile-subtitle {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 1rem;
    }

    .profile-header-actions {
        z-index: 1;
        align-self: flex-start;
    }
    .profile-quick-menu {
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        padding: 0.5rem 0;
        box-shadow: var(--shadow-sm);
        min-width: 220px;
    }
    .quick-menu-item {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.7rem 1.2rem;
        color: var(--text-dark);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
        transition: background 0.2s;
    }
    .quick-menu-item:hover { background: var(--bg-color); }
    .quick-menu-item svg { width: 1.1rem; height: 1.1rem; color: var(--text-muted); }
    .quick-menu-divider {
        height: 1px;
        background: var(--border-color);
        margin: 0.4rem 0;
    }
    .logout-text { color: var(--primary-red); }
    .logout-text svg { color: var(--primary-red); }
    .settings-logout-form { margin: 0; }
    .settings-logout-button {
        width: 100%; border: 0; background: transparent; cursor: pointer;
        font-family: inherit; text-align: left;
    }

    /* ==================== MAIN CONTENT GRID ==================== */
    .profile-content-grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr;
        gap: 1.5rem;
        align-items: start;
    }

    .profile-col-left { display: flex; flex-direction: column; gap: 1.5rem; }
    .profile-col-mid { display: flex; flex-direction: column; gap: 1.5rem; }
    .profile-col-right { display: flex; flex-direction: column; gap: 1.5rem; }

    /* PROFILE CARDS */
    .profile-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1.2rem;
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
    }
    .profile-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    .profile-card-header.no-border {
        border-bottom: none;
        padding-bottom: 0;
    }
    .profile-card-title {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .profile-card-title svg {
        width: 1.2rem;
        height: 1.2rem;
        color: var(--primary-red);
    }

    /* BUTTONS */
    .btn-outline {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.8rem;
        border: 1px solid var(--primary-red-border);
        color: var(--primary-red);
        background: var(--primary-red-light);
        border-radius: 0.4rem;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-outline:hover { background: var(--primary-red); color: white; }
    .btn-outline svg { width: 1rem; height: 1rem; }
    
    .btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.8rem 1.5rem;
        background: var(--primary-red);
        color: white;
        border: none;
        border-radius: 0.6rem;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-primary:hover { background: #b91008; }
    .btn-primary svg { width: 1.1rem; height: 1.1rem; }
    .w-full { width: 100%; }

    /* PERSONAL INFO LIST */
    .profile-info-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .info-list-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.8rem 0;
    }
    .info-list-label {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.85rem;
        color: var(--text-muted);
        font-weight: 600;
        width: 40%;
    }
    .info-list-label svg { width: 1.1rem; height: 1.1rem; }
    .info-list-value {
        font-size: 0.9rem;
        color: var(--text-dark);
        font-weight: 600;
        text-align: right;
        flex: 1;
    }
    .badge-verified {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: var(--success-green-light);
        color: var(--success-green);
        padding: 0.3rem 0.6rem;
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: 700;
    }
    .badge-verified svg { width: 0.9rem; height: 0.9rem; }
    
    .profile-card-footer {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }
    .footer-note {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .footer-note svg { width: 0.9rem; height: 0.9rem; }

    /* SETTINGS LIST (Security & Mobile Settings) */
    .settings-list {
        display: flex;
        flex-direction: column;
    }
    .settings-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 0;
        color: var(--text-dark);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
        border-bottom: 1px solid var(--border-color);
        transition: color 0.2s;
    }
    .settings-item:last-child { border-bottom: none; }
    .settings-item:hover { color: var(--primary-red); }
    .settings-item svg { width: 1.1rem; height: 1.1rem; color: #94a3b8; }
    .settings-item-left {
        display: flex;
        align-items: center;
        gap: 0.8rem;
    }

    /* PREFERENCES LIST (Toggles) */
    .preferences-list {
        display: flex;
        flex-direction: column;
    }
    .pref-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    .pref-item:last-child { border-bottom: none; }
    .pref-text h4 {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-dark);
        margin-bottom: 0.2rem;
    }
    .pref-text p {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .pref-toggle {
        width: 2.8rem;
        height: 1.5rem;
        background: var(--border-color);
        border-radius: 1rem;
        position: relative;
        cursor: pointer;
        transition: background 0.3s;
    }
    .pref-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(1.5rem - 4px);
        height: calc(1.5rem - 4px);
        background: white;
        border-radius: 50%;
        transition: transform 0.3s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .pref-toggle.active { background: var(--primary-red); }
    .pref-toggle.active::after { transform: translateX(1.3rem); }

    /* EMERGENCY CONTACTS */
    .emergency-list {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }
    .emergency-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .emergency-text h4 {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 0.2rem;
    }
    .emergency-text p {
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--primary-red);
    }
    .emergency-text .sub-text {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 500;
    }
    .btn-phone {
        width: 2.2rem;
        height: 2.2rem;
        background: var(--primary-red-light);
        color: var(--primary-red);
        border: none;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-phone:hover { background: var(--primary-red-border); }
    .btn-phone svg { width: 1rem; height: 1rem; }

    /* ACTIVITY SUMMARY */
    .activity-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-bottom: 1rem;
    }
    .activity-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.8rem 1rem;
        border-radius: 0.6rem;
        border: 1px solid var(--border-color);
        background: var(--bg-color);
    }
    .activity-item-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .activity-item-left svg { width: 1.1rem; height: 1.1rem; }
    .activity-item-count {
        font-size: 1rem;
        font-weight: 800;
        color: var(--text-dark);
    }
    .bg-red-light .activity-item-left svg { color: var(--primary-red); }
    .bg-orange-light .activity-item-left svg { color: var(--warning-orange); }
    .bg-green-light .activity-item-left svg { color: var(--success-green); }
    
    .view-all-link {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.4rem;
        color: var(--primary-red);
        font-size: 0.85rem;
        font-weight: 700;
        text-decoration: none;
    }
    .view-all-link svg { width: 1rem; height: 1rem; }

    /* ==================== MOBILE RESPONSIVE ==================== */
    /* Mobile nav */

    @media (max-width: 950px) {
        /* Hide desktop components */
        .desktop-only { display: none !important; }
        .mobile-only { display: block !important; }
        
        /* Layout Adjustments */
        .profile-main-layout {
            padding: 1rem 1rem 5rem; /* Padding to clear the bottom nav */
        }
        
        .profile-content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        /* Mobile Header Card */
        .profile-header-card {
            flex-direction: row;
            text-align: left;
            padding: 0.9rem 1rem;
            gap: 0.8rem;
            align-items: center;
        }
        .profile-header-card::before {
            width: 130px;
            height: 130px;
            right: -10px;
            opacity: 0.04;
        }
        .profile-avatar {
            width: 3.8rem !important;
            height: 3.8rem !important;
        }
        .profile-header-info {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            min-width: 0; /* allows text truncation if needed */
        }
        .profile-name-row h2 {
            font-size: 1.15rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0;
        }
        .profile-verified-status {
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
            margin-top: 0.1rem;
        }
        .profile-location-text {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.6rem !important;
            font-size: 0.78rem;
            color: var(--text-muted);
            line-height: 1.2;
            white-space: nowrap;
        }
        .profile-location-text span {
            display: flex;
            align-items: center;
            gap: 0.2rem;
        }
        .profile-location-text svg {
            width: 0.9rem; height: 0.9rem; color: var(--primary-red); margin-right: 0.1rem;
            vertical-align: middle;
        }
        
        /* Mobile List Styling overrides */
        .info-list-item {
            padding: 1rem 0;
            border-bottom: 1px solid var(--border-color);
        }
        .info-list-item:last-child { border-bottom: none; }
        .info-list-label { width: auto; color: var(--text-dark); }
        .info-list-label svg { color: var(--primary-red); }
        .info-list-value { color: var(--text-muted); font-size: 0.85rem; text-align: right; }
        .chevron-right { width: 1.2rem; height: 1.2rem; color: #cbd5e1; margin-left: 0.5rem; }

        .mobile-dashboard-row {
            display: flex !important;
            flex-direction: column;
            gap: 1rem;
            margin-top: 0.5rem;
        }
        
        .settings-menu-card {
            padding: 1.25rem 1.25rem !important;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-radius: 1.2rem !important;
        }
        .settings-item { padding: 0.85rem 0 !important; }
        .settings-item-left { font-size: 0.95rem !important; font-weight: 600 !important; gap: 0.75rem !important; }
        .settings-item-left svg { width: 1.25rem !important; height: 1.25rem !important; }
        .settings-item .chevron-right { width: 1.15rem !important; height: 1.15rem !important; }
        .settings-menu-card .profile-card-title { font-size: 1.15rem !important; font-weight: 800 !important; margin-bottom: 0.8rem !important; justify-content: flex-start; }

        /* Mobile Account Status */
        .mobile-account-status {
            text-align: center;
            padding: 1.25rem !important;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-radius: 1.2rem !important;
        }
        .mobile-account-status .profile-card-title { justify-content: center; margin-bottom: 0.8rem; font-size: 1.05rem !important; font-weight: 800 !important; }
        .status-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.3rem;
        }
        .badge-icon-square {
            width: 3.2rem;
            height: 3.2rem;
            background: var(--success-green-light);
            border-radius: 0.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--success-green);
            margin-bottom: 0.3rem;
        }
        .badge-icon-square svg { width: 1.8rem; height: 1.8rem; }
        .text-green { color: var(--success-green); font-size: 0.95rem; font-weight: 800; margin: 0; }
        .status-center p { font-size: 0.65rem; color: var(--text-muted); line-height: 1.2; margin: 0; }

        /* Mobile Activity Summary */
        .activity-summary-card { padding: 1.5rem; }
        .activity-row {
            display: flex !important; /* Override .mobile-only display:block */
            flex-direction: row;
            justify-content: space-between;
            gap: 0.4rem;
            width: 100%;
        }
        .activity-box {
            flex: 1;
            background: var(--bg-color);
            border: 1px solid #f1f5f9;
            border-radius: 0.8rem;
            padding: 1rem 0.3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .activity-icon-wrapper {
            width: 2.2rem;
            height: 2.2rem;
            border-radius: 0.6rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-bottom: 0.3rem;
        }
        .activity-icon-wrapper svg { width: 1.1rem; height: 1.1rem; }
        .activity-text-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .text-red { color: var(--primary-red); }
        .bg-red-light { background: var(--primary-red-light); }
        .text-orange { color: var(--warning-orange); }
        .bg-orange-light { background: rgba(245, 158, 11, 0.15); }
        .text-green { color: var(--success-green); }
        .bg-green-light { background: var(--success-green-light); }
        .activity-num { font-size: 0.95rem; font-weight: 800; color: var(--text-dark); line-height: 1; margin-bottom: 0.1rem; }
        .activity-label { font-size: 0.55rem; color: var(--text-muted); font-weight: 600; line-height: 1; }

        /* Mobile Fixed Bottom Nav & Button */
        .mobile-fixed-bottom {
            padding: 1rem 0;
            margin-top: 0.5rem;
        }
        .mobile-fixed-bottom button {
            pointer-events: auto;
        }
    }
`;

export const profileMarkup = `
    <div class="profile-page-root">

        <main class="profile-main-layout">
            <!-- HEADER SECTION -->
            <div class="profile-header-card">
                <div class="profile-avatar-container">
                    <img src="https://ui-avatars.com/api/?name=Resident&background=1e293b&color=fff&size=200" alt="Resident Profile" class="profile-avatar">
                    <button class="profile-camera-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                </div>
                <div class="profile-header-info">
                    <div class="profile-name-row">
                        <h2 data-profile-field="name">Loading profile…</h2>
                        <svg class="verified-icon-blue" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.1 14.2l-3.6-3.6 1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4-7.2 7.2z"/></svg>
                    </div>
                    <div class="profile-verified-status">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.1 14.2l-3.6-3.6 1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4-7.2 7.2z"/></svg>
                        <span>Verified Resident</span>
                    </div>
                    <div class="profile-location-row desktop-only">
                        <div class="profile-location-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>Municipality of <span data-profile-field="municipality">Loading…</span></span>
                        </div>
                        <div class="profile-location-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            <span>Barangay <span data-profile-field="barangay">Loading…</span></span>
                        </div>
                    </div>
                    <div class="profile-location-row desktop-only">
                        <div class="profile-location-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span data-profile-field="phone">Loading…</span>
                        </div>
                    </div>
                    <div class="profile-location-text mobile-only">
                        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <span data-profile-field="municipality">Loading…</span></span>
                        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> <span data-profile-field="barangay">Loading…</span></span>
                    </div>
                    <p class="profile-subtitle desktop-only">Manage your personal information and account settings.</p>
                </div>
                
                <div class="profile-header-actions desktop-only">
                    <!-- Removed duplicate profile quick menu since it's now in the global header -->
                </div>
                <div class="profile-header-actions mobile-only">
                     <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5rem; height:1.5rem;"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>

            <!-- MAIN CONTENT GRID -->
            <div class="profile-content-grid">
                
                <!-- COLUMN 1 -->
                <div class="profile-col-left">
                    <div class="profile-card">
                        <div class="profile-card-header">
                            <div class="profile-card-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 
                                Personal Information
                            </div>
                            <button class="btn-outline desktop-only">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Profile
                            </button>
                        </div>
                        
                        <div class="profile-info-list">
                            <div class="info-list-item">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Full Name</div>
                                <div class="info-list-value" data-profile-field="name">Loading…</div>
                                <svg class="chevron-right mobile-only" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                            <div class="info-list-item">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Mobile Number</div>
                                <div class="info-list-value" data-profile-field="phone">Loading…</div>
                                <svg class="chevron-right mobile-only" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                            <div class="info-list-item">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Municipality</div>
                                <div class="info-list-value" data-profile-field="municipality">Loading…</div>
                                <svg class="chevron-right mobile-only" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                            <div class="info-list-item">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Barangay</div>
                                <div class="info-list-value" data-profile-field="barangay">Loading…</div>
                                <svg class="chevron-right mobile-only" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                            <div class="info-list-item">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email Address</div>
                                <div class="info-list-value" data-profile-field="email">Loading…</div>
                                <svg class="chevron-right mobile-only" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                            <div class="info-list-item desktop-only">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Address</div>
                                <div class="info-list-value" data-profile-field="address" style="font-size: 0.8rem; line-height: 1.4;">Loading…</div>
                            </div>
                            <div class="info-list-item desktop-only">
                                <div class="info-list-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Account Status</div>
                                <div class="info-list-value"><span class="badge-verified">Verified <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.1 14.2l-3.6-3.6 1.4-1.4 2.2 2.2 5.8-5.8 1.4 1.4-7.2 7.2z"/></svg></span></div>
                            </div>
                        </div>
                        
                        <div class="profile-card-footer desktop-only">
                            <button class="btn-primary" style="width: max-content;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes</button>
                            <span class="footer-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Your information is secure and encrypted.</span>
                        </div>
                    </div>
                    
                    <!-- Mobile Dashboard Row -->
                    <div class="mobile-dashboard-row mobile-only">
                        <!-- Mobile Settings Menu -->
                        <div class="profile-card settings-menu-card">
                            <div class="profile-card-header no-border" style="padding-bottom: 0;">
                                <div class="profile-card-title" style="margin-bottom: 0;">Settings</div>
                            </div>
                            <div class="settings-list">
                                <a href="#" class="settings-item">
                                    <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Profile</div>
                                    <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                                <a href="#" class="settings-item">
                                    <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Change Password</div>
                                    <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                                <a href="#" class="settings-item">
                                    <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Notification Settings</div>
                                    <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                                <a href="#" class="settings-item">
                                    <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Emergency Contacts</div>
                                    <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                                <a href="#" class="settings-item">
                                    <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Privacy Settings</div>
                                    <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                                <form action="/api/auth/logout" method="post" class="settings-logout-form">
                                  <button type="submit" class="settings-item logout-text settings-logout-button">
                                    <div class="settings-item-left" style="color:var(--primary-red)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary-red)"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout</div>
                                  </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- COLUMN 2 (Desktop Only) -->
                <div class="profile-col-mid desktop-only">
                    <div class="profile-card">
                        <div class="profile-card-header">
                            <div class="profile-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Security</div>
                        </div>
                        <div class="settings-list">
                            <a href="#" class="settings-item">
                                <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Change Password</div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </a>
                            <a href="#" class="settings-item">
                                <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> PIN / Security Settings</div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </a>
                            <a href="#" class="settings-item">
                                <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Login Activity</div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </a>
                            <a href="#" class="settings-item">
                                <div class="settings-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Privacy Settings</div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </a>
                        </div>
                    </div>
                    
                    <div class="profile-card">
                        <div class="profile-card-header">
                            <div class="profile-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Preferences / Notifications</div>
                        </div>
                        <div class="preferences-list">
                            <div class="pref-item">
                                <div class="pref-text">
                                    <h4>Push Notifications</h4>
                                    <p>Receive general app notifications</p>
                                </div>
                                <div class="pref-toggle active"></div>
                            </div>
                            <div class="pref-item">
                                <div class="pref-text">
                                    <h4>Incident Updates</h4>
                                    <p>Updates on your submitted reports</p>
                                </div>
                                <div class="pref-toggle active"></div>
                            </div>
                            <div class="pref-item">
                                <div class="pref-text">
                                    <h4>Emergency Alerts</h4>
                                    <p>Critical alerts and fire safety warnings</p>
                                </div>
                                <div class="pref-toggle active"></div>
                            </div>
                            <div class="pref-item">
                                <div class="pref-text">
                                    <h4>Guide Updates</h4>
                                    <p>New safety guides and tips</p>
                                </div>
                                <div class="pref-toggle active"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COLUMN 3 (Desktop Grid + Mobile Specific Elements) -->
                <div class="profile-col-right">
                    
                    <!-- Emergency Contacts (Desktop) -->
                    <div class="profile-card desktop-only">
                        <div class="profile-card-header">
                            <div class="profile-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Emergency Contacts</div>
                        </div>
                        <div class="emergency-list">
                            <div class="emergency-item">
                                <div class="emergency-text">
                                    <h4>BFP Hotline</h4>
                                    <p>(036) 540-4222</p>
                                </div>
                                <button class="btn-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                            </div>
                            <div class="emergency-item">
                                <div class="emergency-text">
                                    <h4>911</h4>
                                    <p class="sub-text" style="color:var(--text-dark)">National Emergency Hotline</p>
                                </div>
                                <button class="btn-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                            </div>
                            <div class="emergency-item">
                                <div class="emergency-text">
                                    <h4>San Jose de Buenavista <br>Fire Station</h4>
                                    <p>(036) 541-1111</p>
                                </div>
                                <button class="btn-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                            </div>
                        </div>
                    </div>

                    <!-- Account Status moved to dashboard row -->
                    
                    <!-- Activity Summary -->
                    <div class="profile-card activity-summary-card desktop-only">
                        <div class="profile-card-header desktop-only">
                            <div class="profile-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Activity Summary</div>
                        </div>
                        
                        <div class="activity-list desktop-only">
                            <div class="activity-item bg-red-light">
                                <div class="activity-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Submitted Reports</div>
                                <div class="activity-item-count">12</div>
                            </div>
                            <div class="activity-item bg-orange-light">
                                <div class="activity-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Active Reports</div>
                                <div class="activity-item-count">3</div>
                            </div>
                            <div class="activity-item bg-green-light">
                                <div class="activity-item-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Closed Reports</div>
                                <div class="activity-item-count">9</div>
                            </div>
                        </div>

                        <a href="/resident/reports" class="view-all-link desktop-only">View all reports <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
                    </div>
                </div>
            </div>
            
            <!-- Mobile Update Button (Static) -->
            <div class="mobile-fixed-bottom mobile-only" style="margin-top: 0.5rem;">
                <button class="btn-primary w-full"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Update Profile</button>
            </div>
            
            <div style="text-align: center; margin-top: 2rem; color: var(--text-muted); font-size: 0.8rem;" class="desktop-only">
                © 2024 ALAB - BFP Antique. All rights reserved. &nbsp;&nbsp;&nbsp; Privacy Policy &nbsp;·&nbsp; Terms of Service &nbsp;·&nbsp; Help Center
            </div>
        </main>

        <!-- Mobile Bottom Nav -->
    </div>
`;

export const guideStyles = `
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
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .guide-page-root {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
    }

    /* ==================== GLOBAL HEADER (Desktop) ==================== */
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

    /* ==================== HEADER PROFILE DROPDOWN ==================== */
    .header-profile-menu {
        position: relative;
        margin-left: 0.5rem;
    }
    .header-profile-btn {
        background: none; border: none; cursor: pointer;
        padding: 0.2rem; display: flex; align-items: center; justify-content: center;
        border-radius: 50%; border: 2px solid transparent; transition: all 0.2s;
    }
    .header-profile-btn img {
        width: 2.2rem; height: 2.2rem; border-radius: 50%; object-fit: cover;
    }
    .header-profile-btn:hover, .header-profile-menu:focus-within .header-profile-btn {
        border-color: var(--primary-red);
    }
    .profile-dropdown {
        position: absolute; top: calc(100% + 0.5rem); right: 0;
        background: var(--card-bg); border: 1px solid var(--border-color);
        border-radius: 0.8rem; box-shadow: var(--shadow-md); width: 230px;
        opacity: 0; visibility: hidden; transform: translateY(-10px);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 100;
        padding: 0.5rem 0;
    }
    .header-profile-menu:focus-within .profile-dropdown,
    .header-profile-menu:hover .profile-dropdown {
        opacity: 1; visibility: visible; transform: translateY(0);
    }
    .profile-dropdown-item {
        display: flex; align-items: center; gap: 0.8rem;
        padding: 0.7rem 1.2rem; text-decoration: none;
        color: var(--text-dark); font-size: 0.95rem; font-weight: 500;
        transition: background-color 0.2s, color 0.2s;
    }
    .profile-dropdown-item:hover {
        background-color: #f1f5f9;
    }
    .profile-dropdown-icon {
        width: 1.2rem; height: 1.2rem; color: var(--text-muted);
    }
    .profile-dropdown-divider {
        height: 1px; background-color: var(--border-color);
        margin: 0.5rem 0;
    }
    .profile-dropdown-item.logout-item {
        color: var(--primary-red);
    }
    .profile-dropdown-item.logout-item .profile-dropdown-icon {
        color: var(--primary-red);
    }
    .profile-dropdown-item.logout-item:hover {
        background-color: var(--primary-red-light);
    }

    /* ==================== MOBILE NAVIGATION ==================== */
    .mobile-bottom-nav { display: none; }
    .mobile-header { display: none; }

    /* ==================== UTILITIES ==================== */
    .desktop-only { display: block; }
    .mobile-only { display: none; }

    /* ==================== PAGE LAYOUT ==================== */
    .guide-main-layout {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem 2rem 2rem;
    }
    
    /* ==================== TOP SECTION (Title + Search) ==================== */
    .guide-top-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }
    .guide-title-area {
        display: flex;
        align-items: center;
    }
    .guide-title-text h1 {
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--text-dark);
        line-height: 1.2;
    }
    .guide-title-text p {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-top: 0.2rem;
    }
    .guide-search-wrapper {
        position: relative;
        width: 400px;
    }
    .guide-search-wrapper svg {
        position: absolute;
        left: 1.2rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.2rem;
        height: 1.2rem;
        color: #94a3b8;
    }
    .guide-search-input {
        width: 100%;
        padding: 0.9rem 1.2rem 0.9rem 3rem;
        border: 1px solid var(--border-color);
        border-radius: 2rem;
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
        background: var(--card-bg);
    }
    .guide-search-input:focus {
        border-color: var(--primary-red);
        box-shadow: 0 0 0 3px var(--primary-red-light);
    }

    /* ==================== CATEGORY PILLS ==================== */
    .guide-categories {
        display: flex;
        gap: 0.6rem;
        margin-bottom: 1rem;
        overflow-x: auto;
        padding-bottom: 0.4rem;
        scrollbar-width: none; /* Firefox */
    }
    .guide-categories::-webkit-scrollbar { display: none; } /* Chrome */
    .guide-category-pill {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-dark);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
    }
    .guide-category-pill svg, .guide-category-pill img { width: 1.1rem; height: 1.1rem; }
    .guide-category-pill:hover { border-color: var(--primary-red); }
    .guide-category-pill.active {
        background: var(--primary-red);
        color: white;
        border-color: var(--primary-red);
    }
    .guide-category-pill.active svg { color: white; }
    .guide-category-pill.active img { filter: brightness(0) invert(1); }
    .pill-icon-red { color: var(--primary-red); }

    /* ==================== DESKTOP CONTENT GRID ==================== */
    .guide-content-grid {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 1rem;
        align-items: start;
    }

    /* --- HERO SECTION --- */
    .guide-hero-section {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem 1.5rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        position: relative;
        overflow: hidden;
    }
    .guide-hero-section::before {
        content: '';
        position: absolute;
        top: 0; left: 0; bottom: 0; width: 250px;
        background: radial-gradient(circle at left, var(--primary-red-light) 0%, transparent 100%);
        z-index: 0;
    }
    .guide-hero-img {
        width: 180px;
        height: auto;
        position: relative;
        z-index: 1;
        flex-shrink: 0;
        mix-blend-mode: multiply;
    }
    .guide-hero-content {
        flex: 1;
        position: relative;
        z-index: 1;
    }
    .guide-hero-content h2 {
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--primary-red);
        margin-bottom: 0.3rem;
    }
    .guide-hero-content > p {
        font-size: 0.95rem;
        color: var(--text-muted);
        margin-bottom: 2rem;
    }
    
    .guide-steps-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        position: relative;
    }
    .guide-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        flex: 1;
        position: relative;
    }
    /* Arrows between steps */
    .guide-step:not(:last-child)::after {
        content: '→';
        position: absolute;
        top: 2rem;
        right: -0.5rem;
        transform: translateY(-50%);
        font-size: 1.2rem;
        color: #cbd5e1;
    }
    .guide-step-icon-wrapper {
        position: relative;
        width: 4rem;
        height: 4rem;
        background: var(--bg-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.8rem;
        border: 2px solid transparent;
        transition: border-color 0.2s;
    }
    .guide-step:hover .guide-step-icon-wrapper { border-color: var(--primary-red); }
    .guide-step-icon-wrapper img {
        width: 2.2rem;
        height: 2.2rem;
        object-fit: contain;
    }
    .guide-step-number {
        position: absolute;
        top: -0.3rem;
        left: -0.3rem;
        background: var(--primary-red);
        color: white;
        width: 1.4rem;
        height: 1.4rem;
        min-width: 1.4rem;
        min-height: 1.4rem;
        max-width: 1.4rem;
        max-height: 1.4rem;
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-sizing: border-box;
        line-height: 1;
        padding: 0;
        margin: 0;
        flex-shrink: 0;
        aspect-ratio: 1 / 1;
    }
    .guide-step h3 {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 0.3rem;
    }
    .guide-step p {
        font-size: 0.75rem;
        color: var(--text-muted);
        line-height: 1.4;
        max-width: 120px;
    }

    /* --- MAIN CARDS GRID --- */
    .guide-cards-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    .guide-main-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
        text-decoration: none;
    }
    .guide-main-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--primary-red-border);
    }
    .guide-card-icon-header {
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
        margin-bottom: 0.8rem;
    }
    .guide-card-icon {
        width: 2.5rem;
        height: 2.5rem;
        background: var(--bg-color);
        border-radius: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .guide-card-icon img, .guide-card-icon svg { width: 1.4rem; height: 1.4rem; object-fit: contain; }
    .guide-card-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        line-height: 1.3;
    }
    .guide-card-desc {
        font-size: 0.8rem;
        color: var(--text-muted);
        line-height: 1.5;
        margin-bottom: 1.5rem;
        flex: 1;
    }
    .guide-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--primary-red);
        margin-top: auto;
    }
    .guide-card-footer svg { width: 1rem; height: 1rem; }

    /* --- RECENT GUIDES --- */
    .guide-recent-section {
        margin-top: 1.5rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.5rem;
    }
    .guide-recent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.2rem;
    }
    .guide-recent-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .guide-recent-title svg { width: 1.2rem; height: 1.2rem; color: var(--primary-red); }
    .guide-view-all {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--primary-red);
        text-decoration: none;
    }
    .guide-recent-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    .guide-recent-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: 0.8rem;
        text-decoration: none;
        transition: background 0.2s;
    }
    .guide-recent-item:hover { background: var(--bg-color); }
    .guide-recent-item-icon {
        width: 3rem;
        height: 3rem;
        background: var(--primary-red-light);
        border-radius: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .guide-recent-item-icon img, .guide-recent-item-icon svg { width: 1.5rem; height: 1.5rem; object-fit: contain; }
    .guide-recent-item-content { flex: 1; }
    .guide-recent-item-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 0.2rem;
    }
    .guide-recent-item-desc {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    .guide-recent-item-date {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 500;
    }
    .guide-recent-item-date svg { width: 0.8rem; height: 0.8rem; }
    .guide-recent-item-arrow { color: #cbd5e1; }
    .guide-recent-item-arrow svg { width: 1.2rem; height: 1.2rem; }

    /* --- SIDEBAR --- */
    .guide-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }
    .guide-sidebar-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        padding: 1.2rem;
    }
    .guide-sidebar-title {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 1rem;
        padding-bottom: 0.8rem;
        border-bottom: 1px solid var(--border-color);
    }
    .guide-sidebar-title svg {
        width: 1.2rem;
        height: 1.2rem;
        color: var(--primary-red);
    }
    .guide-reminder-list {
        list-style: none;
    }
    .guide-reminder-list li {
        position: relative;
        padding-left: 1rem;
        font-size: 0.85rem;
        color: var(--text-dark);
        line-height: 1.4;
        margin-bottom: 0.8rem;
        font-weight: 500;
    }
    .guide-reminder-list li:last-child { margin-bottom: 0; }
    .guide-reminder-list li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.45rem;
        width: 4px;
        height: 4px;
        background: var(--primary-red);
        border-radius: 50%;
    }
    .guide-contacts-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }
    .guide-contact-item {
        display: flex;
        align-items: center;
        gap: 0.8rem;
    }
    .guide-contact-icon {
        width: 1.5rem;
        height: 1.5rem;
        color: var(--text-muted);
        flex-shrink: 0;
    }
    .guide-contact-icon svg { width: 100%; height: 100%; }
    .guide-contact-info { flex: 1; }
    .guide-contact-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .guide-contact-desc {
        font-size: 0.65rem;
        color: var(--text-muted);
    }
    .guide-contact-number {
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--primary-red);
    }


    /* ==================== MOBILE RESPONSIVE ==================== */
    @media (max-width: 950px) {
        /* Hide desktop header */
        .top-header { display: none; }

        /* Show mobile header */
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

        /* Show mobile bottom nav */
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

        /* Mobile Layout Adjustments */
        .desktop-only { display: none !important; }
        .mobile-only { display: block !important; }
        
        .guide-main-layout {
            padding: 1rem 1rem 6rem;
            grid-template-columns: 1fr; /* Single column */
        }
        .guide-content-grid {
            grid-template-columns: 1fr; /* Single column */
        }

        /* Hide big title area, use mobile search */
        .guide-top-section {
            margin-bottom: 1rem;
        }
        .guide-title-area { display: none; }
        .guide-search-wrapper { width: 100%; }

        /* Mobile Hero (Vertical steps) */
        .guide-hero-section {
            flex-direction: column;
            padding: 1.2rem;
            text-align: left;
            background: var(--card-bg);
            border-color: var(--primary-red-border);
        }
        .guide-hero-section::before { display: none; }
        .guide-hero-img { width: 120px; display: none; /* Hide img on mobile to match ref */ } 
        .guide-hero-content { width: 100%; }
        .guide-hero-content h2 { font-size: 1.15rem; color: var(--primary-red); margin-bottom: 0.2rem; }
        .guide-hero-content > p { font-size: 0.8rem; margin-bottom: 1rem; color: var(--text-muted); }
        
        .guide-steps-row {
            flex-wrap: nowrap;
            overflow: visible;
            justify-content: space-between;
            gap: 0.2rem;
            padding-bottom: 0.5rem;
            padding-top: 0.4rem;
        }
        .guide-step { min-width: 0; flex: 1; }
        .guide-step:not(:last-child)::after { 
            display: block; 
            top: 1.2rem; 
            right: -0.4rem; 
            font-size: 0.8rem;
            color: var(--primary-red-border);
        }
        .guide-step-icon-wrapper { width: 2.8rem; height: 2.8rem; background: white; margin: 0 auto 0.3rem; border: 1px solid var(--border-color); }
        .guide-step-icon-wrapper img { width: 1.5rem; height: 1.5rem; }
        .guide-step p { display: none; /* Hide step description on mobile for compact view */ }
        .guide-step h3 { font-size: 0.65rem; line-height: 1.1; text-align: center; }

        /* Main Cards list view */
        .guide-cards-grid {
            grid-template-columns: 1fr;
            gap: 0.8rem;
        }
        .guide-main-card {
            flex-direction: row;
            align-items: center;
            padding: 1rem;
            gap: 1rem;
        }
        .guide-card-icon-header { margin: 0; width: auto; align-items: center; }
        .guide-card-icon { width: 3rem; height: 3rem; }
        .guide-card-icon img, .guide-card-icon svg { width: 1.6rem; height: 1.6rem; }
        .guide-card-desc { display: none; } /* Hide descriptions on mobile list */
        .guide-card-title { font-size: 0.9rem; flex: 1; }
        .guide-card-footer { margin: 0; display: block; flex-shrink: 0; }
        .guide-card-footer span { display: none; } /* Hide "Read Guide" text */
        .guide-card-footer svg { width: 1.2rem; height: 1.2rem; color: #94a3b8; }
        
        /* Mobile styling for Sidebar cards (now below grid) */
        .guide-sidebar { gap: 1rem; margin-top: 1.5rem; }
        
        /* Recent Guides mobile */
        .guide-recent-section { padding: 1rem; }
        .guide-recent-grid { grid-template-columns: 1fr; gap: 0.8rem; }
        .guide-recent-item {
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-areas: 
                "icon content arrow"
                "icon date arrow";
            column-gap: 1rem;
            row-gap: 0.2rem;
            padding: 0.8rem 1rem;
        }
        .guide-recent-item-icon { 
            grid-area: icon; 
            width: 2.5rem; 
            height: 2.5rem; 
            align-self: center;
        }
        .guide-recent-item-icon img, .guide-recent-item-icon svg { 
            width: 1.2rem; 
            height: 1.2rem; 
        }
        .guide-recent-item-content { grid-area: content; align-self: end; }
        .guide-recent-item-title { font-size: 0.85rem; }
        .guide-recent-item-desc { display: none; }
        .guide-recent-item-date { grid-area: date; align-self: start; }
        .guide-recent-item-arrow { grid-area: arrow; align-self: center; }
        
        .top-header { display: none !important; }
        
        /* Mobile Top Header */
        .mobile-top-header {
            display: flex !important;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: white;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .mobile-page-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-dark);
            margin: 0;
        }
        .mobile-notif-btn {
            position: absolute;
            right: 1rem;
            padding: 0.5rem;
            background: none;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-dark);
        }
        .mobile-notif-btn svg {
            width: 1.5rem;
            height: 1.5rem;
        }
    }
`;

export const guideMarkup = `
    <div class="guide-page-root">
        <!-- MOBILE TOP HEADER -->
        <header class="mobile-top-header mobile-only">
            <h1 class="mobile-page-title">Guide</h1>
            <button class="mobile-notif-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span class="notification-badge">3</span>
            </button>
        </header>
        
        <!-- GLOBAL HEADER (Desktop) -->
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
                    <a href="/resident/reports" class="nav-item">
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
                    <a href="/resident/guide" class="nav-item active">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                        Guide
                    </a>
                </div>
            </div>

            <div class="header-right">
                <button class="notification-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2rem; height:1.2rem;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span class="notification-badge">3</span>
                </button>
                <button class="lang-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2rem; height:1.2rem; margin-right:0.3rem;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    EN
                </button>
                
                <div class="header-profile-menu desktop-only">
                    <button class="header-profile-btn" aria-haspopup="true">
                        <img src="/images/user_avatar_placeholder.webp" alt="Profile" onerror="this.src='https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=1e293b&color=fff&size=150'">
                    </button>
                    <div class="profile-dropdown">
                        <a href="/resident/profile" class="profile-dropdown-item">
                            <svg class="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            Profile Settings
                        </a>
                        <a href="/resident/profile?tab=notifications" class="profile-dropdown-item">
                            <svg class="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            Notification Settings
                        </a>
                        <a href="/resident/profile?tab=emergency" class="profile-dropdown-item">
                            <svg class="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            Emergency Contacts
                        </a>
                        <a href="/resident/guide" class="profile-dropdown-item">
                            <svg class="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Help Center
                        </a>
                        <div class="profile-dropdown-divider"></div>
                        <a href="/" class="profile-dropdown-item logout-item">
                            <svg class="profile-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Logout
                        </a>
                    </div>
                </div>
            </div>
        </header>


        <main class="guide-main-layout">
            <!-- Title & Search -->
            <div class="guide-top-section">
                <div class="guide-title-area">
                    <div class="guide-title-text">
                        <h1>Emergency Guide</h1>
                        <p>Read official fire safety guidance and reporting procedures.</p>
                    </div>
                </div>
                <div class="guide-search-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="guide-search-input" placeholder="Search fire safety guides, procedures, or tips" />
                </div>
            </div>

            <!-- Categories -->
            <div class="guide-categories">
                <div class="guide-category-pill active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Fire Prevention
                </div>
                <div class="guide-category-pill">
                    <svg class="pill-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Fire Reporting
                </div>
                <div class="guide-category-pill">
                    <svg class="pill-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>
                    Evacuation
                </div>
                <div class="guide-category-pill">
                    <svg class="pill-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 9.5a1.2 1.2 0 0 0-1.04 1.5h4v5l3-4.5a1.2 1.2 0 0 0 1-1.5h-4Z"/></svg>
                    First Aid
                </div>
                <div class="guide-category-pill">
                    <svg class="pill-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 21 3-9 2 9"/><path d="M14 6 10.5 3 7 6"/><path d="m12 6 3 9-3 9"/><path d="m10 6-3 9 3 9"/></svg>
                    Electrical Safety
                </div>
                <div class="guide-category-pill">
                    <svg class="pill-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5A4.5 4.5 0 0 1 16.5 21a4.5 4.5 0 0 1-4.5-4.5c0-2.48 4.5-9.5 4.5-9.5s4.5 7.02 4.5 9.5Z"/><path d="M16.5 16.5a1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 0 1.5 1.5Z"/></svg>
                    Gas Leak
                </div>
            </div>

            <div class="guide-content-grid">
                <div class="guide-main-col">
                    <!-- HERO -->
                    <div class="guide-hero-section">
                        <img src="/images/burning-house.webp" alt="Burning House" class="guide-hero-img" />
                        <div class="guide-hero-content">
                            <h2 class="desktop-only">What to Do During a Fire Emergency</h2>
                            <h2 class="mobile-only">Fire Emergency Steps</h2>
                            <p class="desktop-only">Quick steps to protect yourself, your family, and your community.</p>
                            <p class="mobile-only">Follow these steps to stay safe.</p>
                            
                            <div class="guide-steps-row">
                                <div class="guide-step">
                                    <div class="guide-step-icon-wrapper">
                                        <div class="guide-step-number">1</div>
                                        <img src="/images/step1_calm.webp" alt="Stay Calm" style="mix-blend-mode: multiply;" />
                                    </div>
                                    <h3>Stay Calm</h3>
                                    <p>Keep yourself calm and think clearly.</p>
                                </div>
                                <div class="guide-step">
                                    <div class="guide-step-icon-wrapper">
                                        <div class="guide-step-number">2</div>
                                        <img src="/images/step2_exit.webp" alt="Move to Safety" style="mix-blend-mode: multiply;" />
                                    </div>
                                    <h3>Move to Safety</h3>
                                    <p>Exit the building using safe routes.</p>
                                </div>
                                <div class="guide-step">
                                    <div class="guide-step-icon-wrapper">
                                        <div class="guide-step-number">3</div>
                                        <img src="/images/step3_phone.webp" alt="Send Fire Alert" style="mix-blend-mode: multiply;" />
                                    </div>
                                    <h3>Send Fire Alert</h3>
                                    <p>Report the fire immediately.</p>
                                </div>
                                <div class="guide-step">
                                    <div class="guide-step-icon-wrapper">
                                        <div class="guide-step-number">4</div>
                                        <img src="/images/step4_firefighter.webp" alt="Wait for Responders" style="mix-blend-mode: multiply;" />
                                    </div>
                                    <h3>Wait for Responders</h3>
                                    <p>Stay in a safe area and follow instructions.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MAIN GUIDES -->
                    <div class="guide-cards-grid">
                        <a href="#" class="guide-main-card">
                            <div class="guide-card-icon-header">
                                <div class="guide-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary-red);"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                                <div class="guide-card-title">1. How to Report a Fire Correctly</div>
                            </div>
                            <div class="guide-card-desc">Provide accurate details to help responders act fast and save lives.</div>
                            <div class="guide-card-footer">
                                <span>Read Guide</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        </a>
                        
                        <a href="#" class="guide-main-card">
                            <div class="guide-card-icon-header">
                                <div class="guide-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#16a34a;"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg></div>
                                <div class="guide-card-title">2. Evacuation Safety Guide</div>
                            </div>
                            <div class="guide-card-desc">Know the right steps and routes to evacuate safely during a fire.</div>
                            <div class="guide-card-footer">
                                <span>Read Guide</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        </a>

                        <a href="#" class="guide-main-card">
                            <div class="guide-card-icon-header">
                                <div class="guide-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b;"><path d="m11 21 3-9 2 9"/><path d="M14 6 10.5 3 7 6"/><path d="m12 6 3 9-3 9"/><path d="m10 6-3 9 3 9"/></svg></div>
                                <div class="guide-card-title">3. Kitchen and Electrical Fire Tips</div>
                            </div>
                            <div class="guide-card-desc">Learn how to prevent common electrical and kitchen fire hazards.</div>
                            <div class="guide-card-footer">
                                <span>Read Guide</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        </a>

                        <a href="#" class="guide-main-card">
                            <div class="guide-card-icon-header">
                                <div class="guide-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#059669;"><path d="M21 16.5A4.5 4.5 0 0 1 16.5 21a4.5 4.5 0 0 1-4.5-4.5c0-2.48 4.5-9.5 4.5-9.5s4.5 7.02 4.5 9.5Z"/><path d="M16.5 16.5a1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 0 1.5 1.5Z"/></svg></div>
                                <div class="guide-card-title">4. Grass and Forest Fire Safety</div>
                            </div>
                            <div class="guide-card-desc">Help prevent wildfires and learn what to do if one occurs.</div>
                            <div class="guide-card-footer">
                                <span>Read Guide</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                        </a>
                    </div>
                    
                    <!-- RECENT GUIDES -->
                    <div class="guide-recent-section">
                        <div class="guide-recent-header">
                            <div class="guide-recent-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                Recent / Recommended Guides
                            </div>
                            <a href="#" class="guide-view-all">View all guides</a>
                        </div>
                        <div class="guide-recent-grid">
                            <a href="#" class="guide-recent-item">
                                <div class="guide-recent-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary-red);"><path d="M8 9h8"/><path d="M12 9v11"/><path d="M9 22h6"/><path d="M10 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M12 5v4"/></svg></div>
                                <div class="guide-recent-item-content">
                                    <div class="guide-recent-item-title">Proper Use of Fire Extinguishers</div>
                                    <div class="guide-recent-item-desc">Learn the PASS technique and extinguisher types.</div>
                                </div>
                                <div class="guide-recent-item-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    May 10, 2024
                                </div>
                                <div class="guide-recent-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
                            </a>
                            <a href="#" class="guide-recent-item">
                                <div class="guide-recent-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#d946ef;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="8" x2="12" y2="2"/></svg></div>
                                <div class="guide-recent-item-content">
                                    <div class="guide-recent-item-title">Smoke Alarm Guide</div>
                                    <div class="guide-recent-item-desc">Installation, testing, and maintenance tips.</div>
                                </div>
                                <div class="guide-recent-item-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    May 03, 2024
                                </div>
                                <div class="guide-recent-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
                            </a>
                            <a href="#" class="guide-recent-item">
                                <div class="guide-recent-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#8b5cf6;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                                <div class="guide-recent-item-content">
                                    <div class="guide-recent-item-title">Family Fire Safety Plan</div>
                                    <div class="guide-recent-item-desc">Create a plan and practice it with your family.</div>
                                </div>
                                <div class="guide-recent-item-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    Apr 28, 2024
                                </div>
                                <div class="guide-recent-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
                            </a>
                            <a href="#" class="guide-recent-item">
                                <div class="guide-recent-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#0ea5e9;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg></div>
                                <div class="guide-recent-item-content">
                                    <div class="guide-recent-item-title">After a Fire: What to Do</div>
                                    <div class="guide-recent-item-desc">Important steps to take after the fire is out.</div>
                                </div>
                                <div class="guide-recent-item-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    Apr 15, 2024
                                </div>
                                <div class="guide-recent-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR -->
                <div class="guide-sidebar">
                    <div class="guide-sidebar-card">
                        <div class="guide-sidebar-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Quick Safety Reminder
                        </div>
                        <ul class="guide-reminder-list">
                            <li>Never ignore smoke or fire.</li>
                            <li>Know your exits and safe spots.</li>
                            <li>Keep fire extinguishers accessible.</li>
                            <li>Do not use elevators during a fire.</li>
                            <li>Report fires immediately.</li>
                        </ul>
                    </div>
                    
                    <div class="guide-sidebar-card">
                        <div class="guide-sidebar-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            Emergency Contacts
                        </div>
                        <div class="guide-contacts-list">
                            <div class="guide-contact-item">
                                <div class="guide-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                                <div class="guide-contact-info">
                                    <div class="guide-contact-label">BFP Hotline</div>
                                </div>
                                <div class="guide-contact-number">(036) 540-5967</div>
                            </div>
                            <div class="guide-contact-item">
                                <div class="guide-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div>
                                <div class="guide-contact-info">
                                    <div class="guide-contact-label">911</div>
                                    <div class="guide-contact-desc">Emergency Hotline</div>
                                </div>
                                <div class="guide-contact-number">911</div>
                            </div>
                            <div class="guide-contact-item">
                                <div class="guide-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                                <div class="guide-contact-info">
                                    <div class="guide-contact-label">Municipal Fire Station</div>
                                </div>
                                <div class="guide-contact-number">(036) 540-5842</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- MOBILE BOTTOM NAV -->
        <nav class="mobile-bottom-nav">
            <a href="/resident" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                Home
            </a>
            <a href="/resident/reports" class="mobile-nav-item">
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
            <a href="/resident/guide" class="mobile-nav-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Guide
            </a>
            <a href="/resident/profile" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
            </a>
        </nav>
    </div>
`;

export const reportFireStyles = `
    /* BASE STYLES */
    :root {
        --primary-red: #d31212;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #f8fafc;
        --bg-white: #ffffff;
        --shadow-sm: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
    
    .report-page-root {
        background-color: var(--card-bg);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    /* HEADER */
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

    .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .brand-logo {
        height: 6rem;
        width: auto;
    }

    .brand-title {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--text-dark);
        line-height: 1.2;
    }

    .brand-subtitle {
        font-size: 0.8rem;
        color: var(--text-muted);
        font-weight: 500;
    }

    .header-nav {
        display: flex;
        align-items: center;
        gap: 2.5rem;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        color: var(--text-muted);
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 600;
        transition: color 0.2s;
    }

    .nav-item:hover {
        color: var(--primary-red);
    }

    .nav-item.active {
        color: var(--primary-red);
    }

    .nav-item.active::after {
        content: '';
        display: block;
        width: 100%;
        height: 3px;
        background: var(--primary-red);
        border-radius: 3px 3px 0 0;
        position: absolute;
        bottom: 0;
    }
    
    .nav-item-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        padding: 0.5rem 0;
    }

    .nav-icon {
        width: 1.5rem;
        height: 1.5rem;
    }

    .nav-item.report-fire-nav {
        color: var(--primary-red);
    }

    .nav-item.report-fire-nav .nav-icon {
        background: var(--primary-red);
        color: white;
        border-radius: 50%;
        padding: 0.35rem;
        width: 2.2rem;
        height: 2.2rem;
    }

    .fire-logo-tint {
        filter: brightness(0) invert(1);
        object-fit: contain;
        width: 100%;
        height: 100%;
    }

    .header-right {
        display: flex;
        align-items: center;
    }

    .notification-btn, .lang-btn {
        background: none;
        border: none;
        position: relative;
        cursor: pointer;
        color: var(--text-dark);
        padding: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-weight: 600;
        font-size: 0.95rem;
    }

    .notification-btn:hover, .lang-btn:hover {
        color: var(--primary-red);
    }

    .notification-badge {
        position: absolute;
        top: 0.2rem;
        right: 0.2rem;
        background: var(--primary-red);
        color: white;
        font-size: 0.65rem;
        font-weight: 800;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
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

    /* DESKTOP LAYOUT (3 COLUMNS) */
    .report-container {
        flex: 1;
        max-width: 1400px;
        margin: 2rem auto;
        padding: 0 2rem;
        display: grid;
        grid-template-columns: 280px 1fr 280px;
        gap: 1.5rem;
        align-items: start;
    }

    /* CARD STYLES */
    .card {
        background: var(--bg-white);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-dark);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0;
    }

    .card-title svg { width: 1.25rem; height: 1.25rem; color: var(--primary-red); }

    /* LEFT COLUMN */
    .account-info {
        background: #fff5f5;
        border-radius: 0.5rem;
        padding: 1rem;
        font-size: 0.85rem;
        color: var(--text-dark);
        line-height: 1.4;
    }
    .account-info strong { display: block; margin-bottom: 0.5rem; }
    
    .btn-outline-red {
        background: transparent;
        border: 1px solid var(--primary-red);
        color: var(--primary-red);
        padding: 0.8rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        width: 100%;
    }

    /* CENTER COLUMN (MAIN FORM) */
    .main-form-card { padding: 1.5rem; }
    .form-header-title { font-size: 1.5rem; font-weight: 800; color: var(--text-dark); margin-bottom: 1.5rem; margin-top: 0; }
    
    .warning-banner {
        background: #fff5f5;
        border: 1px solid #ffcaca;
        border-radius: 0.5rem;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .warning-banner svg { width: 2.5rem; height: 2.5rem; color: var(--primary-red); }
    .warning-banner-text h3 { color: var(--primary-red); font-size: 1.2rem; margin-bottom: 0.2rem; }
    .warning-banner-text p { color: var(--text-dark); font-size: 0.95rem; font-weight: 500; }

    .step-section { margin-bottom: 2rem; }
    .step-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--text-dark);
        margin-bottom: 1rem;
    }
    .step-number {
        background: var(--primary-red);
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
    }

    /* STEP 1 & 2 GRIDS */
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    
    .location-box {
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
    }
    .location-details h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.2rem; }
    .location-details p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem; }
    .location-details .accuracy { font-size: 0.8rem; font-weight: 600; color: #16a34a; margin-bottom: 1rem; }
    
    .map-preview { width: 100px; height: 80px; background: #e2e8f0; border-radius: 0.5rem; overflow: hidden; position: relative; }
    .map-preview::after {
        content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 1rem; height: 1.5rem; background: var(--primary-red);
        clip-path: polygon(50% 100%, 0 40%, 0 0, 100% 0, 100% 40%);
    }

    .location-box[data-location-card] { position: relative; min-height: 9.7rem; }
    .location-details { min-width: 0; }
    .location-details h4 { display: flex; align-items: center; gap: 0.4rem; }
    .location-heading-icon { width: 1.1rem; height: 1.1rem; color: var(--primary-red); flex-shrink: 0; }
    .location-status { font-size: 0.7rem; color: #b45309; background: #fff7ed; padding: 0.2rem 0.5rem; border-radius: 1rem; font-weight: 700; }
    .location-status.is-success { color: #15803d; background: #dcfce7; }
    .location-status.is-error { color: #b91c1c; background: #fee2e2; }
    .location-error { color: #b91c1c; font-size: 0.72rem; line-height: 1.3; margin-bottom: 0.65rem; }
    .map-preview[data-location-preview] { display: grid; place-items: center; background: #fff5f5; border: 1px solid #fecaca; }
    .map-preview[data-location-preview]::after { display: none; }
    .map-preview[data-location-preview] img { width: 3.1rem; height: 3.1rem; object-fit: contain; }
    .btn-small-outline:disabled { opacity: 0.6; cursor: wait; }

    .action-btn-row { display: flex; gap: 0.5rem; }
    .btn-small-outline {
        padding: 0.4rem 0.8rem; border: 1px solid var(--border-color); background: var(--bg-white);
        border-radius: 0.3rem; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;
    }

    /* STEP 3 GRID */
    .type-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
    .type-btn {
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        padding: 1rem 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-white);
        cursor: pointer;
        color: var(--text-dark);
        font-weight: 600;
        font-size: 0.85rem;
    }
    .type-btn svg { width: 2rem; height: 2rem; color: var(--text-muted); }
    .type-btn.selected { border-color: var(--primary-red); color: var(--primary-red); }
    .type-btn.selected svg { color: var(--primary-red); }

    /* STEP 4 TEXTAREA */
    .desc-input {
        width: 100%; border: 1px solid var(--border-color); border-radius: 0.5rem;
        padding: 0.8rem; font-size: 0.9rem; resize: vertical; min-height: 80px;
    }
    
    /* STEP 5 PHOTOS */
    .photo-actions { display: flex; gap: 1rem; }
    .photo-actions button { flex: 1; }

    /* FORM FOOTER */
    .form-footer { display: flex; gap: 1rem; margin-top: 1rem; }
    .btn-primary {
        background: var(--primary-red); color: white; border: none; flex: 3;
        padding: 1.2rem; border-radius: 0.5rem; font-size: 1.1rem; font-weight: 700;
        display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;
    }
    .btn-cancel {
        background: var(--bg-white); color: var(--primary-red); border: 1px solid var(--primary-red); flex: 1;
        padding: 1.2rem; border-radius: 0.5rem; font-size: 1.1rem; font-weight: 700; cursor: pointer;
    }

    /* RIGHT COLUMN */
    .safety-list { list-style: none; display: flex; flex-direction: column; gap: 0.8rem; }
    .safety-list li { font-size: 0.9rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.5rem; }
    .safety-list li::before { content: '•'; color: var(--primary-red); font-weight: bold; font-size: 1.2rem; line-height: 0.8; }
    
    .btn-solid-red {
        background: var(--primary-red); color: white; border: none;
        padding: 0.8rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; text-align: center; width: 100%;
    }
    .text-sm-muted { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; text-align: center; }
    
    /* MOBILE HEADER */
    .mobile-header { display: none; }
    .mobile-warning { display: none; }
    .mobile-bottom-nav { display: none; }
    /* RESPONSIVE DESIGN (MOBILE) */
    @media (max-width: 950px) {
        .report-page-root { background: var(--bg-white); padding-bottom: 2rem; }
        .top-header, .account-card, .assistance-card, .safety-card, .incident-card, .form-header-title { display: none; }
        
        .top-header { display: none !important; }
        
        .brand-logo {
            height: 3rem;
        }
        
        .report-container { display: flex; flex-direction: column; padding: 0; margin: 0; }
        .main-form-card { padding: 0; border: none; box-shadow: none; border-radius: 0; }
        
        .mobile-header { display: none !important; }
        
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
        }
        
        .mobile-warning {
            background: #fffdeb; color: #b45309; padding: 0.8rem 1rem; font-size: 0.8rem; font-weight: 700;
            display: flex; align-items: center; gap: 0.6rem; 
            border: 1px solid #fde047; border-radius: 0.5rem; margin: 1rem 1rem 0.5rem 1rem;
            line-height: 1.4;
        }
        .mobile-warning svg { width: 1.4rem; height: 1.4rem; flex-shrink: 0; }

        /* Form adjustments */
        .warning-banner { margin: 0.5rem 1rem 1.5rem 1rem; padding: 1rem; border-radius: 0.5rem; }
        .step-section { margin: 0 1rem 1.5rem 1rem; }
        
        .two-col-grid { grid-template-columns: 1fr; gap: 1.5rem; }
        .type-grid { grid-template-columns: repeat(3, 1fr); }
        
        .location-box { flex-direction: column; gap: 1rem; }
        .map-preview { width: 100%; height: 120px; }
        .action-btn-row { flex-wrap: wrap; }

        .form-footer { margin: 1rem; flex-direction: column; gap: 0.8rem; }
        .btn-cancel { border: none; font-size: 1rem; padding: 0.8rem; }

        .mobile-bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; width: 100%;
            background: white; border-top: 1px solid var(--border-color);
            padding: 0.8rem 1rem 1.4rem; justify-content: space-between; align-items: flex-end; z-index: 100;
        }
        .mobile-nav-item {
            display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
            color: var(--text-muted); font-size: 0.8rem; font-weight: 600; text-decoration: none; width: 20%;
        }
        .mobile-nav-item.active { color: var(--primary-red); }
        .mobile-nav-item svg { width: 1.8rem; height: 1.8rem; }
        .mobile-nav-fab-wrapper { position: relative; width: 20%; display: flex; justify-content: center; }
        .mobile-nav-fab {
            position: absolute; bottom: 1rem; background: var(--primary-red);
            width: 4.8rem; height: 4.8rem; border-radius: 50%; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding-bottom: 0.6rem; color: white;
            box-shadow: 0 4px 10px rgba(217, 27, 16, 0.3); border: 4px solid white; text-decoration: none;
        }
        .mobile-nav-fab img { width: 3.2rem; height: 3.2rem; margin-top: 0.3rem; object-fit: contain; filter: brightness(0) invert(1); }
        .mobile-nav-fab span { font-size: 0.55rem; font-weight: 700; margin-top: -0.8rem; }
    }

    /* TABLET ADJUSTMENTS */
    @media (min-width: 768px) and (max-width: 950px) {
        .report-page-root { background-color: var(--card-bg); padding-bottom: 6rem; }
        .report-container {
            margin: 2rem auto;
            max-width: 750px;
            width: 92%;
            padding: 0;
        }
        .main-form-card {
            background: var(--bg-white);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            padding: 2.5rem;
            box-shadow: var(--shadow-sm);
        }
        .mobile-warning {
            max-width: 750px;
            width: 92%;
            margin: 1.5rem auto 2rem auto;
            box-sizing: border-box;
        }
        .warning-banner {
            margin: 0 0 2rem 0;
            padding: 1.5rem;
        }
        .step-section {
            margin: 0 0 2rem 0;
        }
        .two-col-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        .location-box {
            flex-direction: row;
            justify-content: space-between;
            gap: 0.5rem;
        }
        .map-preview {
            width: 100px;
            height: 80px;
        }
        .type-grid {
            grid-template-columns: repeat(5, 1fr);
        }
        .mobile-bottom-nav {
            justify-content: center;
            gap: 2rem;
        }
        .mobile-nav-item, .mobile-nav-fab-wrapper {
            width: auto;
            min-width: 4.5rem;
        }
    }
`;

export const reportFireMarkup = `
    <div class="report-page-root">
        <!-- DESKTOP HEADER -->
        <header class="top-header">
            <div class="header-left">
                <img src="/images/Logo.webp" alt="ALAB Logo" class="brand-logo">
            </div>
            
            <div class="header-nav">
                <div class="nav-item-wrapper">
                    <a href="/resident" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                        </svg>
                        Home
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/reports" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        Reports
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/report-fire" class="nav-item active report-fire-nav">
                        <div class="nav-icon">
                            <img src="/images/fire logo.webp" alt="Report Fire Logo" class="fire-logo-tint" />
                        </div>
                        Report Fire
                    </a>
                </div>
                <div class="nav-item-wrapper">
                    <a href="/resident/guide" class="nav-item">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
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
                        <img src="/images/user_avatar_placeholder.png" alt="Profile" onerror="this.src='https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=1e293b&color=fff&size=150'">
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

        <!-- MOBILE TOP HEADER -->
        <header class="mobile-top-header" style="display: none;">
            <h1 class="mobile-page-title">Report Fire</h1>
            <button class="notification-btn mobile-notif-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span class="notification-badge" style="position: absolute; top: 0; right: 0; background: var(--primary-red); color: white; font-size: 0.65rem; font-weight: 700; width: 1.1rem; height: 1.1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">1</span>
            </button>
        </header>
        <div class="mobile-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            WARNING: Send alerts only for real fire emergencies. False reports are illegal.
        </div>

        <main class="report-container">
            
            <!-- LEFT COLUMN -->
            <div class="left-col" style="display:flex; flex-direction:column; gap:1rem;">
                <div class="card account-card">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Your Account
                    </div>
                    <div class="account-info">
                        <strong>Account details are automatically filled.</strong>
                        Location and profile information are securely attached to this report.
                    </div>
                </div>

                <div class="card assistance-card">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Need Assistance?
                    </div>
                    <p class="text-sm-muted" style="margin-bottom:0.5rem;">For immediate assistance, contact your local BFP office or dial 911.</p>
                    <button class="btn-outline-red">View Emergency Contacts</button>
                </div>
            </div>

            <!-- CENTER COLUMN -->
            <div class="card main-form-card">
                <h2 class="form-header-title">Report a Fire Incident</h2>
                
                <div class="warning-banner">
                    <img src="/images/fire logo.webp" alt="Fire Emergency Logo" style="width: 2.8rem; height: 2.8rem; object-fit: contain; flex-shrink: 0;" />
                    <div class="warning-banner-text">
                        <h3>Fire Emergency</h3>
                        <p>Move to a safe location before sending the report.</p>
                    </div>
                </div>

                <div class="two-col-grid">
                    <div class="step-section">
                        <div class="step-title" style="justify-content:space-between;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <div class="step-number">1</div> LOCATION
                            </div>
                            <span class="location-status" data-location-status>LOCATING...</span>
                        </div>
                        <div class="location-box" data-location-card data-location-latitude="" data-location-longitude="">
                            <div class="location-details">
                                <h4>
                                    <svg class="location-heading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
                                    <span data-location-title>Detecting location</span>
                                </h4>
                                <p data-location-text>Allow location access in your browser to attach your position.</p>
                                <div class="accuracy" data-location-accuracy>Waiting for permission...</div>
                                <div class="location-error" data-location-error hidden></div>
                                <div class="action-btn-row">
                                    <button type="button" class="btn-small-outline" data-location-adjust><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> Adjust Pin</button>
                                    <button type="button" class="btn-small-outline" data-location-refresh><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Detect my location</button>
                                </div>
                            </div>
                            <div class="map-preview" data-location-preview aria-hidden="true"><img src="/images/fire logo.webp" alt="ALAB fire response location" /></div>
                        </div>
                    </div>

                    <div class="step-section">
                        <div class="step-title">
                            <div class="step-number">2</div> NEAREST LANDMARK
                        </div>
                        <div class="location-box" style="flex-direction:column; justify-content:flex-start; gap:0.8rem;">
                            <div class="location-details">
                                <h4>Nearest Landmark</h4>
                                <p>Suggested: San Jose Public Market</p>
                            </div>
                            <div class="action-btn-row">
                                <button class="btn-small-outline"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Correct</button>
                                <button class="btn-small-outline"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Change</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="step-section">
                    <div class="step-title">
                        <div class="step-number">3</div> WHAT IS BURNING?
                    </div>
                    <div class="type-grid">
                        <div class="type-btn selected">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            House/Building
                        </div>
                        <div class="type-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-8M8 20v-5M16 20v-6M4 20v-3M20 20v-4"/></svg>
                            Grass Fire
                        </div>
                        <div class="type-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 19 14 15 14 18 22 6 22 9 14 5 14 12 2"/></svg>
                            Forest Fire
                        </div>
                        <div class="type-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a2 2 0 00-1.6-.8H9.3a2 2 0 00-1.6.8L5 11l-5.16.86a1 1 0 00-.84.99V16h3m10 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-10 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0"/></svg>
                            Vehicle Fire
                        </div>
                        <div class="type-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                            Other
                        </div>
                    </div>
                </div>

                <div class="two-col-grid">
                    <div class="step-section" style="margin-bottom:0;">
                        <div class="step-title">
                            <div class="step-number">4</div> SHORT DESCRIPTION <span style="color:var(--text-muted); font-weight:500; font-size:0.8rem;">(OPTIONAL)</span>
                        </div>
                        <textarea class="desc-input" placeholder="Example: Fire is spreading to another house."></textarea>
                    </div>

                    <div class="step-section" style="margin-bottom:0;">
                        <div class="step-title">
                            <div class="step-number">5</div> ADD FIRE PHOTO <span style="color:var(--text-muted); font-weight:500; font-size:0.8rem;">(OPTIONAL)</span>
                        </div>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">Optional. Upload only when safe.</p>
                        <div class="photo-actions">
                            <button class="btn-small-outline" style="justify-content:center; padding:0.8rem;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Take Photo</button>
                            <button class="btn-small-outline" style="justify-content:center; padding:0.8rem;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Choose Photo</button>
                        </div>
                    </div>
                </div>

                <div class="form-footer">
                    <button class="btn-primary">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                        SEND FIRE ALERT
                    </button>
                    <button class="btn-cancel">Cancel</button>
                </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="right-col" style="display:flex; flex-direction:column; gap:1rem;">
                <div class="card safety-card">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        Safety Reminder
                    </div>
                    <ul class="safety-list">
                        <li>Stay calm.</li>
                        <li>Move away from the fire.</li>
                        <li>Do not return for belongings.</li>
                        <li>Follow responder instructions.</li>
                    </ul>
                </div>

                <div class="card incident-card">
                    <div class="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Nearby Active Incident
                    </div>
                    <p style="font-size:0.9rem; font-weight:500; margin-bottom:1rem; color:var(--text-dark); line-height:1.4;">A fire incident has already been reported near your location.</p>
                    <button class="btn-outline-red" style="margin-bottom:0.8rem;">View Existing Incident</button>
                    <button class="btn-solid-red" style="margin-bottom:1rem;">Report a Different Fire</button>
                    <p class="text-sm-muted">Avoid duplicate reports to help responders act faster.</p>
                </div>
            </div>

        </main>

        <!-- Mobile Bottom Navigation -->
        <nav class="mobile-bottom-nav">
            <a href="/resident" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                Home
            </a>
            <a href="/resident/reports" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Guide
            </a>
            <a href="/resident/profile" class="mobile-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
            </a>
        </nav>
    </div>
`;

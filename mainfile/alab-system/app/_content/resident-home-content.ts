export const homeStyles = `
    :root {
        --primary-red: #d91b10;
        --primary-red-hover: #DB1B0D;
        --bg-color: #fafaf9;
        --card-bg: #ffffff;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    .dashboard-page-root {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
    }

    /* MAIN CONTAINER */
    .dashboard-container {
        max-width: 1400px;
        margin: 2rem auto;
        padding: 0 2rem;
        display: grid;
        grid-template-columns: 1fr 1.5fr 1fr;
        gap: 1.8rem;
    }

    .card {
        background: var(--card-bg);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
    }

    .card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: 1rem;
    }

    /* WELCOME CARD */
    .welcome-card {
        grid-column: 1 / 2;
        min-height: 16rem;
        justify-content: space-between;
    }

    .welcome-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
    }

    .welcome-center-graphic {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .mock-profile-pic {
        width: 6rem;
        height: 6rem;
        background: var(--primary-red);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        z-index: 2;
        border: 4px solid white;
        box-shadow: 0 4px 15px rgba(217, 27, 16, 0.2);
    }
    
    .mock-profile-pic svg {
        width: 3rem;
        height: 3rem;
    }

    .profile-anim-ring {
        position: absolute;
        width: 6rem;
        height: 6rem;
        border-radius: 50%;
        border: 2px solid var(--primary-red);
        z-index: 1;
        animation: profilePulse 2.5s infinite ease-out;
    }

    .profile-anim-ring.delay-1 {
        animation-delay: 1.25s;
    }

    @keyframes profilePulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(2); opacity: 0; }
    }

    .user-profile-group {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .user-avatar {
        width: 3.5rem;
        height: 3.5rem;
        background: #fee2e2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-red);
    }

    .user-avatar svg {
        width: 1.8rem;
        height: 1.8rem;
    }

    .user-details h2 {
        font-size: 1.15rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
        line-height: 1.2;
    }

    .location-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.95rem;
        color: var(--text-muted);
    }

    .location-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .location-row svg {
        width: 1rem;
        height: 1rem;
        color: var(--primary-red);
    }

    .welcome-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
        font-size: 0.85rem;
        color: var(--text-muted);
        font-weight: 500;
    }

    .emergency-card {
        grid-column: 2 / 3;
        min-height: 16rem;
        background: linear-gradient(180deg, #ffffff 0%, #ffffff 60%, #fff1f1 100%);
        border: 1px solid #ffe4e4;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.2rem;
        position: relative;
        overflow: hidden;
        text-align: center;
        padding: 1.5rem;
    }

    /* Red dotted pattern background for emergency card (only on right side) */
    .emergency-card::before {
        content: '';
        position: absolute;
        top: 0; bottom: 0; right: 0; width: 40%;
        background-image: radial-gradient(#fecaca 1.5px, transparent 1.5px);
        background-size: 15px 15px;
        opacity: 0.8;
        z-index: 0;
        mask-image: linear-gradient(to right, transparent, black);
        -webkit-mask-image: linear-gradient(to right, transparent, black);
    }

    .emergency-icon-wrapper {
        width: 6.5rem;
        height: 6.5rem;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 25px rgba(217, 27, 16, 0.15);
        z-index: 1;
        flex-shrink: 0;
        position: relative;
    }

    .emergency-icon-wrapper img {
        width: 5.5rem;
        height: 5.5rem;
        object-fit: contain;
    }

    .emergency-content {
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .emergency-content h2 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #d31212;
        margin-bottom: 0.8rem;
        letter-spacing: -0.01em;
        white-space: normal;
        line-height: 1.2;
    }

    .btn-report-fire {
        background: #cc0000;
        color: white;
        border: none;
        padding: 1.2rem 3.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        border-radius: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(204, 0, 0, 0.25);
        transition: all 0.2s;
    }

    .btn-report-fire:hover {
        background: var(--primary-red-hover);
        transform: translateY(-2px);
    }

    .emergency-hint {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 1rem;
        text-align: center;
    }

    /* NEARBY INCIDENT */
    .nearby-card {
        grid-column: 3 / 4;
        min-height: 16rem;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 1.2rem;
    }
    
    .nearby-content {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .nearby-icon {
        color: var(--primary-red);
        background: #fee2e2;
        padding: 0.5rem;
        border-radius: 0.5rem;
    }

    .nearby-text {
        font-size: 0.95rem;
        color: var(--text-dark);
        font-weight: 600;
        line-height: 1.4;
    }

    .nearby-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: auto;
    }

    .btn-outline {
        flex: 1;
        padding: 0.6rem;
        background: white;
        border: 1px solid var(--primary-red);
        color: var(--primary-red);
        font-weight: 600;
        font-size: 0.8rem;
        border-radius: 0.4rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-outline:hover {
        background: #fff5f5;
    }

    .btn-solid {
        flex: 1;
        padding: 0.6rem;
        background: var(--primary-red);
        border: 1px solid var(--primary-red);
        color: white;
        font-weight: 600;
        font-size: 0.8rem;
        border-radius: 0.4rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-solid:hover {
        background: var(--primary-red-hover);
    }


    /* REPORT STATUS */
    .status-card {
        grid-column: 1 / 2;
    }
    .status-grid {
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        height: 100%;
        width: 100%;
    }
    
    .status-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        flex: 1;
    }

    .status-icon {
        width: 2.2rem;
        height: 2.2rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .status-icon.blue { background: #e0f2fe; color: #0284c7; }
    .status-icon.orange { border: 2px solid #ea580c; color: #ea580c; background: white; border-radius: 50%;}
    .status-icon.green { border: 2px solid #16a34a; color: #16a34a; background: white; border-radius: 50%;}
    .status-icon.gray { background: #f1f5f9; color: #475569; }

    .status-count {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text-dark);
        line-height: 1;
        margin-top: 0.2rem;
    }

    .status-label {
        font-size: 0.7rem;
        color: var(--text-muted);
        font-weight: 600;
    }

    .status-divider {
        width: 1px;
        height: 2.5rem;
        background: var(--border-color);
    }

    /* RECENT REPORTS */
    .recent-card {
        grid-column: 2 / 3;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .view-all {
        font-size: 0.8rem;
        color: var(--primary-red);
        font-weight: 600;
        text-decoration: none;
    }

    .report-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .report-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.8rem;
        border-bottom: 1px solid var(--border-color);
    }
    .report-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }

    .report-id {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-dark);
    }

    .report-badge {
        padding: 0.2rem 0.6rem;
        border-radius: 0.3rem;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .report-badge.verifying { background: #ffedd5; color: #ea580c; }
    .report-badge.submitted { background: #e0f2fe; color: #0369a1; }
    .report-badge.confirmed { background: #dcfce7; color: #15803d; }
    .report-badge.closed { background: #f1f5f9; color: #475569; }
    .report-empty { padding: 0.35rem 0; color: var(--text-muted); font-size: 0.85rem; }

    .btn-view {
        padding: 0.3rem 0.8rem;
        border: 1px solid var(--primary-red);
        color: var(--primary-red);
        background: transparent;
        border-radius: 0.3rem;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
    }

    /* FIRE SAFETY REMINDER */
    .safety-card {
        grid-column: 3 / 4;
    }
    .safety-content {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
    }
    .safety-icon {
        color: var(--primary-red);
        background: #fee2e2;
        padding: 0.8rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .safety-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        font-size: 1rem;
        color: var(--text-dark);
        font-weight: 500;
    }
    .safety-list li {
        font-size: 1rem;
        color: var(--text-dark);
        font-weight: 500;
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
    }
    .safety-list li::before {
        content: '•';
        color: var(--primary-red);
        font-weight: bold;
        font-size: 1.2rem;
        line-height: 0.8;
    }

    /* RESPONSIVE DESIGN (MOBILE FOCUS) */
    @media (max-width: 950px) {
        .dashboard-page-root {
            background-color: #f5f3f0;
            padding-bottom: 6rem;
            width: 100%;
            max-width: 100vw;
            overflow-x: clip;
            overscroll-behavior-x: none;
        }
        
        .dashboard-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 100%;
            padding: 0 0.9rem;
            margin: 0;
            gap: 0.9rem;
        }

        .card {
            border: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
            border-radius: 1rem;
        }

        /* ===== REDESIGNED WELCOME CARD ===== */
        .welcome-card {
            border: none;
            min-height: auto;
            padding: 1rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
            margin-top: 0.9rem;
            position: relative;
            z-index: 0;
        }

        .welcome-center-graphic {
            display: none;
        }

        .welcome-card .welcome-header {
            margin-bottom: 0;
        }

        .welcome-card .user-avatar {
            width: 2.8rem;
            height: 2.8rem;
            background: linear-gradient(135deg, #fecaca, #fee2e2);
        }

        .welcome-card .user-details h2 {
            font-size: 1.05rem;
            color: var(--text-dark);
        }

        .welcome-card .location-info {
            font-size: 0.85rem;
        }

        .welcome-footer {
            padding-top: 0.7rem;
            margin-top: 0.7rem;
        }

        /* Hide desktop emergency card, nearby incident */
        .emergency-card, .nearby-card {
            display: none;
        }

        /* ===== MASSIVE MOBILE EMERGENCY BUTTON ===== */
        .mobile-emergency-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 15rem;
            margin: 1.5rem 0 0.75rem;
            position: relative;
            overflow: visible;
            z-index: 1;
        }

        .radar-animation {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12.5rem;
            height: 12.5rem;
            pointer-events: none;
            z-index: 0;
            margin-top: -1.2rem;
        }

        .radar-ring {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-sizing: border-box;
            opacity: 0;
            animation: radarPulse 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .radar-ring.ring-1 {
            border: 2px solid rgba(217, 27, 16, 0.5);
            animation-delay: 0s;
        }

        .radar-ring.ring-2 {
            border: 2px dashed rgba(217, 27, 16, 0.4);
            animation-delay: 1s;
        }

        .radar-ring.ring-3 {
            border: 1px solid rgba(217, 27, 16, 0.3);
            animation-delay: 2s;
        }

        @keyframes radarPulse {
            0% {
                transform: scale(1);
                opacity: 0.8;
            }
            70% {
                opacity: 0.15;
            }
            100% {
                transform: scale(2.4);
                opacity: 0;
            }
        }

        @keyframes buttonGlow {
            0% {
                box-shadow: 0 0 0 4px var(--primary-red), 0 10px 25px rgba(217, 27, 16, 0.3);
            }
            50% {
                box-shadow: 0 0 0 6px var(--primary-red), 0 0 50px rgba(217, 27, 16, 0.5);
            }
            100% {
                box-shadow: 0 0 0 4px var(--primary-red), 0 10px 25px rgba(217, 27, 16, 0.3);
            }
        }

        .mobile-emergency-btn {
            width: 12.5rem;
            height: 12.5rem;
            border-radius: 50%;
            background: linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #b91c1c 100%);
            border: 6px solid white;
            box-shadow: 0 0 0 4px var(--primary-red), 0 10px 25px rgba(217, 27, 16, 0.3);
            animation: buttonGlow 3s ease-in-out infinite;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding-bottom: 0.8rem;
            color: white;
            text-decoration: none;
            z-index: 1;
            cursor: pointer;
            transition: transform 0.1s;
            position: relative;
        }

        .mobile-emergency-btn:active {
            transform: scale(0.94);
        }

        .mobile-emergency-btn img {
            width: 3.8rem;
            height: 3.8rem;
            margin-bottom: 0.1rem;
            object-fit: contain;
            filter: brightness(0) invert(1);
        }

        .mobile-emergency-btn h2 {
            font-size: 1.4rem;
            font-weight: 800;
            margin-bottom: 0.2rem;
            letter-spacing: 0.05em;
        }

        .mobile-emergency-btn .tap-text {
            background: rgba(255, 255, 255, 0.95);
            color: var(--primary-red);
            padding: 0.3rem 0.9rem;
            border-radius: 2rem;
            font-size: 0.7rem;
            font-weight: 800;
        }


        .safety-first-hint {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-muted);
            font-size: 0.85rem;
            font-weight: 500;
            margin-top: 1.5rem;
            z-index: 1;
        }
        .safety-first-hint svg {
            color: var(--primary-red);
            width: 1.2rem;
            height: 1.2rem;
        }

        /* ===== REDESIGNED REPORT STATUS CARD ===== */
        .status-card {
            background: white;
            border: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .status-card .card-title {
            font-size: 0.95rem;
            font-weight: 700;
        }
        .status-grid {
            padding: 0.3rem 0;
        }
        .status-count {
            font-size: 1.35rem;
            font-weight: 800;
        }
        .status-icon {
            width: 1.8rem;
            height: 1.8rem;
        }

        /* ===== REDESIGNED RECENT REPORTS CARD ===== */
        .recent-card {
            background: white;
            border: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }

        /* ===== REDESIGNED SAFETY CARD ===== */
        .safety-card {
            background: white;
            border: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
    }
    
    @media (min-width: 951px) {
        .mobile-emergency-wrapper {
            display: none;
        }
    }
`;

export const homeMarkup = `
    <div class="dashboard-page-root">
        <main class="dashboard-container">
            
            <!-- Welcome Card -->
            <div class="card welcome-card">
                <div class="welcome-header">
                    <div class="user-profile-group">
                        <div class="user-avatar">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        </div>
                        <div class="user-details">
                            <h2 data-dashboard-name>Welcome, Resident Name</h2>
                            <div class="location-info">
                                <div class="location-row">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <span data-dashboard-municipality>San Jose</span>
                                </div>
                                <div class="location-row">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
                                    <span data-dashboard-barangay>Barangay 8</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
                
                <div class="welcome-center-graphic">
                    <div class="profile-anim-ring"></div>
                    <div class="profile-anim-ring delay-1"></div>
                    <div class="mock-profile-pic">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                </div>

                <div class="welcome-footer">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span id="currentDate">Aug 2, 2025</span> &bull; <span id="currentTime">11:05 AM</span>
                </div>
            </div>

            <!-- Desktop Emergency Card -->
            <div class="card emergency-card">
                <div class="emergency-icon-wrapper">
                    <div class="radar-animation" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%;">
                        <div class="radar-ring ring-1"></div>
                        <div class="radar-ring ring-2"></div>
                        <div class="radar-ring ring-3"></div>
                    </div>
                    <img src="/images/fire logo.webp" alt="Fire Logo" style="position: relative; z-index: 1;" />
                </div>
                <div class="emergency-content">
                    <h2>Report a Fire Emergency</h2>
                    <button class="btn-report-fire">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        REPORT FIRE
                    </button>
                    <div class="emergency-hint">For immediate danger, move to a safe location and report.</div>
                </div>
            </div>

            <!-- Desktop Nearby Incident -->
            <div class="card nearby-card">
                <h3 class="card-title">Nearby Active Incident</h3>
                <div class="nearby-content">
                    <svg class="nearby-icon" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M17.66 11.2c-.23-.3-.51-.59-.77-.85-.68-.68-1.44-1.21-2.12-1.78-1.57-1.32-2.73-3.13-2.92-5.18-.04-.38-.49-.57-.79-.34-1.3 1.01-2.4 2.4-3.1 3.96-.54 1.18-.84 2.48-.84 3.82 0 .54.06 1.07.16 1.58-.93-.83-1.61-1.99-1.85-3.3-.06-.32-.47-.44-.7-.2-.73.74-1.28 1.69-1.55 2.72C3 12.43 3 13.22 3 14c0 4.97 4.03 9 9 9s9-4.03 9-9c0-1.02-.27-2.02-.74-2.8z"/>
                    </svg>
                    <div class="nearby-text">
                        Fire reported near your area. <br>
                        Stay alert and be prepared.
                        <div class="nearby-meta" style="margin-top: 0.8rem; font-size: 0.85rem; color: #64748b; font-weight: 500;">
                            <strong>Location:</strong> San Jose<br>
                            <strong>Reported:</strong> 10 minutes ago<br>
                            <strong>Alert Level:</strong> <span style="color: #d31212; font-weight: 700;">Active</span>
                        </div>
                    </div>
                </div>
                <div class="nearby-actions">
                    <button class="btn-outline">View Status</button>
                    <button class="btn-solid">Continue Report</button>
                </div>
            </div>

            <!-- Mobile ONLY Massive Emergency Button -->
            <div class="mobile-emergency-wrapper">
                <div class="radar-animation">
                    <div class="radar-ring ring-1"></div>
                    <div class="radar-ring ring-2"></div>
                    <div class="radar-ring ring-3"></div>
                </div>
                <a href="/resident/report-fire" class="mobile-emergency-btn" aria-label="Report a fire">
                    <img src="/images/fire logo.webp" alt="Fire Logo" />
                    <h2>REPORT FIRE</h2>
                    <div class="tap-text">TAP TO REPORT FIRE</div>
                </a>
                <div class="safety-first-hint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    Move to safety first.
                </div>
            </div>

            <!-- Report Status Card -->
            <div class="card status-card">
                <h3 class="card-title">Report Status</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-icon blue">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <div class="status-count" data-dashboard-count="submitted">0</div>
                        <div class="status-label">Submitted</div>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-item">
                        <div class="status-icon orange">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="status-count" data-dashboard-count="verifying">0</div>
                        <div class="status-label">Verifying</div>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-item">
                        <div class="status-icon green">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        <div class="status-count" data-dashboard-count="confirmed">0</div>
                        <div class="status-label">Confirmed</div>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-item">
                        <div class="status-icon gray">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 5H7a2 2 0 0 0-2 2v1"/><path d="M12 5h5a2 2 0 0 1 2 2v1"/></svg>
                        </div>
                        <div class="status-count" data-dashboard-count="closed">0</div>
                        <div class="status-label">Closed</div>
                    </div>
                </div>
            </div>

            <!-- Recent Reports Card -->
            <div class="card recent-card">
                <div class="card-header">
                    <h3 class="card-title" style="margin: 0;">Recent Reports</h3>
                    <a href="/resident/reports" class="view-all">View All</a>
                </div>
                <div class="report-list" data-dashboard-recent>
                    <div class="report-empty">No reports yet.</div>
                </div>
            </div>

            <!-- Fire Safety Reminder Card -->
            <div class="card safety-card">
                <h3 class="card-title">Fire Safety Reminder</h3>
                <div class="safety-content">
                    <div class="safety-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 12c-1.6 0-3-1.4-3-3s1.4-3 3-3 3 1.4 3 3-1.4 3-3 3z"/></svg>
                    </div>
                    <ul class="safety-list">
                        <li>Stay calm and move away from the fire.</li>
                        <li>Do not return to the area.</li>
                        <li>Follow instructions of responders.</li>
                    </ul>
                </div>
            </div>

        </main>
    </div>
`;

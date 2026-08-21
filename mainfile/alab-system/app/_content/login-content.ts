export const loginStyles = `
        :root {
            --primary-red: #d91b10;
            --primary-red-hover: #b8150c;
            --bg-cream: #fcf8f3;
            --card-bg: #ffffff;
            --text-dark: #000000;
            --text-muted: #334155;
            --border-color: rgba(71, 85, 105, 0.35);
            /* Reduced opacity border */
            --input-focus: rgba(217, 27, 16, 0.15);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        .login-page-root {
            font-family: var(--font-plus-jakarta), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-cream);
            background-image:
                radial-gradient(circle at 10% 20%, rgba(217, 27, 16, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(217, 27, 16, 0.05) 0%, transparent 40%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: clamp(0.75rem, 2vw, 1.5rem);
            color: var(--text-dark);
        }

        .login-container {
            position: relative;
            width: min(96vw, 78rem);
            min-height: 42rem;
            max-height: min(94vh, 48rem);
            background: var(--card-bg);
            border-radius: 1.8rem;
            box-shadow:
                0 2rem 4rem rgba(18, 21, 23, 0.08),
                0 0.5rem 1.5rem rgba(18, 21, 23, 0.04),
                0 0 0 1px rgba(0, 0, 0, 0.02);
            display: grid;
            grid-template-columns: 1.35fr 0.85fr;
            padding: 0.85rem;
            gap: clamp(1.2rem, 2.5vw, 2.5rem);
            align-items: stretch;
            /* Modified to allow pushing form to top */
            overflow: hidden;
            animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardFadeIn {
            from {
                opacity: 0;
                transform: translateY(1.5rem) scale(0.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Left Side: Image Banner with Rich Black Bottom Gradient */
        .login-banner {
            position: relative;
            height: 100%;
            min-height: 40rem;
            border-radius: 1.4rem;
            overflow: hidden;
            background: #1a0806;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .login-banner img.bg-image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            z-index: 1;
            transition: transform 7s ease;
        }

        .login-banner::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.45) 25%, transparent 60%);
            z-index: 2;
            pointer-events: none;
        }

        .login-container:hover .login-banner img.bg-image {
            transform: scale(1.03);
        }

        /* Right Side: Login Form - Pushed to TOP */
        .login-form-wrapper {
            padding: clamp(0.4rem, 1.2vw, 1rem) clamp(1rem, 2.5vw, 2.4rem) clamp(0.8rem, 2vw, 1.5rem) 0.5rem;
            max-width: 29rem;
            width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            /* Content grouped together, slightly pushed up */
        }

        .form-header {
            text-align: center;
            margin-top: -25px;
            /* Pushed up more */
            margin-bottom: calc(1.5rem + 7px);
            /* Push form down 7px */
        }

        .form-header .logo-icon {
            height: 7rem;
            /* Large prominent size as requested */
            width: auto;
            margin-bottom: -0.15rem;
            /* Reduced to push Welcome text slightly to the top */
            filter: drop-shadow(0 0.5rem 1rem rgba(217, 27, 16, 0.15));
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .form-header .logo-icon:hover {
            transform: scale(1.08) rotate(-2deg);
        }

        .form-header h1 {
            font-size: clamp(2rem, 2.9vw, 2.4rem);
            font-weight: 880;
            color: var(--text-dark);
            letter-spacing: -0.04em;
            margin-top: -0.25rem;
            /* Pushes ONLY this text slightly upward to the top */
            margin-bottom: 0.2rem;
        }

        .form-header p {
            color: var(--text-muted);
            font-size: 0.95rem;
            font-weight: 500;
        }

        .form-group {
            margin-bottom: 1.2rem;
            position: relative;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 1.1rem;
            color: #1e293b;
            width: 1.2rem;
            height: 1.2rem;
            pointer-events: none;
            transition: color 0.2s ease;
        }

        .form-input {
            width: 100%;
            padding: 1rem 1.2rem 1rem 3rem;
            font-size: 0.94rem;
            font-family: inherit;
            color: #000000;
            background: #f8fafc;
            border: 1.5px solid var(--border-color);
            border-radius: 10px;
            outline: none;
            transition: all 0.2s ease;
            font-weight: 600;
        }

        .form-input::placeholder {
            color: #475569;
            font-weight: 500;
        }

        .form-input:focus {
            border-color: var(--primary-red);
            box-shadow: 0 0 0 4px var(--input-focus);
            background: #ffffff;
        }

        .form-input:focus+.input-icon,
        .input-wrapper:focus-within .input-icon {
            color: var(--primary-red);\n        }

        .toggle-password {
            position: absolute;
            right: 1.1rem;
            background: none;
            border: none;
            color: #1e293b;
            cursor: pointer;
            padding: 0.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
        }

        .toggle-password:hover {
            color: var(--primary-red);
        }

        .forgot-password {
            display: block;
            text-align: right;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--primary-red);
            text-decoration: none;
            margin: 0.5rem 0 1.5rem;
            transition: color 0.2s ease;
        }

        .forgot-password:hover {
            color: var(--primary-red-hover);
            text-decoration: underline;
        }

        .btn-submit {
            width: 100%;
            padding: 1.1rem;
            background: linear-gradient(135deg, #e8331a 0%, #c4160a 100%);
            /* Gradient red */
            color: #ffffff;
            font-size: 1rem;
            font-weight: 850;
            font-family: inherit;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 0.5rem 1.8rem rgba(217, 27, 16, 0.35);
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .btn-submit:hover {
            background: var(--primary-red-hover);
            transform: translateY(-2px);
            box-shadow: 0 0.8rem 2rem rgba(217, 27, 16, 0.38);
        }

        .btn-submit:active {
            transform: translateY(0);
            box-shadow: 0 0.3rem 0.8rem rgba(217, 27, 16, 0.2);
        }

        .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 1.4rem 0;
            color: #334155;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.05em;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1.5px solid #94a3b8;
        }

        .divider:not(:empty)::before {
            margin-right: 1rem;
        }

        .divider:not(:empty)::after {
            margin-left: 1rem;
        }

        /* 3 Social Buttons Grid matching screenshot */
        .social-login-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.7rem;
            width: 100%;
        }

        .btn-social {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            padding: 0.82rem 0.4rem;
            background: #ffffff;
            border: 1.5px solid var(--border-color);
            border-radius: 0.75rem;
            color: #000000;
            font-size: 0.9rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-social:hover {
            background: #f8fafc;
            border-color: #000000;
            transform: translateY(-2px);
            box-shadow: 0 0.4rem 1rem rgba(0, 0, 0, 0.08);
        }

        .btn-social:active {
            transform: translateY(0);
        }

        .social-icon {
            width: 1.3rem;
            height: 1.3rem;
            flex-shrink: 0;
        }

        .register-link {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.88rem;
            color: var(--text-muted);
            font-weight: 500;
        }

        .register-link a {
            color: var(--primary-red);\n            font-weight: 750;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .register-link a:hover {
            color: var(--primary-red-hover);
            text-decoration: underline;
        }

        .back-btn {
            position: absolute;
            top: clamp(1.2rem, 2.5vw, 2rem);
            left: clamp(1.2rem, 2.5vw, 2rem);
            z-index: 100;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.8rem;
            height: 2.8rem;
            background: #e2e8f0;
            color: #334155;
            text-decoration: none;
            border-radius: 50%;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 0.3rem 0.8rem rgba(0, 0, 0, 0.05);
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .back-btn:hover {
            background: #cbd5e1;
            color: #0f172a;
            transform: translateX(-3px);
            box-shadow: 0 0.5rem 1.2rem rgba(0, 0, 0, 0.1);
        }

        /* Responsive adjustments - Native Fullscreen on Mobile */
        @media (max-width: 950px) {
            .login-page-root {
                background-color: #ffffff !important;
                background-image: none !important;
                padding: 0 !important;
                margin: 0 !important;
                min-height: 100vh !important;
                min-height: 100dvh !important;
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                justify-content: flex-start !important;
            }

            .login-container {
                grid-template-columns: 1fr !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                min-height: 100vh !important;
                min-height: 100dvh !important;
                height: auto !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
                padding: 4.2rem 1.4rem 2.5rem !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                animation: none !important;
            }

            .back-btn {
                top: 1.25rem !important;
                left: 1.25rem !important;
                width: 2.6rem !important;
                height: 2.6rem !important;
                background: #f1f5f9 !important;
                border: 1px solid #cbd5e1 !important;
            }

            .login-banner {
                display: none !important;
            }

            .login-form-wrapper {
                padding: 0 !important;
                max-width: 28rem !important;
                width: 100% !important;
                margin: 0 auto !important;
            }
        }
    `;

export const loginMarkup = "<main class=\"login-container\">\n        <a href=\"/\" class=\"back-btn\" title=\"Back to Landing Page\" aria-label=\"Back\">\n            <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"width: 1.3rem; height: 1.3rem;\">\n                <path d=\"M19 12H5\" />\n                <path d=\"M12 19l-7-7 7-7\" />\n            </svg>\n        </a>\n        <!-- Left Column: Side Pic with ALAB branding at bottom -->\n        <aside class=\"login-banner\">\n            <img src=\"/images/side pic for login.webp\"\n                alt=\"ALAB Emergency Response App on mobile phone with fire truck\" class=\"bg-image\">\n            <div style=\"position: relative; z-index: 3; padding: 1.5rem 1.8rem; display: flex; align-items: center; gap: 0.8rem;\">\n                <img src=\"/images/LOGO FIRE.webp\" alt=\"ALAB Logo\" style=\"height: 4.5rem; width: auto; filter: drop-shadow(0 0.3rem 0.8rem rgba(0,0,0,0.4));\">\n                <div>\n                    <div style=\"color: #ffffff; font-size: 1.15rem; font-weight: 800; letter-spacing: 0.01em;\">ALAB Emergency Response</div>\n                    <div style=\"color: rgba(255,255,255,0.75); font-size: 0.82rem; font-weight: 500;\">Quick help. Real-time response. Safer communities.</div>\n                </div>\n            </div>\n        </aside>\n\n        <!-- Right Column: Login Form pushed to top -->\n        <section class=\"login-form-wrapper\">\n            <header class=\"form-header\">\n                <a href=\"/\" title=\"Back to ALAB Home\">\n                    <img src=\"/images/Logo.webp\" alt=\"ALAB Logo\" class=\"logo-icon\">\n                </a>\n                <h1>Welcome</h1>\n                <p>Resident or Citizen Reporter login for resident fire reporting.</p>\n            </header>\n\n            <form id=\"loginForm\" action=\"/resident\" method=\"get\">\n                <div class=\"form-group\">\n                    <div class=\"input-wrapper\">\n                        <svg class=\"input-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"\n                            stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n                            <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />\n                            <path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\" />\n                        </svg>\n                        <input type=\"text\" id=\"username\" class=\"form-input\" placeholder=\"Resident username or email\" required\n                            autocomplete=\"username\">\n                    </div>\n                </div>\n\n                <div class=\"form-group\">\n                    <div class=\"input-wrapper\">\n                        <svg class=\"input-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"\n                            stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\n                            <rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\" />\n                            <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />\n                        </svg>\n                        <input type=\"password\" id=\"password\" class=\"form-input\" placeholder=\"Password\" required\n                            autocomplete=\"current-password\">\n                        <button type=\"button\" class=\"toggle-password\" id=\"togglePasswordBtn\"\n                            aria-label=\"Toggle password visibility\">\n                            <svg id=\"eyeIcon\" viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\"\n                                stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                                <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\" />\n                                <circle cx=\"12\" cy=\"12\" r=\"3\" />\n                            </svg>\n                        </button>\n                    </div>\n                </div>\n\n                <a href=\"#\" class=\"forgot-password\">Forgot password?</a>\n\n                <button type=\"submit\" class=\"btn-submit\">RESIDENT LOGIN</button>\n\n                <div class=\"divider\">OR</div>\n\n                <!-- Only Google button as requested -->\n                <button type=\"button\" class=\"btn-social\" style=\"width: 100%; padding: 0.9rem;\">\n                    <svg viewBox=\"0 0 24 24\" class=\"social-icon\">\n                        <path fill=\"#4285F4\"\n                            d=\"M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.87Z\" />\n                        <path fill=\"#34A853\"\n                            d=\"M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.12C3.26 21.3 7.35 24 12 24Z\" />\n                        <path fill=\"#FBBC05\"\n                            d=\"M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.24C.45 8.19 0 10.03 0 12s.45 3.81 1.24 5.39l4.04-3.12Z\" />\n                        <path fill=\"#EA4335\"\n                            d=\"M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.24 6.61l4.04 3.12c.95-2.83 3.6-4.98 6.72-4.98Z\" />\n                    </svg>\n                    <span>Google for resident account</span>\n                </button>\n\n                <div class=\"register-link\">\n                    Need a resident account? <a href=\"#\">Register here</a>\n                </div>\n            </form>\n        </section>\n    </main>";

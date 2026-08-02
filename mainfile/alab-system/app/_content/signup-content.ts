export const signupStyles = `
        :root {
            --primary-red: #d91b10;
            --primary-red-hover: #b8150c;
            --bg-cream: #fcf8f3;
            --card-bg: #ffffff;
            --text-dark: #000000;
            --text-muted: #334155;
            --border-color: rgba(71, 85, 105, 0.35);
            --input-focus: rgba(217, 27, 16, 0.15);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        .signup-page-root {
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

        .signup-container {
            position: relative;
            width: min(96vw, 78rem);
            height: clamp(42rem, 94vh, 50rem);
            background: var(--card-bg);
            border-radius: 1.8rem;
            box-shadow:
                0 2rem 4rem rgba(18, 21, 23, 0.08),
                0 0.5rem 1.5rem rgba(18, 21, 23, 0.04),
                0 0 0 1px rgba(0, 0, 0, 0.02);
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            padding: 0.85rem;
            gap: clamp(1.2rem, 2.5vw, 2.5rem);
            align-items: stretch;
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

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Left Side: Image Banner */
        .signup-banner {
            position: relative;
            height: 100%;
            border-radius: 1.4rem;
            overflow: hidden;
            background: #1a0806;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .signup-banner img.bg-image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            z-index: 1;
            transition: transform 7s ease;
        }

        .signup-banner::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(0deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.45) 30%, transparent 65%);
            z-index: 2;
            pointer-events: none;
        }

        .signup-container:hover .signup-banner img.bg-image {
            transform: scale(1.03);
        }

        .banner-content {
            position: relative;
            z-index: 3;
            padding: 2rem 2rem 2.2rem;
        }

        .banner-content h2 {
            color: #ffffff;
            font-size: clamp(1.8rem, 3vw, 2.4rem);
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 0.6rem;
            letter-spacing: -0.02em;
        }

        .banner-content h2 span {
            color: #ff6b56;
        }

        .banner-content p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.92rem;
            font-weight: 500;
            line-height: 1.5;
            max-width: 22rem;
        }

        .banner-bottom {
            position: relative;
            z-index: 3;
            padding: 0 2rem 1.8rem;
            display: flex;
            align-items: center;
            gap: 0.7rem;
        }

        .banner-bottom .badge-icon {
            width: 2.2rem;
            height: 2.2rem;
            background: rgba(217, 27, 16, 0.25);
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .banner-bottom .badge-icon svg {
            width: 1.1rem;
            height: 1.1rem;
            color: #4ade80;
        }

        .banner-bottom .badge-text {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.85rem;
            font-weight: 500;
            line-height: 1.4;
        }

        /* Right Side: Signup Form */
        .signup-form-wrapper {
            padding: clamp(1rem, 2vw, 2rem) clamp(1rem, 2.5vw, 2.4rem);
            max-width: 32rem;
            width: 100%;
            height: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }

        /* Customize scrollbar for form wrapper */
        .signup-form-wrapper::-webkit-scrollbar {
            width: 6px;
        }
        .signup-form-wrapper::-webkit-scrollbar-track {
            background: transparent;
        }
        .signup-form-wrapper::-webkit-scrollbar-thumb {
            background: rgba(71, 85, 105, 0.2);
            border-radius: 10px;
        }
        .signup-form-wrapper::-webkit-scrollbar-thumb:hover {
            background: rgba(71, 85, 105, 0.4);
        }

        .form-header {
            text-align: center;
            margin-bottom: 1rem;
        }

        .form-header .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            margin-bottom: 0.8rem;
        }

        .form-header .logo-icon {
            height: 5rem;
            width: auto;
            filter: drop-shadow(0 0.3rem 0.8rem rgba(217, 27, 16, 0.15));
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .form-header .logo-icon:hover {
            transform: scale(1.08) rotate(-2deg);
        }

        /* Step indicator */
        .step-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.6rem;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--primary-red);
            letter-spacing: 0.03em;
        }

        /* Progress bar */
        .progress-bar {
            width: 100%;
            height: 4px;
            background: #e2e8f0;
            border-radius: 999px;
            margin-bottom: 1.2rem;
            overflow: hidden;
        }

        .progress-bar .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #e8331a, #ff6b56);
            border-radius: 999px;
            transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .form-header h1 {
            font-size: clamp(1.6rem, 2.5vw, 2rem);
            font-weight: 850;
            color: var(--text-dark);
            letter-spacing: -0.04em;
            margin-bottom: 0.2rem;
        }

        .form-header .subtitle {
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 500;
        }

        /* Step panels */
        .step-panel {
            display: none;
            animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .step-panel.active {
            display: block;
        }

        .form-group {
            margin-bottom: 0.9rem;
            position: relative;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.8rem;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 1rem;
            color: #475569;
            width: 1.15rem;
            height: 1.15rem;
            pointer-events: none;
            transition: color 0.2s ease;
        }

        .form-input {
            width: 100%;
            padding: 0.85rem 1rem 0.85rem 2.8rem;
            font-size: 0.88rem;
            font-family: inherit;
            color: #000000;
            background-color: #f8fafc;
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
            background-color: #ffffff;
        }

        .form-input:focus + .input-icon,
        .input-wrapper:focus-within .input-icon {
            color: var(--primary-red);
        }

        select.form-input {
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            padding-right: 2.5rem;
        }

        select.form-input:focus {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23d91b10' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        }

        textarea.form-input {
            min-height: 4.5rem;
            resize: vertical;
            line-height: 1.5;
        }

        .toggle-password {
            position: absolute;
            right: 1rem;
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

        /* Password strength */
        .password-strength {
            display: flex;
            gap: 0.3rem;
            margin-top: 0.4rem;
            padding: 0 0.2rem;
        }

        .strength-bar {
            height: 3px;
            flex: 1;
            background: #e2e8f0;
            border-radius: 999px;
            transition: background 0.3s ease;
        }

        .strength-bar.active.weak { background: #ef4444; }
        .strength-bar.active.medium { background: #f59e0b; }
        .strength-bar.active.strong { background: #22c55e; }

        .strength-label {
            font-size: 0.72rem;
            font-weight: 600;
            margin-top: 0.2rem;
            padding-left: 0.2rem;
            color: var(--text-muted);
        }

        /* Buttons */
        .btn-continue {
            width: 100%;
            padding: 0.95rem;
            background: linear-gradient(135deg, #e8331a 0%, #c4160a 100%);
            color: #ffffff;
            font-size: 0.95rem;
            font-weight: 800;
            font-family: inherit;
            letter-spacing: 0.06em;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 0.5rem 1.8rem rgba(217, 27, 16, 0.30);
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 0.3rem;
        }

        .btn-continue:hover {
            background: linear-gradient(135deg, #c4160a 0%, #a01008 100%);
            transform: translateY(-2px);
            box-shadow: 0 0.8rem 2rem rgba(217, 27, 16, 0.38);
        }

        .btn-continue:active {
            transform: translateY(0);
            box-shadow: 0 0.3rem 0.8rem rgba(217, 27, 16, 0.2);
        }

        .btn-continue .arrow-icon {
            width: 1.1rem;
            height: 1.1rem;
            transition: transform 0.2s ease;
        }

        .btn-continue:hover .arrow-icon {
            transform: translateX(3px);
        }

        .btn-back {
            width: 100%;
            padding: 0.85rem;
            background: transparent;
            color: var(--primary-red);
            font-size: 0.9rem;
            font-weight: 700;
            font-family: inherit;
            border: 1.5px solid var(--primary-red);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.6rem;
        }

        .btn-back:hover {
            background: rgba(217, 27, 16, 0.05);
            transform: translateY(-1px);
        }

        .btn-back:active {
            transform: translateY(0);
        }

        /* Terms checkbox */
        .terms-wrapper {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            margin: 0.8rem 0 1rem;
            font-size: 0.82rem;
            color: var(--text-muted);
            font-weight: 500;
            line-height: 1.5;
        }

        .terms-wrapper input[type="checkbox"] {
            width: 1.1rem;
            height: 1.1rem;
            accent-color: var(--primary-red);
            margin-top: 0.15rem;
            flex-shrink: 0;
            cursor: pointer;
        }

        .terms-wrapper a {
            color: var(--primary-red);
            font-weight: 700;
            text-decoration: none;
        }

        .terms-wrapper a:hover {
            text-decoration: underline;
        }

        /* Login link */
        .login-link {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.88rem;
            color: var(--text-muted);
            font-weight: 500;
        }

        .login-link a {
            color: var(--primary-red);
            font-weight: 750;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .login-link a:hover {
            color: var(--primary-red-hover);
            text-decoration: underline;
        }

        /* Divider */
        .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 1rem 0;
            color: #334155;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.05em;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1.5px solid #cbd5e1;
        }

        .divider:not(:empty)::before {
            margin-right: 1rem;
        }

        .divider:not(:empty)::after {
            margin-left: 1rem;
        }

        /* Social Button */
        .btn-social {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.85rem;
            background: #ffffff;
            border: 1.5px solid var(--border-color);
            border-radius: 0.75rem;
            color: #000000;
            font-size: 0.88rem;
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

        .btn-social .social-icon {
            width: 1.3rem;
            height: 1.3rem;
            flex-shrink: 0;
        }

        /* Back navigation button */
        .nav-back-btn {
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

        .nav-back-btn:hover {
            background: #cbd5e1;
            color: #0f172a;
            transform: translateX(-3px);
            box-shadow: 0 0.5rem 1.2rem rgba(0, 0, 0, 0.1);
        }

        /* Success overlay */
        .success-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(6px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }

        .success-overlay.active {
            display: flex;
        }

        .success-card {
            background: #ffffff;
            border-radius: 1.4rem;
            padding: 2.5rem 3rem;
            text-align: center;
            max-width: 28rem;
            width: 90%;
            box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.15);
            animation: cardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .success-card .check-circle {
            width: 4.5rem;
            height: 4.5rem;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.2rem;
            box-shadow: 0 0.5rem 1.5rem rgba(34, 197, 94, 0.3);
        }

        .success-card .check-circle svg {
            width: 2.2rem;
            height: 2.2rem;
            color: #ffffff;
        }

        .success-card h2 {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--text-dark);
            margin-bottom: 0.4rem;
        }

        .success-card p {
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }

        .success-card .btn-login {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.9rem 2rem;
            background: linear-gradient(135deg, #e8331a 0%, #c4160a 100%);
            color: #ffffff;
            font-size: 0.95rem;
            font-weight: 800;
            font-family: inherit;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 0.5rem 1.5rem rgba(217, 27, 16, 0.3);
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .success-card .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 0.8rem 2rem rgba(217, 27, 16, 0.4);
        }

        /* Upload / Verification Section */
        .upload-section {
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 1rem 1.2rem;
            margin-bottom: 0.8rem;
            transition: all 0.2s ease;
        }

        .upload-section:hover {
            border-color: rgba(217, 27, 16, 0.3);
        }

        .upload-section.has-file {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.04);
        }

        .upload-header {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            margin-bottom: 0.7rem;
        }

        .upload-header .upload-icon-badge {
            width: 2rem;
            height: 2rem;
            background: rgba(217, 27, 16, 0.1);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .upload-header .upload-icon-badge svg {
            width: 1.1rem;
            height: 1.1rem;
            color: var(--primary-red);
        }

        .upload-header .upload-title {
            font-size: 0.88rem;
            font-weight: 700;
            color: var(--text-dark);
        }

        .upload-header .upload-optional {
            font-size: 0.78rem;
            font-weight: 500;
            color: var(--text-muted);
            margin-left: 0.3rem;
        }

        .upload-dropzone {
            border: 2px dashed #cbd5e1;
            border-radius: 10px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #fafbfc;
            min-height: 4.5rem;
            position: relative;
        }

        .upload-dropzone:hover {
            border-color: var(--primary-red);
            background: rgba(217, 27, 16, 0.03);
        }

        .upload-dropzone.drag-over {
            border-color: var(--primary-red);
            background: rgba(217, 27, 16, 0.06);
            transform: scale(1.01);
        }

        .upload-dropzone.has-file {
            border-color: #22c55e;
            border-style: solid;
            background: rgba(34, 197, 94, 0.04);
        }

        .upload-dropzone .upload-cloud-icon {
            width: 2rem;
            height: 2rem;
            color: var(--primary-red);
            opacity: 0.7;
        }

        .upload-dropzone .upload-text {
            font-size: 0.82rem;
            color: var(--text-muted);
            font-weight: 500;
            text-align: center;
        }

        .upload-dropzone .upload-text strong {
            color: var(--primary-red);
            font-weight: 700;
        }

        .upload-dropzone .upload-hint {
            font-size: 0.72rem;
            color: #94a3b8;
            font-weight: 500;
        }

        .upload-dropzone .file-preview {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.82rem;
            font-weight: 600;
            color: #16a34a;
        }

        .upload-dropzone .file-preview svg {
            width: 1.2rem;
            height: 1.2rem;
            color: #22c55e;
        }

        .upload-dropzone .file-preview .remove-file {
            margin-left: 0.3rem;
            color: #ef4444;
            cursor: pointer;
            font-weight: 700;
            font-size: 1rem;
            background: none;
            border: none;
            padding: 0 0.2rem;
            line-height: 1;
            transition: transform 0.15s ease;
        }

        .upload-dropzone .file-preview .remove-file:hover {
            transform: scale(1.2);
        }

        .upload-dropzone input[type="file"] {
            display: none;
        }

        /* Selfie / Camera section */
        .selfie-section {
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 1rem 1.2rem;
            margin-bottom: 0.8rem;
            transition: border-color 0.2s ease;
        }

        .selfie-section:hover {
            border-color: rgba(217, 27, 16, 0.3);
        }

        .selfie-section.has-capture {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.04);
        }

        .selfie-capture-area {
            border: 2px dashed #cbd5e1;
            border-radius: 10px;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #fafbfc;
            min-height: 4rem;
        }

        .selfie-capture-area:hover {
            border-color: var(--primary-red);
            background: rgba(217, 27, 16, 0.03);
        }

        .selfie-capture-area.has-capture {
            border-color: #22c55e;
            border-style: solid;
            background: rgba(34, 197, 94, 0.04);
        }

        .selfie-capture-area .camera-icon-circle {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            background: rgba(217, 27, 16, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.2s ease;
        }

        .selfie-capture-area:hover .camera-icon-circle {
            background: rgba(217, 27, 16, 0.18);
        }

        .selfie-capture-area .camera-icon-circle svg {
            width: 1.2rem;
            height: 1.2rem;
            color: var(--primary-red);
        }

        .selfie-capture-area .selfie-text {
            display: flex;
            flex-direction: column;
        }

        .selfie-capture-area .selfie-text .selfie-main {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-muted);
        }

        .selfie-capture-area .selfie-text .selfie-hint {
            font-size: 0.72rem;
            font-weight: 500;
            color: #94a3b8;
        }

        .selfie-capture-area .selfie-text .selfie-done {
            font-size: 0.82rem;
            font-weight: 600;
            color: #16a34a;
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }

        /* Responsive */
        @media (max-width: 950px) {
            .signup-container {
                grid-template-columns: 1fr;
                max-width: 32rem;
                height: auto;
                min-height: 100vh;
                border-radius: 0;
                padding: 1.5rem;
            }

            .nav-back-btn {
                top: 1rem;
                left: 1rem;
            }

            .signup-banner {
                display: none;
            }

            .signup-form-wrapper {
                padding: 0;
                height: auto;
                overflow-y: visible;
                justify-content: center;
            }
        }

        @media (max-width: 480px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    `;

export const signupMarkup = `<main class="signup-container">
        <a href="/resident/login" class="nav-back-btn" title="Back to Login" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 1.3rem; height: 1.3rem;">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
            </svg>
        </a>

        <!-- Left Column: Side Image -->
        <aside class="signup-banner">
            <img src="/images/for sign up.webp"
                alt="ALAB Fire Response System dashboard showcase" class="bg-image">

            <div class="banner-content">
                <h2>Respond Faster.<br><span>Save More Lives.</span></h2>
                <p>ALAB connects communities and responders for faster reporting, smarter response, and safer neighborhoods.</p>
            </div>

            <div class="banner-bottom">
                <div class="badge-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <span class="badge-text">Real-time incidents. Faster response.<br>Stronger communities.</span>
            </div>
        </aside>

        <!-- Right Column: Multi-step Signup Form -->
        <section class="signup-form-wrapper">
            <header class="form-header">
                <div class="logo-row">
                    <a href="/" title="Back to ALAB Home">
                        <img src="/images/Logo.webp" alt="ALAB Logo" class="logo-icon">
                    </a>
                </div>
                <div class="step-indicator" id="stepIndicator">Step 1 of 5</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 20%;"></div>
                </div>
                <h1 id="stepTitle">Personal Information</h1>
                <p class="subtitle" id="stepSubtitle">Create your resident account to get started.</p>
            </header>

            <form id="signupForm" novalidate>
                <!-- STEP 1: Personal Information -->
                <div class="step-panel active" id="step1">
                    <div class="form-row">
                        <div class="form-group">
                            <div class="input-wrapper">
                                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <input type="text" class="form-input" placeholder="First Name" required id="firstName" maxlength="50">
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="input-wrapper">
                                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <input type="text" class="form-input" placeholder="Last Name" required id="lastName" maxlength="50">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            <input type="email" class="form-input" placeholder="Email Address" required id="email" maxlength="100">
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            <input type="tel" class="form-input" placeholder="Phone Number (e.g., 09123456789)" required id="phone" maxlength="11" minlength="11" pattern="09[0-9]{9}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11);">
                        </div>
                    </div>

                    <button type="button" class="btn-continue" id="toStep2">
                        Continue
                        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>

                    <div class="divider">OR</div>

                    <button type="button" class="btn-social" id="googleSignup">
                        <svg viewBox="0 0 24 24" class="social-icon">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.87Z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.12C3.26 21.3 7.35 24 12 24Z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.24C.45 8.19 0 10.03 0 12s.45 3.81 1.24 5.39l4.04-3.12Z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.24 6.61l4.04 3.12c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                        </svg>
                        <span>Sign up with Google</span>
                    </button>

                    <div class="login-link">
                        Already have an account? <a href="/resident/login">Log in</a>
                    </div>
                </div>

                <!-- STEP 2: Address Information -->
                <div class="step-panel" id="step2">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            <select class="form-input" id="municipality" required>
                                <option value="" disabled selected>Municipality in Antique</option>
                                <option value="Anini-y">Anini-y</option>
                                <option value="Barbaza">Barbaza</option>
                                <option value="Belison">Belison</option>
                                <option value="Bugasong">Bugasong</option>
                                <option value="Caluya">Caluya</option>
                                <option value="Culasi">Culasi</option>
                                <option value="Hamtic">Hamtic</option>
                                <option value="Laua-an">Laua-an</option>
                                <option value="Libertad">Libertad</option>
                                <option value="Pandan">Pandan</option>
                                <option value="Patnongon">Patnongon</option>
                                <option value="San Jose de Buenavista">San Jose de Buenavista</option>
                                <option value="San Remigio">San Remigio</option>
                                <option value="Sebaste">Sebaste</option>
                                <option value="Sibalom">Sibalom</option>
                                <option value="Tibiao">Tibiao</option>
                                <option value="Tobias Fornier">Tobias Fornier</option>
                                <option value="Valderrama">Valderrama</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            <select class="form-input" id="barangay" required disabled>
                                <option value="" disabled selected>Barangay</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <line x1="19" y1="8" x2="19" y2="14"/>
                                <line x1="22" y1="11" x2="16" y2="11"/>
                            </svg>
                            <input type="text" class="form-input" placeholder="Sitio or Purok" id="sitio" maxlength="100">
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="top: 1rem;">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <textarea class="form-input" placeholder="Complete Address" required id="address" maxlength="200"></textarea>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="m3 9 9 4.5L21 9"/>
                                <path d="M12 13.5V21"/>
                            </svg>
                            <input type="text" class="form-input" placeholder="Nearby Landmark (Optional)" id="landmark" maxlength="100">
                        </div>
                    </div>

                    <button type="button" class="btn-continue" id="toStep3">
                        Continue
                        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>

                    <button type="button" class="btn-back" id="backToStep1">Back</button>
                </div>

                <!-- STEP 3: Identity Verification -->
                <div class="step-panel" id="step3">
                    <!-- Upload Front of Valid ID -->
                    <div class="upload-section" id="uploadFrontSection">
                        <div class="upload-header">
                            <div class="upload-icon-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="M7 15h0M2 9.5h20"/>
                                </svg>
                            </div>
                            <span class="upload-title">Upload Front of Valid ID</span>
                        </div>
                        <label class="upload-dropzone" id="dropzoneFront">
                            <svg class="upload-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <span class="upload-text"><strong>Click to upload</strong> or drag and drop</span>
                            <span class="upload-hint">JPG, PNG, or PDF (Max. 5MB)</span>
                            <input type="file" id="fileFront" accept="image/*,.pdf">
                        </label>
                    </div>

                    <!-- Upload Back of Valid ID -->
                    <div class="upload-section" id="uploadBackSection">
                        <div class="upload-header">
                            <div class="upload-icon-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="M7 15h0M2 9.5h20"/>
                                </svg>
                            </div>
                            <span class="upload-title">Upload Back of Valid ID</span>
                            <span class="upload-optional">(when applicable)</span>
                        </div>
                        <label class="upload-dropzone" id="dropzoneBack">
                            <svg class="upload-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <span class="upload-text"><strong>Click to upload</strong> or drag and drop</span>
                            <span class="upload-hint">Optional if your ID has no back details</span>
                            <span class="upload-hint">JPG, PNG, or PDF (Max. 5MB)</span>
                            <input type="file" id="fileBack" accept="image/*,.pdf">
                        </label>
                    </div>

                    <!-- Take Selfie -->
                    <div class="selfie-section" id="selfieSection">
                        <div class="upload-header">
                            <div class="upload-icon-badge">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                    <circle cx="12" cy="13" r="3"/>
                                </svg>
                            </div>
                            <span class="upload-title">Take Selfie</span>
                        </div>
                        <div class="selfie-capture-area" id="selfieCapture">
                            <div class="camera-icon-circle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                    <circle cx="12" cy="13" r="3"/>
                                </svg>
                            </div>
                            <div class="selfie-text">
                                <span class="selfie-main">Click to open camera and take a selfie</span>
                                <span class="selfie-hint">Ensure your face is clearly visible</span>
                            </div>
                        </div>
                    </div>

                    <button type="button" class="btn-continue" id="toStep4">
                        Continue
                        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>

                    <button type="button" class="btn-back" id="backToStep2">Back</button>
                </div>

                <!-- STEP 4: Account Security -->
                <div class="step-panel" id="step4">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            <input type="text" class="form-input" placeholder="Choose a Username" required id="username" maxlength="30">
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <input type="password" class="form-input" placeholder="Create Password" required id="signupPassword" minlength="8" maxlength="50">
                            <button type="button" class="toggle-password" id="togglePass1" aria-label="Toggle password">
                                <svg class="eye-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                        <div class="password-strength" id="strengthBars">
                            <div class="strength-bar"></div>
                            <div class="strength-bar"></div>
                            <div class="strength-bar"></div>
                            <div class="strength-bar"></div>
                        </div>
                        <div class="strength-label" id="strengthLabel"></div>
                    </div>

                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <input type="password" class="form-input" placeholder="Confirm Password" required id="confirmPassword" minlength="8" maxlength="50">
                            <button type="button" class="toggle-password" id="togglePass2" aria-label="Toggle password">
                                <svg class="eye-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <button type="button" class="btn-continue" id="toStep5">
                        Continue
                        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>

                    <button type="button" class="btn-back" id="backToStep3">Back</button>
                </div>

                <!-- STEP 5: Review & Confirm -->
                <div class="step-panel" id="step5">
                    <div class="review-section" id="reviewContent" style="background: #f8fafc; border-radius: 12px; padding: 1.2rem; margin-bottom: 1rem; border: 1.5px solid #e2e8f0;">
                        <!-- Populated by JS -->
                    </div>

                    <div class="terms-wrapper">
                        <input type="checkbox" id="termsCheck" required>
                        <label for="termsCheck">
                            I agree to the ALAB <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I confirm that all information provided is accurate.
                        </label>
                    </div>

                    <button type="submit" class="btn-continue" id="submitBtn">
                        Create Account
                        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>

                    <button type="button" class="btn-back" id="backToStep4">Back</button>
                </div>
            </form>
        </section>
    </main>

    <!-- Success Modal -->
    <div class="success-overlay" id="successOverlay">
        <div class="success-card">
            <div class="check-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <h2>Account Created!</h2>
            <p>Your ALAB resident account has been successfully created. You can now log in to start reporting incidents and stay informed.</p>
            <a href="/resident/login" class="btn-login">
                Go to Login
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
            </a>
        </div>
    </div>`;

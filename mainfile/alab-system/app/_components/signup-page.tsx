"use client";

import { useEffect, useRef } from "react";

import { signupMarkup, signupStyles } from "../_content/signup-content";
import { antiqueBarangays } from "../_content/antique-barangays";

const visibleEye = `
  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
  <line x1="2" y1="2" x2="22" y2="22"/>
`;

const hiddenEye = `
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
`;

const TOTAL_STEPS = 5;

type SignupPageProps = {
  fontVariableClassName: string;
};

const STEP_CONFIG = [
  { title: "Personal Information", subtitle: "Create your resident account to get started." },
  { title: "Address Information", subtitle: "Tell us where you are located in Antique." },
  { title: "Identity Verification", subtitle: "Upload your identification details for account verification." },
  { title: "Account Security", subtitle: "Set up your login credentials." },
  { title: "Review & Confirm", subtitle: "Double-check your details before submitting." },
];

export function SignupPage({ fontVariableClassName }: SignupPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let currentStep = 1;

    // Track uploaded files for verification step
    let frontFile: File | null = null;
    let backFile: File | null = null;
    let selfieTaken = false;

    // Elements
    const form = root.querySelector<HTMLFormElement>("#signupForm");
    const stepIndicator = root.querySelector<HTMLElement>("#stepIndicator");
    const progressFill = root.querySelector<HTMLElement>("#progressFill");
    const stepTitle = root.querySelector<HTMLElement>("#stepTitle");
    const stepSubtitle = root.querySelector<HTMLElement>("#stepSubtitle");
    const reviewContent = root.querySelector<HTMLElement>("#reviewContent");
    const formStatus = root.ownerDocument.createElement("p");
    formStatus.setAttribute("role", "alert");
    formStatus.style.cssText = "min-height: 1.25rem; margin-top: 0.75rem; color: #b91c1c; font-size: 0.8rem; font-weight: 700; text-align: center;";
    form?.appendChild(formStatus);

    const panels = [
      root.querySelector<HTMLElement>("#step1"),
      root.querySelector<HTMLElement>("#step2"),
      root.querySelector<HTMLElement>("#step3"),
      root.querySelector<HTMLElement>("#step4"),
      root.querySelector<HTMLElement>("#step5"),
    ];

    // Navigation buttons
    const toStep2 = root.querySelector<HTMLButtonElement>("#toStep2");
    const toStep3 = root.querySelector<HTMLButtonElement>("#toStep3");
    const toStep4 = root.querySelector<HTMLButtonElement>("#toStep4");
    const toStep5 = root.querySelector<HTMLButtonElement>("#toStep5");
    const backToStep1 = root.querySelector<HTMLButtonElement>("#backToStep1");
    const backToStep2 = root.querySelector<HTMLButtonElement>("#backToStep2");
    const backToStep3 = root.querySelector<HTMLButtonElement>("#backToStep3");
    const backToStep4 = root.querySelector<HTMLButtonElement>("#backToStep4");

    // Password toggles
    const togglePass1 = root.querySelector<HTMLButtonElement>("#togglePass1");
    const togglePass2 = root.querySelector<HTMLButtonElement>("#togglePass2");
    const passwordField = root.querySelector<HTMLInputElement>("#signupPassword");
    const confirmField = root.querySelector<HTMLInputElement>("#confirmPassword");

    // Password strength
    const strengthBars = root.querySelectorAll<HTMLElement>("#strengthBars .strength-bar");
    const strengthLabel = root.querySelector<HTMLElement>("#strengthLabel");

    // Identity verification elements
    const dropzoneFront = root.querySelector<HTMLElement>("#dropzoneFront");
    const dropzoneBack = root.querySelector<HTMLElement>("#dropzoneBack");
    const fileFrontInput = root.querySelector<HTMLInputElement>("#fileFront");
    const fileBackInput = root.querySelector<HTMLInputElement>("#fileBack");
    const uploadFrontSection = root.querySelector<HTMLElement>("#uploadFrontSection");
    const uploadBackSection = root.querySelector<HTMLElement>("#uploadBackSection");
    const selfieCapture = root.querySelector<HTMLElement>("#selfieCapture");
    const selfieSection = root.querySelector<HTMLElement>("#selfieSection");
    const selfieCameraPanel = root.querySelector<HTMLElement>("#selfieCameraPanel");
    const selfieVideo = root.querySelector<HTMLVideoElement>("#selfieVideo");
    const selfiePreview = root.querySelector<HTMLImageElement>("#selfiePreview");
    const selfieFaceGuide = root.querySelector<HTMLElement>(".selfie-face-guide");
    const selfieGuidance = root.querySelector<HTMLElement>("#selfieCameraGuidance");
    const captureSelfieBtn = root.querySelector<HTMLButtonElement>("#captureSelfie");
    const cancelSelfieBtn = root.querySelector<HTMLButtonElement>("#cancelSelfie");
    const retakeSelfieBtn = root.querySelector<HTMLButtonElement>("#retakeSelfie");
    const useSelfieBtn = root.querySelector<HTMLButtonElement>("#useSelfie");
    const selfieReviewActions = root.querySelector<HTMLElement>("#selfieReviewActions");
    let selfieStream: MediaStream | null = null;

    // Success overlay
    const successOverlay = root.ownerDocument.querySelector<HTMLElement>("#successOverlay") ??
      root.querySelector<HTMLElement>("#successOverlay");

    // Google button
    const googleBtn = root.querySelector<HTMLButtonElement>("#googleSignup");

    // Municipality & Barangay
    const municipalitySelect = root.querySelector<HTMLSelectElement>("#municipality");
    const barangaySelect = root.querySelector<HTMLSelectElement>("#barangay");

    // Populate barangays when municipality changes
    const handleMunicipalityChange = () => {
      if (!municipalitySelect || !barangaySelect) return;
      const municipality = municipalitySelect.value;
      const barangays = antiqueBarangays[municipality] ?? [];

      // Reset & populate
      barangaySelect.innerHTML = '<option value="" disabled selected>Barangay</option>';
      barangaySelect.value = "";
      barangays.forEach((brgy) => {
        const opt = document.createElement("option");
        opt.value = brgy;
        opt.textContent = brgy;
        barangaySelect.appendChild(opt);
      });

      barangaySelect.disabled = barangays.length === 0;
    };

    municipalitySelect?.addEventListener("change", handleMunicipalityChange);
    handleMunicipalityChange();

    function goToStep(step: number) {
      currentStep = step;
      panels.forEach((p, i) => {
        if (p) {
          p.classList.toggle("active", i === step - 1);
        }
      });
      if (stepIndicator) stepIndicator.textContent = `Step ${step} of ${TOTAL_STEPS}`;
      if (progressFill) progressFill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
      if (stepTitle) stepTitle.textContent = STEP_CONFIG[step - 1].title;
      if (stepSubtitle) stepSubtitle.textContent = STEP_CONFIG[step - 1].subtitle;

      // Populate review on step 5
      if (step === 5 && reviewContent) {
        const formRoot = root!;
        const getValue = (id: string) => {
          const el = formRoot.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`);
          return el?.value ?? "";
        };

        const idStatus = frontFile ? `✓ ${frontFile.name}` : "Not uploaded";
        const idBackStatus = backFile ? `✓ ${backFile.name}` : "Not provided";
        const selfieStatus = selfieTaken ? "✓ Captured" : "Not taken";

        reviewContent.innerHTML = `
          <div style="display: grid; gap: 0.6rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Name</span>
              <span style="font-weight: 600; color: #000;">${getValue("firstName")} ${getValue("lastName")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Email</span>
              <span style="font-weight: 600; color: #000;">${getValue("email")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Phone</span>
              <span style="font-weight: 600; color: #000;">${getValue("phone")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Municipality</span>
              <span style="font-weight: 600; color: #000;">${getValue("municipality")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Barangay</span>
              <span style="font-weight: 600; color: #000;">${getValue("barangay")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Address</span>
              <span style="font-weight: 600; color: #000; text-align: right; max-width: 60%;">${getValue("address")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Valid ID (Front)</span>
              <span style="font-weight: 600; color: ${frontFile ? '#16a34a' : '#94a3b8'};">${idStatus}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Valid ID (Back)</span>
              <span style="font-weight: 600; color: ${backFile ? '#16a34a' : '#94a3b8'};">${idBackStatus}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">Selfie</span>
              <span style="font-weight: 600; color: ${selfieTaken ? '#16a34a' : '#94a3b8'};">${selfieStatus}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
              <span style="font-weight: 700; color: #334155;">Username</span>
              <span style="font-weight: 600; color: #000;">${getValue("username")}</span>
            </div>
          </div>
        `;
      }
    }

    // --- File upload helpers ---
    function updateDropzoneUI(dropzone: HTMLElement | null, section: HTMLElement | null, file: File | null) {
      if (!dropzone) return;
      const cloudIcon = dropzone.querySelector<HTMLElement>(".upload-cloud-icon");
      const uploadText = dropzone.querySelector<HTMLElement>(".upload-text");
      const hints = dropzone.querySelectorAll<HTMLElement>(".upload-hint");
      const existingPreview = dropzone.querySelector<HTMLElement>(".file-preview");

      if (file) {
        // Show file name
        if (cloudIcon) cloudIcon.style.display = "none";
        if (uploadText) uploadText.style.display = "none";
        hints.forEach((h) => (h.style.display = "none"));
        if (existingPreview) existingPreview.remove();

        const preview = document.createElement("div");
        preview.className = "file-preview";
        preview.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>${file.name}</span>
          <button type="button" class="remove-file" title="Remove file">&times;</button>
        `;
        dropzone.appendChild(preview);
        dropzone.classList.add("has-file");
        section?.classList.add("has-file");
      } else {
        // Reset
        if (cloudIcon) cloudIcon.style.display = "";
        if (uploadText) uploadText.style.display = "";
        hints.forEach((h) => (h.style.display = ""));
        if (existingPreview) existingPreview.remove();
        dropzone.classList.remove("has-file");
        section?.classList.remove("has-file");
      }
    }

    function handleFileSelect(
      e: Event,
      setFile: (f: File | null) => void,
      dropzone: HTMLElement | null,
      section: HTMLElement | null
    ) {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0] ?? null;
      if (file && file.size > 5 * 1024 * 1024) {
        window.alert("File size must be less than 5MB.");
        input.value = "";
        return;
      }
      setFile(file);
      updateDropzoneUI(dropzone, section, file);
    }

    function setupDragDrop(dropzone: HTMLElement | null, fileInput: HTMLInputElement | null) {
      if (!dropzone || !fileInput) return;

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      };
      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      };
      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const dt = new DataTransfer();
          dt.items.add(files[0]);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };

      dropzone.addEventListener("dragover", handleDragOver);
      dropzone.addEventListener("dragleave", handleDragLeave);
      dropzone.addEventListener("drop", handleDrop);

      return () => {
        dropzone.removeEventListener("dragover", handleDragOver);
        dropzone.removeEventListener("dragleave", handleDragLeave);
        dropzone.removeEventListener("drop", handleDrop);
      };
    }

    // Handle remove file button clicks (event delegation on dropzones)
    function handleDropzoneClick(e: Event) {
      const target = e.target as HTMLElement;
      if (target.classList.contains("remove-file")) {
        e.preventDefault();
        e.stopPropagation();
        const dropzone = target.closest(".upload-dropzone") as HTMLElement;
        const section = target.closest(".upload-section") as HTMLElement;
        if (dropzone === dropzoneFront) {
          frontFile = null;
          if (fileFrontInput) fileFrontInput.value = "";
          updateDropzoneUI(dropzoneFront, uploadFrontSection, null);
        } else if (dropzone === dropzoneBack) {
          backFile = null;
          if (fileBackInput) fileBackInput.value = "";
          updateDropzoneUI(dropzoneBack, uploadBackSection, null);
        }
      }
    }

    // Setup drag-and-drop
    const cleanupDragFront = setupDragDrop(dropzoneFront, fileFrontInput);
    const cleanupDragBack = setupDragDrop(dropzoneBack, fileBackInput);

    // File input change handlers
    const handleFrontFileChange = (e: Event) => {
      handleFileSelect(
        e,
        (f) => { frontFile = f; },
        dropzoneFront,
        uploadFrontSection
      );
    };
    const handleBackFileChange = (e: Event) => {
      handleFileSelect(
        e,
        (f) => { backFile = f; },
        dropzoneBack,
        uploadBackSection
      );
    };

    fileFrontInput?.addEventListener("change", handleFrontFileChange);
    fileBackInput?.addEventListener("change", handleBackFileChange);
    dropzoneFront?.addEventListener("click", handleDropzoneClick);
    dropzoneBack?.addEventListener("click", handleDropzoneClick);

    function showSelfieCaptured() {
      selfieTaken = true;
      selfieSection?.classList.add("has-capture");
      selfieCapture?.classList.add("has-capture");
      if (selfieCapture) {
        const textArea = selfieCapture.querySelector(".selfie-text");
        if (textArea) {
          textArea.innerHTML = `
            <span class="selfie-done">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #22c55e;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Selfie captured successfully
            </span>
            <span class="selfie-hint">Click again to retake</span>
          `;
        }
      }
    }

    const resetSelfieCameraUi = () => {
      if (selfieVideo) selfieVideo.hidden = false;
      if (selfiePreview) {
        selfiePreview.hidden = true;
        selfiePreview.removeAttribute("src");
      }
      selfieFaceGuide?.removeAttribute("hidden");
      if (selfieGuidance) selfieGuidance.textContent = "Use good lighting and make sure your face is clearly visible.";
      if (captureSelfieBtn) captureSelfieBtn.hidden = false;
      if (selfieReviewActions) selfieReviewActions.hidden = true;
    };

    const stopSelfieCamera = () => {
      selfieStream?.getTracks().forEach((track) => track.stop());
      selfieStream = null;
      if (selfieVideo) selfieVideo.srcObject = null;
      selfieCameraPanel?.classList.remove("active");
      selfieCameraPanel?.setAttribute("aria-hidden", "true");
      selfieCapture?.setAttribute("aria-expanded", "false");
      resetSelfieCameraUi();
    };

    const showSelfieReview = (dataUrl: string) => {
      selfieStream?.getTracks().forEach((track) => track.stop());
      selfieStream = null;
      if (selfieVideo) {
        selfieVideo.srcObject = null;
        selfieVideo.hidden = true;
      }
      if (selfiePreview) {
        selfiePreview.src = dataUrl;
        selfiePreview.hidden = false;
      }
      selfieFaceGuide?.setAttribute("hidden", "true");
      if (selfieGuidance) selfieGuidance.textContent = "Does this photo clearly show your face?";
      if (captureSelfieBtn) captureSelfieBtn.hidden = true;
      if (selfieReviewActions) selfieReviewActions.hidden = false;
    };

    const startSelfieCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !selfieVideo) {
        window.alert("Camera access is not supported by this browser.");
        return;
      }

      try {
        resetSelfieCameraUi();
        selfieCameraPanel?.classList.add("active");
        selfieCameraPanel?.setAttribute("aria-hidden", "false");
        selfieCapture?.setAttribute("aria-expanded", "true");
        selfieStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false,
        });
        selfieVideo.srcObject = selfieStream;
      } catch {
        stopSelfieCamera();
        window.alert("Unable to open the camera. Please allow camera access and try again.");
      }
    };

    const handleSelfieClick = async () => {
      await startSelfieCamera();
    };

    const handleCaptureSelfie = () => {
      if (!selfieStream || !selfieVideo || selfieVideo.videoWidth === 0) {
        window.alert("Please wait for the camera preview before taking the selfie.");
        return;
      }

      const frame = root.ownerDocument.createElement("canvas");
      frame.width = selfieVideo.videoWidth;
      frame.height = selfieVideo.videoHeight;
      frame.getContext("2d")?.drawImage(selfieVideo, 0, 0, frame.width, frame.height);
      showSelfieReview(frame.toDataURL("image/jpeg", 0.92));
    };

    const handleUseSelfie = () => {
      stopSelfieCamera();
      showSelfieCaptured();
    };

    const handleRetakeSelfie = async () => {
      await startSelfieCamera();
    };

    selfieCapture?.addEventListener("click", handleSelfieClick);
    captureSelfieBtn?.addEventListener("click", handleCaptureSelfie);
    cancelSelfieBtn?.addEventListener("click", stopSelfieCamera);
    retakeSelfieBtn?.addEventListener("click", handleRetakeSelfie);
    useSelfieBtn?.addEventListener("click", handleUseSelfie);

    // Password toggle handler factory
    function makeToggle(field: HTMLInputElement | null, btn: HTMLButtonElement | null) {
      if (!field || !btn) return () => {};
      return () => {
        const isPassword = field.type === "password";
        field.type = isPassword ? "text" : "password";
        const svg = btn.querySelector<SVGElement>(".eye-svg");
        if (svg) svg.innerHTML = isPassword ? visibleEye : hiddenEye;
      };
    }

    // Password strength checker
    function checkStrength(password: string) {
      let score = 0;
      if (password.length >= 6) score++;
      if (password.length >= 10) score++;
      if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      score = Math.min(score, 4);

      const levels = ["", "Weak", "Fair", "Good", "Strong"];
      const classes = ["", "weak", "medium", "medium", "strong"];

      strengthBars.forEach((bar, i) => {
        bar.classList.remove("active", "weak", "medium", "strong");
        if (i < score) {
          bar.classList.add("active", classes[score]);
        }
      });
      if (strengthLabel) {
        strengthLabel.textContent = password.length > 0 ? levels[score] : "";
      }
    }

    // Event handlers
    const handleToggle1 = makeToggle(passwordField, togglePass1);
    const handleToggle2 = makeToggle(confirmField, togglePass2);

    const handlePasswordInput = () => {
      if (passwordField) checkStrength(passwordField.value);
    };

    const getInvalidField = (panel: HTMLElement | null) => {
      if (!panel) return null;
      return Array.from(panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
        .find((field) => !field.disabled && !field.checkValidity()) ?? null;
    };

    const fieldLabel = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      const labels: Record<string, string> = {
        firstName: "first name",
        lastName: "last name",
        email: "email address",
        phone: "11-digit phone number",
        municipality: "municipality",
        barangay: "barangay",
        address: "complete address",
        username: "username",
        signupPassword: "password",
        confirmPassword: "password confirmation",
        termsCheck: "Terms of Service and Privacy Policy agreement",
      };
      return labels[field.id] ?? "required field";
    };

    const showInvalidField = (step: number, field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      goToStep(step);
      formStatus.textContent = `Please complete your ${fieldLabel(field)} to continue.`;
      window.requestAnimationFrame(() => {
        field.focus();
        field.reportValidity();
      });
    };

    const validateStep = (panel: HTMLElement | null) => {
      const invalidField = getInvalidField(panel);
      if (!invalidField) return true;
      invalidField.focus();
      invalidField.reportValidity();
      return false;
    };

    const handleToStep2 = () => {
      formStatus.textContent = "";
      if (validateStep(panels[0])) goToStep(2);
    };
    const handleToStep3 = () => {
      formStatus.textContent = "";
      if (validateStep(panels[1])) goToStep(3);
    };
    const handleToStep4 = () => {
      formStatus.textContent = "";
      if (!validateStep(panels[2])) return;
      if (!frontFile || !selfieTaken) {
        formStatus.textContent = "Upload the front of your valid ID and capture a selfie before continuing.";
        return;
      }
      goToStep(4);
    };
    const handleToStep5 = () => {
      formStatus.textContent = "";
      if (validateStep(panels[3]) && passwordField?.value === confirmField?.value) goToStep(5);
      else if (passwordField?.value !== confirmField?.value) formStatus.textContent = "Passwords do not match.";
    };
    const handleBackToStep1 = () => goToStep(1);
    const handleBackToStep2 = () => goToStep(2);
    const handleBackToStep3 = () => goToStep(3);
    const handleBackToStep4 = () => goToStep(4);

    const validateRegistration = () => {
      for (const [index, panel] of panels.entries()) {
        const invalidField = getInvalidField(panel);
        if (invalidField) {
          showInvalidField(index + 1, invalidField);
          return false;
        }
      }

      if (!frontFile) {
        goToStep(3);
        formStatus.textContent = "Upload the front of your valid ID to continue.";
        return false;
      }

      if (!selfieTaken) {
        goToStep(3);
        formStatus.textContent = "Take and confirm your selfie to continue.";
        return false;
      }

      if (!passwordField || passwordField.value !== confirmField?.value) {
        goToStep(4);
        formStatus.textContent = "Passwords do not match.";
        confirmField?.focus();
        return false;
      }

      const termsCheck = root.querySelector<HTMLInputElement>("#termsCheck");
      if (!termsCheck?.checked) {
        goToStep(5);
        formStatus.textContent = "Please agree to the Terms of Service and Privacy Policy.";
        termsCheck?.focus();
        return false;
      }

      return true;
    };

    const showOtpPanel = (verificationId: string, phone: string) => {
      const panel = root.ownerDocument.createElement("div");
      panel.id = "otpVerificationPanel";
      panel.innerHTML = `<div class="otp-card"><div class="otp-icon">✦</div><h2>Verify your phone</h2><p>We sent a 6-digit code to <strong>${phone.replace(/.(?=.{4})/g, "•")}</strong></p><div class="otp-digits">${Array.from({ length: 6 }, (_, i) => `<input aria-label="Verification code digit ${i + 1}" inputmode="numeric" maxlength="1">`).join("")}</div><p class="otp-status" role="alert"></p><button type="button" class="otp-verify">Verify & Create Account</button><button type="button" class="otp-back">Back and edit details</button></div>`;
      panel.style.cssText = "position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.66);backdrop-filter:blur(7px)";
      const card = panel.querySelector<HTMLElement>(".otp-card")!;
      card.style.cssText = "width:min(94vw,28rem);padding:2rem;border-radius:1.5rem;background:#fff;text-align:center;box-shadow:0 2rem 5rem rgba(0,0,0,.3);font-family:inherit";
      const inputs = Array.from(panel.querySelectorAll<HTMLInputElement>("input"));
      inputs.forEach((input) => input.style.cssText = "width:2.5rem;height:3.2rem;margin:.18rem;border:2px solid #fecaca;border-radius:.75rem;text-align:center;font-size:1.3rem;font-weight:800;outline-color:#dc2626");
      panel.querySelector<HTMLButtonElement>(".otp-verify")!.style.cssText = "width:100%;border:0;border-radius:.8rem;padding:1rem;background:linear-gradient(135deg,#ef2d1d,#b91c1c);color:#fff;font-weight:800;cursor:pointer";
      panel.querySelector<HTMLButtonElement>(".otp-back")!.style.cssText = "margin-top:.8rem;border:0;background:none;color:#b91c1c;font-weight:700;cursor:pointer";
      inputs.forEach((input, index) => input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 1); if (input.value) inputs[index + 1]?.focus(); }));
      const status = panel.querySelector<HTMLElement>(".otp-status")!;
      panel.querySelector<HTMLButtonElement>(".otp-back")!.onclick = () => panel.remove();
      panel.querySelector<HTMLButtonElement>(".otp-verify")!.onclick = async () => {
        const code = inputs.map((input) => input.value).join("");
        if (code.length !== 6) { status.textContent = "Enter all six digits."; return; }
        status.textContent = "Verifying…";
        const verify = await fetch("/api/auth/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationId, code }) });
        const result = await verify.json() as { error?: string };
        if (!verify.ok) { status.textContent = result.error ?? "Unable to verify the code."; return; }
        const register = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationId }) });
        if (!register.ok) { const failed = await register.json() as { error?: string }; status.textContent = failed.error ?? "Unable to create your account."; return; }
        window.location.assign("/resident");
      };
      root.ownerDocument.body.appendChild(panel);
      inputs[0]?.focus();
    };

    const handleSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      formStatus.textContent = "";
      if (!validateRegistration()) return;
      if (!passwordField || !frontFile) return;

      const value = (id: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? "";
      formStatus.textContent = "Sending your verification code…";
      try {
        const response = await fetch("/api/auth/register/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: value("firstName"),
            lastName: value("lastName"),
            email: value("email"),
            phone: value("phone"),
            municipality: value("municipality"),
            barangay: value("barangay"),
            address: value("address"),
            username: value("username"),
            password: passwordField.value,
            frontDocumentName: frontFile.name,
            backDocumentName: backFile?.name,
            selfieCaptured: selfieTaken,
            termsAccepted: true,
          }),
        });
        const result = await response.json() as { error?: string; verificationId?: string };
        if (!response.ok) {
          formStatus.textContent = result.error ?? "Unable to create the resident account.";
          return;
        }
        if (!result.verificationId) { formStatus.textContent = "Unable to start phone verification."; return; }
        formStatus.textContent = "";
        showOtpPanel(result.verificationId, value("phone"));
      } catch {
        formStatus.textContent = "Unable to reach the registration service. Please try again.";
      }
    };

    const handleGoogleSignup = () => {
      window.alert("Google sign-up coming soon!");
    };

    // Attach listeners
    toStep2?.addEventListener("click", handleToStep2);
    toStep3?.addEventListener("click", handleToStep3);
    toStep4?.addEventListener("click", handleToStep4);
    toStep5?.addEventListener("click", handleToStep5);
    backToStep1?.addEventListener("click", handleBackToStep1);
    backToStep2?.addEventListener("click", handleBackToStep2);
    backToStep3?.addEventListener("click", handleBackToStep3);
    backToStep4?.addEventListener("click", handleBackToStep4);
    togglePass1?.addEventListener("click", handleToggle1);
    togglePass2?.addEventListener("click", handleToggle2);
    passwordField?.addEventListener("input", handlePasswordInput);
    form?.addEventListener("submit", handleSubmit);
    googleBtn?.addEventListener("click", handleGoogleSignup);

    return () => {
      toStep2?.removeEventListener("click", handleToStep2);
      toStep3?.removeEventListener("click", handleToStep3);
      toStep4?.removeEventListener("click", handleToStep4);
      toStep5?.removeEventListener("click", handleToStep5);
      backToStep1?.removeEventListener("click", handleBackToStep1);
      backToStep2?.removeEventListener("click", handleBackToStep2);
      backToStep3?.removeEventListener("click", handleBackToStep3);
      backToStep4?.removeEventListener("click", handleBackToStep4);
      togglePass1?.removeEventListener("click", handleToggle1);
      togglePass2?.removeEventListener("click", handleToggle2);
      passwordField?.removeEventListener("input", handlePasswordInput);
      form?.removeEventListener("submit", handleSubmit);
      googleBtn?.removeEventListener("click", handleGoogleSignup);
      formStatus.remove();
      fileFrontInput?.removeEventListener("change", handleFrontFileChange);
      fileBackInput?.removeEventListener("change", handleBackFileChange);
      dropzoneFront?.removeEventListener("click", handleDropzoneClick);
      dropzoneBack?.removeEventListener("click", handleDropzoneClick);
      selfieCapture?.removeEventListener("click", handleSelfieClick);
      captureSelfieBtn?.removeEventListener("click", handleCaptureSelfie);
      cancelSelfieBtn?.removeEventListener("click", stopSelfieCamera);
      retakeSelfieBtn?.removeEventListener("click", handleRetakeSelfie);
      useSelfieBtn?.removeEventListener("click", handleUseSelfie);
      stopSelfieCamera();
      cleanupDragFront?.();
      cleanupDragBack?.();
    };
  }, []);

  return (
    <>
      <style>{signupStyles}</style>
      <div
        ref={rootRef}
        className={`signup-page-root ${fontVariableClassName}`}
        dangerouslySetInnerHTML={{ __html: signupMarkup }}
      />
    </>
  );
}

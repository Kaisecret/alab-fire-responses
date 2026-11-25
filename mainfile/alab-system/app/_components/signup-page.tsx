"use client";

import { useEffect, useRef } from "react";

import { signupMarkup, signupStyles } from "../_content/signup-content";
import { residentAuthFontStyles } from "../_content/resident-auth-font";
import { antiqueBarangays } from "../_content/antique-barangays";
import { composeResidentAddress } from "../../lib/resident-applications/compose-address.mjs";
import { shrinkPhoto } from "../_lib/shrink-photo";
import { createFaceCheckController } from "../../lib/resident-applications/face-check-client.mjs";
import { createSelfieViewCollection, SELFIE_VIEWS } from "../../lib/resident-applications/selfie-views-client.mjs";
import { createSelfieGuidanceSession } from "../../lib/resident-applications/selfie-guidance";
import { selfieGuidanceCue } from "../../lib/resident-applications/selfie-guidance-cues.mjs";
import { idFrameCrop } from "../../lib/resident-applications/id-frame-crop.mjs";

type SelfieView = "front" | "right" | "left";

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

const TOTAL_STEPS = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type SignupPageProps = {
  fontVariableClassName: string;
};

const STEP_CONFIG = [
  { title: "Personal Information", subtitle: "Create your resident account to get started." },
  { title: "Address Information", subtitle: "Tell us where you are located in Antique." },
  { title: "Scan your ID", subtitle: "Take a photo or upload the front and back of the same valid ID." },
  { title: "Take your selfie", subtitle: "Match a clear selfie with the photo on your verified ID." },
  { title: "Account Security", subtitle: "Set up your login credentials." },
  // The panel below this header changes from code entry to a verified summary,
  // so the subtitle must read correctly in both states rather than instructing
  // the resident to confirm a code they have already confirmed.
  { title: "Verify your phone", subtitle: "" },
];

export function SignupPage({ fontVariableClassName }: SignupPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let currentStep = 1;
    let isStartingVerification = false;
    let stopOtpCountdown: (() => void) | null = null;

    // Track uploaded files for verification step
    let frontFile: File | null = null;
    let backFile: File | null = null;
    let selfieTaken = false;
    let pendingSelfieBlob: Blob | null = null;
    let selfieFile: File | null = null;
    const selfieViews = createSelfieViewCollection();
    const selfieUrls = new Map<SelfieView, string>();
    let disposed = false;
    let faceMatchState: "idle" | "checking" | "verified" | "failed" = "idle";
    // True when the last face check failed for a reason the same photos can
    // be sent again for (connection or server), so no retake is needed.
    let faceRetryable = false;

    // ID verification: the front of the ID is scanned on upload, and only a
    // server-signed token for this exact file and name lets registration save.
    let idVerificationToken: string | null = null;
    let idScanState: "idle" | "scanning" | "verified" | "failed" = "idle";
    let idScanController: AbortController | null = null;

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
      root.querySelector<HTMLElement>("#step6"),
    ];
    // Keep the original review controls when OTP temporarily replaces this
    // panel, so Back/editing or a renewed identity check can restore them.
    const reviewPanelNodes = Array.from(panels[5]?.childNodes ?? []);

    // Navigation buttons
    const toStep2 = root.querySelector<HTMLButtonElement>("#toStep2");
    const toStep3 = root.querySelector<HTMLButtonElement>("#toStep3");
    const toStep4 = root.querySelector<HTMLButtonElement>("#toStep4");
    const toStep5 = root.querySelector<HTMLButtonElement>("#toStep5");
    const toStep6 = root.querySelector<HTMLButtonElement>("#toStep6");
    const backToStep1 = root.querySelector<HTMLButtonElement>("#backToStep1");
    const backToStep2 = root.querySelector<HTMLButtonElement>("#backToStep2");
    const backToStep3 = root.querySelector<HTMLButtonElement>("#backToStep3");
    const backToStep4 = root.querySelector<HTMLButtonElement>("#backToStep4");
    const backToStep5 = root.querySelector<HTMLButtonElement>("#backToStep5");

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
    const selfieCameraHeading = root.querySelector<HTMLElement>("#selfieCameraHeading");
    const selfieCameraProgress = root.querySelector<HTMLElement>("#selfieCameraProgress");
    const selfieHoldProgress = root.querySelector<HTMLElement>("#selfieHoldProgress");
    const selfieCameraRetry = root.querySelector<HTMLButtonElement>("#selfieCameraRetry");
    const selfieDirectionCue = root.querySelector<HTMLElement>("#selfieDirectionCue");
    const selfieCueTitle = root.querySelector<HTMLElement>("#selfieCueTitle");
    const selfieCueDetail = root.querySelector<HTMLElement>("#selfieCueDetail");
    const selfieCount = root.querySelector<HTMLElement>("#selfieCount");
    const selfieMain = root.querySelector<HTMLElement>("#selfieMain");
    const selfieCaptureFlash = root.querySelector<HTMLElement>("#selfieCaptureFlash");
    let selfieStream: MediaStream | null = null;

    function currentFaceEvidence() {
      const views = selfieViews.evidence();
      return frontFile && backFile && views && idVerificationToken
        ? { frontId: frontFile, backId: backFile, ...views, idVerificationToken }
        : null;
    }

    const faceCheckController = createFaceCheckController({
      onState: (state) => {
        faceMatchState = state.status;
        faceRetryable = state.status === "failed" && state.retryable === true;
        const hint = selfieCapture?.querySelector<HTMLElement>(".selfie-hint");
        if (state.status === "idle") {
          formStatus.style.color = "#b91c1c";
          if (hint && selfieTaken) hint.textContent = "Confirm your selfie against your ID again";
        } else {
          formStatus.style.color = state.status === "verified" ? "#15803d"
            : state.status === "checking" ? "#475569" : "#b91c1c";
          formStatus.textContent = state.message ?? "";
          if (hint) hint.textContent = state.status === "verified"
            ? "Face matches your ID photo · Click again to retake"
            : state.status === "checking" ? "Comparing with your ID photo…"
            : faceRetryable ? "Not checked yet · Tap to try again" : "Face not verified · Click to retake";
        }
        if (state.code === "ID_NOT_VERIFIED") {
          resetIdVerification();
          idScanState = "failed";
          if (currentStep >= 4) goToStep(3);
          renderSide("front", "failed", "ID needs checking", state.message ?? "Verify both sides of your ID again.", {
            label: "Try again", onClick: () => void scanFrontId(),
          });
        }
        updateContinueState();
      },
    });

    async function verifyConfirmedSelfie() {
      const input = currentFaceEvidence();
      if (!input || disposed) return false;
      return faceCheckController.verify(input);
    }

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

    // The address is built from the dropdowns, so residents never type it twice.
    const addressPreview = root.querySelector<HTMLElement>("#addressPreview");
    const addressPreviewText = root.querySelector<HTMLElement>("#addressPreviewText");
    const fieldValue = (id: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? "";
    const currentAddress = () => composeResidentAddress({
      sitio: fieldValue("sitio"),
      barangay: fieldValue("barangay"),
      municipality: fieldValue("municipality"),
      landmark: fieldValue("landmark"),
    });
    const updateAddressPreview = () => {
      const address = currentAddress();
      if (addressPreviewText) addressPreviewText.textContent = address;
      if (addressPreview) addressPreview.hidden = !address;
    };
    const addressInputs = ["municipality", "barangay", "sitio", "landmark"]
      .map((id) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`))
      .filter((field): field is HTMLInputElement | HTMLSelectElement => Boolean(field));
    addressInputs.forEach((field) => {
      field.addEventListener("input", updateAddressPreview);
      field.addEventListener("change", updateAddressPreview);
    });

    municipalitySelect?.addEventListener("change", handleMunicipalityChange);
    handleMunicipalityChange();

    // A refresh keeps what the resident typed. Only this tab keeps it
    // (sessionStorage), and passwords and ID photos are never stored.
    const DRAFT_KEY = "alab_signup_draft";
    const DRAFT_FIELDS = ["firstName", "lastName", "email", "phone", "municipality", "barangay", "sitio", "landmark", "username"];
    const saveDraft = () => {
      try {
        const draft: Record<string, string | number> = { step: currentStep };
        DRAFT_FIELDS.forEach((id) => { draft[id] = fieldValue(id); });
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage is blocked; the form still works, it is just not kept.
      }
    };
    const clearDraft = () => {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* nothing kept */ }
    };
    const restoreDraft = () => {
      let draft: Record<string, unknown> | null = null;
      try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null"); } catch { draft = null; }
      if (!draft || typeof draft !== "object") return;
      for (const id of ["firstName", "lastName", "email", "phone", "sitio", "landmark", "username"]) {
        const field = root.querySelector<HTMLInputElement>(`#${id}`);
        const value = draft[id];
        if (field && !field.value && typeof value === "string") field.value = value;
      }
      if (municipalitySelect && typeof draft.municipality === "string" && draft.municipality) {
        municipalitySelect.value = draft.municipality;
        handleMunicipalityChange();
        if (barangaySelect && typeof draft.barangay === "string") barangaySelect.value = draft.barangay;
      }
      updateAddressPreview();
      // ID photos are not kept, so a resident past the ID step returns to it.
      const step = Number(draft.step);
      if (step >= 2) goToStep(Math.min(step, 3));
    };
    form?.addEventListener("input", saveDraft);
    form?.addEventListener("change", saveDraft);

    const loadGooglePrefill = async () => {
      try {
        const response = await fetch("/api/auth/google/prefill/", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as {
          prefill?: { firstName: string; lastName: string; email: string } | null;
        };
        if (!result.prefill) return;

        const firstName = root.querySelector<HTMLInputElement>("#firstName");
        const lastName = root.querySelector<HTMLInputElement>("#lastName");
        const email = root.querySelector<HTMLInputElement>("#email");
        if (firstName && !firstName.value) firstName.value = result.prefill.firstName;
        if (lastName && !lastName.value) lastName.value = result.prefill.lastName;
        if (email) {
          email.value = result.prefill.email;
          email.readOnly = true;
          email.setAttribute("aria-describedby", "googlePrefillNotice");
        }

        if (!root.querySelector("#googlePrefillNotice")) {
          const notice = root.ownerDocument.createElement("p");
          notice.id = "googlePrefillNotice";
          notice.setAttribute("role", "status");
          notice.textContent = "Google verified your name and email. Complete all steps, including ID upload and phone verification.";
          notice.style.cssText = "margin:0 0 1rem;padding:.75rem .9rem;border:1px solid #bbf7d0;border-radius:.8rem;background:#f0fdf4;color:#166534;font-size:.84rem;font-weight:650;line-height:1.45;";
          panels[0]?.prepend(notice);
        }
      } catch {
        // The standard signup form remains available if the prefill cannot be read.
      }
    };
    void loadGooglePrefill();

    function goToStep(step: number) {
      if (step !== 6) stopOtpCountdown?.();
      formStatus.style.color = "#b91c1c";
      currentStep = step;
      saveDraft();
      panels.forEach((p, i) => {
        if (p) {
          p.classList.toggle("active", i === step - 1);
        }
      });
      if (stepIndicator) stepIndicator.textContent = `Step ${step} of ${TOTAL_STEPS}`;
      if (progressFill) progressFill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
      if (stepTitle) stepTitle.textContent = STEP_CONFIG[step - 1].title;
      if (stepSubtitle) stepSubtitle.textContent = STEP_CONFIG[step - 1].subtitle;
      stepTitle?.setAttribute("tabindex", "-1");
      stepTitle?.focus({ preventScroll: true });
      const formWrapper = root?.querySelector<HTMLElement>(".signup-form-wrapper");
      if (formWrapper) formWrapper.scrollTop = 0;
      if (step !== 4 && selfieCameraPanel?.classList.contains("active")) stopSelfieCamera();
      // Load face guidance while the resident handles their ID, so the camera
      // opens ready instead of downloading the model first.
      if (step === 3 || step === 4) warmSelfieGuidance();
      else releaseWarmSelfieGuidance();
      if (step === 3 && frontFile && idScanState === "idle") void scanFrontId();

      // Populate review on step 6.
      if (step === 6 && reviewContent) {
        if (!panels[5]?.contains(reviewContent)) panels[5]?.replaceChildren(...reviewPanelNodes);
        const formRoot = root!;
        const getValue = (id: string) => {
          const el = formRoot.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`);
          return el?.value ?? "";
        };

        const idStatus = frontFile ? (idVerificationToken ? "✓ ID verified" : "Not verified") : "Not uploaded";
        const idBackStatus = backFile ? (idVerificationToken ? "✓ Verified" : "Not verified") : "Not uploaded";
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
              <span style="font-weight: 600; color: #000; text-align: right; max-width: 60%;">${currentAddress()}</span>
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

    // --- ID verification ---
    const idScanFront = root.querySelector<HTMLElement>("#idScanStatus");
    const idScanBack = root.querySelector<HTMLElement>("#idScanBackStatus");
    const nameValue = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)?.value.trim() ?? "";
    const ID_SCAN_TITLES: Record<string, string> = {
      NOT_AN_ID: "Not a valid ID",
      ID_NOT_ACCEPTED: "ID not accepted",
      WRONG_SIDE: "This is the back of the ID",
      UNREADABLE: "Photo is not clear",
      NAME_NOT_FOUND: "Name not found on ID",
      NAME_MISMATCH: "Name does not match",
      TAMPERED: "ID looks edited",
      BACK_NOT_ID: "Not the back of an ID",
      BACK_MISMATCH: "Back does not match front",
      SERVICE_UNAVAILABLE: "ID check unavailable",
      TOO_MANY_CHECKS: "Too many attempts",
      INVALID_FILE: "Unsupported file",
      TOO_LARGE: "Photo too large",
      NAME_REQUIRED: "Enter your name first",
    };
    const ID_SCAN_ICONS = {
      scanning: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
      verified: '<polyline points="20 6 9 17 4 12"/>',
      failed: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      info: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9.5h20"/>',
    } as const;
    type ScanLook = keyof typeof ID_SCAN_ICONS;
    const sideParts = {
      front: { status: idScanFront, section: uploadFrontSection, dropzone: dropzoneFront, input: fileFrontInput },
      back: { status: idScanBack, section: uploadBackSection, dropzone: dropzoneBack, input: fileBackInput },
    };

    // The list of accepted IDs is only needed until the ID passes.
    const idAcceptedNote = root.querySelector<HTMLElement>("#idAcceptedNote");
    function updateContinueState() {
      if (idAcceptedNote) idAcceptedNote.hidden = Boolean(idVerificationToken);
      if (toStep4) {
        toStep4.disabled = !frontFile || !backFile || !idVerificationToken;
        toStep4.title = idVerificationToken ? "" : "Both sides of your ID must pass verification first";
      }
      if (toStep5) {
        // After a connection or server failure, Continue sends the same photos again.
        toStep5.disabled = !faceCheckController.getToken(currentFaceEvidence()) && !(selfieTaken && faceRetryable);
        toStep5.title = toStep5.disabled ? "Confirm a selfie that matches your ID photo to continue" : "";
      }
    }

    function renderSide(side: "front" | "back", look: ScanLook | null, title = "", text = "", action?: { label: string; onClick: () => void }) {
      const { status, section, dropzone } = sideParts[side];
      section?.classList.toggle("id-failed", look === "failed");
      dropzone?.classList.toggle("id-failed", look === "failed");
      section?.classList.toggle("id-verified", look === "verified");
      dropzone?.classList.toggle("id-verified", look === "verified");
      section?.classList.toggle("id-scanning", look === "scanning");
      if (!status) return;
      status.replaceChildren();
      status.hidden = !look;
      if (!look) return;
      status.className = `id-scan ${look}`;
      const icon = document.createElement("span");
      icon.className = "id-scan-icon";
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ID_SCAN_ICONS[look]}</svg>`;
      const body = document.createElement("span");
      body.className = "id-scan-body";
      const titleEl = document.createElement("span");
      titleEl.className = "id-scan-title";
      titleEl.textContent = title;
      const textEl = document.createElement("span");
      textEl.className = "id-scan-text";
      textEl.textContent = text;
      body.append(titleEl, textEl);
      status.append(icon, body);
      if (action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "id-scan-retry";
        button.textContent = action.label;
        button.addEventListener("click", (event) => { event.preventDefault(); action.onClick(); });
        status.append(button);
      }
    }

    function resetIdVerification() {
      idScanController?.abort();
      idScanController = null;
      idVerificationToken = null;
      faceCheckController.invalidate();
      idScanState = "idle";
      renderSide("front", null);
      renderSide("back", null);
      updateContinueState();
    }

    const chooseFile = (side: "front" | "back") => () => sideParts[side].input?.click();
    // Keeps Tab focus inside an open camera dialog.
    const trapDialogTab = (panel: HTMLElement, event: KeyboardEvent) => {
      const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).filter(button => !button.hidden && !button.disabled && button.getClientRects().length > 0);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && root.ownerDocument.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && root.ownerDocument.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    // Photos still being made smaller; they are never sent until ready.
    const preparingSides = new Map<"front" | "back", File>();

    async function scanFrontId() {
      if (disposed) return;
      if (preparingSides.size > 0) return; // the last photo to finish preparing starts the check
      if (!frontFile) {
        resetIdVerification();
        if (backFile) renderSide("back", "info", "Upload the front first", "Both sides are checked together.");
        return;
      }
      if (!backFile) {
        idScanController?.abort();
        idVerificationToken = null;
        faceCheckController.invalidate();
        idScanState = "idle";
        renderSide("front", "info", "Front photo ready", "Upload the back so we can check both sides together.");
        renderSide("back", "info", "Add the back of your ID", "Use the back of the same card.");
        updateContinueState();
        return;
      }
      const firstName = nameValue("firstName");
      const lastName = nameValue("lastName");
      idScanController?.abort();
      idVerificationToken = null;
      faceCheckController.invalidate();
      updateContinueState();
      if (!firstName || !lastName) {
        idScanState = "failed";
        renderSide("front", "failed", ID_SCAN_TITLES.NAME_REQUIRED, "Go back to step 1 and enter your first and last name.");
        renderSide("back", null);
        return;
      }
      const controller = new AbortController();
      idScanController = controller;
      idScanState = "scanning";
      const scannedFront = frontFile;
      const scannedBack = backFile;
      renderSide("front", "scanning", "Scanning your ID…", scannedBack ? "Checking both sides, your name and signs of editing." : "Checking that it is a clear, valid ID with your name.");
      if (scannedBack) renderSide("back", "scanning", "Checking the back…", "Making sure it belongs to the same card.");
      else renderSide("back", null);
      const body = new FormData();
      body.set("frontId", scannedFront);
      if (scannedBack) body.set("backId", scannedBack);
      body.set("firstName", firstName);
      body.set("lastName", lastName);
      try {
        const response = await fetch("/api/auth/register/id-check", { method: "POST", body, signal: controller.signal });
        const result = await response.json().catch(() => ({})) as {
          verified?: boolean; token?: string; side?: "front" | "back"; code?: string; message?: string;
          detectedName?: string | null; frontVerified?: boolean;
        };
        if (response.status === 413) {
          result.code = "TOO_LARGE";
          result.side = scannedBack && scannedBack.size > scannedFront.size ? "back" : "front";
          result.message = "This photo is too large to send. Take a new, closer photo of your ID and upload it again.";
        }
        // A newer file or name may have replaced this scan while it ran.
        if (disposed || controller.signal.aborted || scannedFront !== frontFile || scannedBack !== backFile) return;
        const nameLine = result.detectedName ? `Name on ID: ${result.detectedName}` : "Your ID matches your name.";
        if (response.ok && result.verified === true && typeof result.token === "string" && result.token.length > 0 && result.token.length <= 4000) {
          idVerificationToken = result.token;
          idScanState = "verified";
          renderSide("front", "verified", "ID verified", nameLine);
          renderSide("back", "verified", "Back verified", "Same card as the front.");
          if (formStatus.textContent?.includes("ID")) formStatus.textContent = "";
          updateContinueState();
          // Only the current successful pair can advance the visible ID step.
          // Returning with Back leaves the photos available for review/replacing.
          if (currentStep === 3) {
            goToStep(4);
            formStatus.style.color = "#15803d";
            formStatus.textContent = "Both sides of your ID are verified. Take your selfie to continue.";
          }
          if (selfieTaken && selfieFile) void verifyConfirmedSelfie();
          return;
        }
        const code = result.code ?? "";
        if (code === "BACK_REQUIRED") {
          idScanState = "verified";
          renderSide("front", "verified", "Front checked", nameLine);
          renderSide("back", "info", "Upload the back of your ID", "Both sides must be from the same card.");
          updateContinueState();
          return;
        }
        idScanState = "failed";
        const failedSide = result.side === "back" ? "back" : "front";
        const retrySame = code === "SERVICE_UNAVAILABLE" || code === "TOO_MANY_CHECKS";
        const action = retrySame
          ? { label: "Try again", onClick: () => void scanFrontId() }
          : { label: failedSide === "back" ? "Upload another photo" : "Upload another ID", onClick: chooseFile(failedSide) };
        const title = ID_SCAN_TITLES[code] ?? "ID not verified";
        const message = result.message ?? "We could not verify this ID. Upload another photo.";
        if (failedSide === "back") {
          if (result.frontVerified) renderSide("front", "verified", "Front checked", nameLine);
          else renderSide("front", "info", "Front not checked yet", "Both sides are checked together once the back photo is fixed.");
          renderSide("back", "failed", title, message, action);
        } else {
          renderSide("front", "failed", title, message, action);
          renderSide("back", null);
        }
        updateContinueState();
      } catch {
        if (controller.signal.aborted) return;
        idScanState = "failed";
        renderSide("front", "failed", "Could not check your ID", "Check your internet connection and try again.", { label: "Try again", onClick: () => void scanFrontId() });
        renderSide("back", null);
        updateContinueState();
      }
    }

    // A verified ID belongs to the name it was checked against.
    const handleNameChange = () => {
      if (!frontFile || idScanState === "idle") return;
      resetIdVerification();
    };
    const firstNameInput = root.querySelector<HTMLInputElement>("#firstName");
    const lastNameInput = root.querySelector<HTMLInputElement>("#lastName");
    firstNameInput?.addEventListener("input", handleNameChange);
    lastNameInput?.addEventListener("input", handleNameChange);

    // --- File upload helpers ---
    // The chosen photo is shown in the card so the resident can check it is readable.
    const idThumbUrls = new Map<HTMLElement, string>();
    function updateDropzoneUI(dropzone: HTMLElement | null, section: HTMLElement | null, file: File | null) {
      if (!dropzone) return;
      dropzone.querySelector<HTMLElement>(".file-preview")?.remove();
      const previousUrl = idThumbUrls.get(dropzone);
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      idThumbUrls.delete(dropzone);
      dropzone.classList.toggle("has-file", Boolean(file));
      section?.classList.toggle("has-file", Boolean(file));
      if (!file) return;

      const url = URL.createObjectURL(file);
      idThumbUrls.set(dropzone, url);
      const preview = document.createElement("div");
      preview.className = "file-preview";
      preview.innerHTML = `
        <img class="id-thumb" src="${url}" alt="${dropzone === dropzoneBack ? "Back" : "Front"} of your ID">
        <span class="id-file-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>
          <span class="id-file-name"></span>
          <button type="button" class="remove-file" title="Remove photo" aria-label="Remove photo">&times;</button>
        </span>
      `;
      // The file name is set as text, never as HTML.
      const name = preview.querySelector<HTMLElement>(".id-file-name");
      if (name) name.textContent = file.name;
      dropzone.appendChild(preview);
    }

    function handleFileSelect(
      e: Event,
      setFile: (f: File | null) => void,
      dropzone: HTMLElement | null,
      section: HTMLElement | null
    ) {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0] ?? null;
      if (file && file.size > 15 * 1024 * 1024) {
        window.alert("Photo must be smaller than 15 MB.");
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
          preparingSides.delete("front");
          if (fileFrontInput) fileFrontInput.value = "";
          updateDropzoneUI(dropzoneFront, uploadFrontSection, null);
          resetIdVerification();
        } else if (dropzone === dropzoneBack) {
          backFile = null;
          preparingSides.delete("back");
          if (fileBackInput) fileBackInput.value = "";
          updateDropzoneUI(dropzoneBack, uploadBackSection, null);
          if (frontFile) void scanFrontId();
          else resetIdVerification();
        }
        return;
      }
      // Clicking the photo area opens the file picker, as the old upload box did.
      chooseFile(e.currentTarget === dropzoneBack ? "back" : "front")();
    }

    // Setup drag-and-drop
    const cleanupDragFront = setupDragDrop(dropzoneFront, fileFrontInput);
    const cleanupDragBack = setupDragDrop(dropzoneBack, fileBackInput);

    // File input change handlers
    // Photos are made smaller before the check, and the same smaller copy is
    // sent at registration, so the verification token still matches it.
    async function prepareIdSide(side: "front" | "back", picked: File) {
      idScanController?.abort();
      idVerificationToken = null;
      faceCheckController.invalidate();
      idScanState = "scanning";
      preparingSides.set(side, picked);
      updateContinueState();
      renderSide(side, "scanning", "Preparing your photo…", "Making it ready for a quick check.");
      const small = await shrinkPhoto(picked);
      if (disposed || preparingSides.get(side) !== picked) return; // replaced, removed or unmounted meanwhile
      preparingSides.delete(side);
      if ((side === "front" ? frontFile : backFile) !== picked) return;
      if (side === "front") frontFile = small;
      else backFile = small;
      // Both sides go in one check, so wait for the other side if it is still being prepared.
      if (preparingSides.size === 0) void scanFrontId();
    }

    const handleFrontFileChange = (e: Event) => {
      const previous = frontFile;
      handleFileSelect(
        e,
        (f) => { frontFile = f; },
        dropzoneFront,
        uploadFrontSection
      );
      if (frontFile && frontFile !== previous) void prepareIdSide("front", frontFile);
      else if (!frontFile) {
        preparingSides.delete("front");
        resetIdVerification();
      }
    };
    const handleBackFileChange = (e: Event) => {
      const previous = backFile;
      handleFileSelect(
        e,
        (f) => { backFile = f; },
        dropzoneBack,
        uploadBackSection
      );
      if (backFile && backFile !== previous) void prepareIdSide("back", backFile);
    };

    fileFrontInput?.addEventListener("change", handleFrontFileChange);
    fileBackInput?.addEventListener("change", handleBackFileChange);
    dropzoneFront?.addEventListener("click", handleDropzoneClick);
    dropzoneBack?.addEventListener("click", handleDropzoneClick);

    // --- Guided ID camera ---
    // A camera photo is put into the same file input as an upload, so it goes
    // through the same size check, shrinking and ID scan.
    const idCameraPanel = root.querySelector<HTMLElement>("#idCameraPanel");
    const idCameraVideo = root.querySelector<HTMLVideoElement>("#idCameraVideo");
    const idCameraPreview = root.querySelector<HTMLImageElement>("#idCameraPreview");
    const idCameraFrame = root.querySelector<HTMLElement>("#idCameraFrame");
    const idCameraFlash = root.querySelector<HTMLElement>("#idCameraFlash");
    const idCameraSide = root.querySelector<HTMLElement>("#idCameraSide");
    const idCameraHint = root.querySelector<HTMLElement>("#idCameraHint");
    const idCameraReview = root.querySelector<HTMLElement>("#idCameraReview");
    const idCameraError = root.querySelector<HTMLElement>("#idCameraError");
    const captureIdBtn = root.querySelector<HTMLButtonElement>("#captureIdPhoto");
    const closeIdCameraBtn = root.querySelector<HTMLButtonElement>("#closeIdCamera");
    const retakeIdBtn = root.querySelector<HTMLButtonElement>("#retakeIdPhoto");
    const useIdBtn = root.querySelector<HTMLButtonElement>("#useIdPhoto");
    const retryIdCameraBtn = root.querySelector<HTMLButtonElement>("#retryIdCamera");
    const uploadIdInsteadBtn = root.querySelector<HTMLButtonElement>("#uploadIdInstead");
    const idSideButtons = {
      front: { scan: root.querySelector<HTMLButtonElement>("#scanFrontBtn"), upload: root.querySelector<HTMLButtonElement>("#uploadFrontBtn") },
      back: { scan: root.querySelector<HTMLButtonElement>("#scanBackBtn"), upload: root.querySelector<HTMLButtonElement>("#uploadBackBtn") },
    };
    let idCameraStream: MediaStream | null = null;
    let idCameraSideKey: "front" | "back" = "front";
    let idCameraShot: Blob | null = null;
    let idCameraShotUrl: string | null = null;
    let idCameraAttempt = 0;
    let idCameraOverflow: string | null = null;

    const setIdCameraState = (state: "loading" | "live" | "review" | "error", hint: string) => {
      idCameraPanel?.setAttribute("data-state", state);
      if (idCameraHint) idCameraHint.textContent = hint;
      if (idCameraVideo) idCameraVideo.hidden = state === "review";
      if (idCameraPreview) idCameraPreview.hidden = state !== "review";
      if (captureIdBtn) {
        captureIdBtn.hidden = state === "review" || state === "error";
        captureIdBtn.disabled = state !== "live";
      }
      if (idCameraReview) idCameraReview.hidden = state !== "review";
      if (idCameraError) idCameraError.hidden = state !== "error";
    };
    const clearIdCameraShot = () => {
      if (idCameraShotUrl) URL.revokeObjectURL(idCameraShotUrl);
      idCameraShotUrl = null;
      idCameraShot = null;
      idCameraPreview?.removeAttribute("src");
    };
    const closeIdCamera = () => {
      idCameraAttempt++;
      idCameraStream?.getTracks().forEach((track) => track.stop());
      idCameraStream = null;
      if (idCameraVideo) idCameraVideo.srcObject = null;
      clearIdCameraShot();
      idCameraPanel?.classList.remove("active");
      idCameraPanel?.setAttribute("aria-hidden", "true");
      if (idCameraOverflow !== null) {
        root.ownerDocument.body.style.overflow = idCameraOverflow;
        idCameraOverflow = null;
        if (!disposed) idSideButtons[idCameraSideKey].scan?.focus();
      }
    };
    const startIdCamera = async () => {
      const attempt = ++idCameraAttempt;
      clearIdCameraShot();
      setIdCameraState("loading", "Opening camera…");
      if (!navigator.mediaDevices?.getUserMedia || !idCameraVideo) {
        setIdCameraState("error", "This browser cannot open the camera. Upload a photo instead.");
        return;
      }
      try {
        if (!idCameraStream?.getTracks().some((track) => track.readyState === "live")) {
          idCameraStream?.getTracks().forEach((track) => track.stop());
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
          if (disposed || attempt !== idCameraAttempt) { stream.getTracks().forEach((track) => track.stop()); return; }
          idCameraStream = stream;
        }
        if (idCameraVideo.srcObject !== idCameraStream) idCameraVideo.srcObject = idCameraStream;
        await idCameraVideo.play();
        if (disposed || attempt !== idCameraAttempt) return;
        setIdCameraState("live", "Fit the whole card inside the frame, then tap the button.");
      } catch (error) {
        if (disposed || attempt !== idCameraAttempt) return;
        const reason = error instanceof DOMException ? error.name : "";
        setIdCameraState("error", reason === "NotAllowedError"
          ? "Camera access is blocked. Allow it in your browser settings, or upload a photo instead."
          : reason === "NotFoundError" ? "No camera was found. Upload a photo instead."
          : "The camera could not start. Try again, or upload a photo instead.");
      }
    };
    const openIdCamera = (side: "front" | "back") => {
      idCameraSideKey = side;
      if (idCameraSide) idCameraSide.textContent = side === "front" ? "Front of ID" : "Back of ID";
      idCameraPanel?.classList.add("active");
      idCameraPanel?.setAttribute("aria-hidden", "false");
      if (idCameraOverflow === null) {
        idCameraOverflow = root.ownerDocument.body.style.overflow;
        root.ownerDocument.body.style.overflow = "hidden";
      }
      closeIdCameraBtn?.focus();
      void startIdCamera();
    };
    const handleCaptureId = () => {
      const video = idCameraVideo;
      if (!video || !idCameraStream || captureIdBtn?.disabled || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const attempt = idCameraAttempt;
      if (captureIdBtn) captureIdBtn.disabled = true;
      // Keep only what is inside the frame, so the card fills the photo.
      const crop = idFrameCrop(video.getBoundingClientRect(), idCameraFrame?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }, video.videoWidth, video.videoHeight);
      const scale = Math.min(1, 1600 / Math.max(crop.width, crop.height));
      const canvas = root.ownerDocument.createElement("canvas");
      canvas.width = Math.round(crop.width * scale);
      canvas.height = Math.round(crop.height * scale);
      canvas.getContext("2d")?.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (disposed || attempt !== idCameraAttempt) return;
        if (!blob) {
          setIdCameraState("live", "That photo did not save. Please take it again.");
          return;
        }
        idCameraShot = blob;
        idCameraShotUrl = URL.createObjectURL(blob);
        if (idCameraPreview) idCameraPreview.src = idCameraShotUrl;
        idCameraFlash?.animate?.([{ opacity: 0.8 }, { opacity: 0 }], { duration: 450, easing: "ease-out" });
        setIdCameraState("review", "Is all the text sharp and easy to read?");
      }, "image/jpeg", 0.92);
    };
    const handleUseIdPhoto = () => {
      const input = sideParts[idCameraSideKey].input;
      if (!idCameraShot || !input) return;
      const file = new File([idCameraShot], `id-${idCameraSideKey}-camera.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      closeIdCamera();
      const files = new DataTransfer();
      files.items.add(file);
      input.files = files.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const handleUploadIdInstead = () => {
      const side = idCameraSideKey;
      closeIdCamera();
      chooseFile(side)();
    };
    const handleRetryIdCamera = () => { void startIdCamera(); };
    const handleIdCameraKey = (event: KeyboardEvent) => {
      if (!idCameraPanel?.classList.contains("active")) return;
      if (event.key === "Escape") { event.preventDefault(); closeIdCamera(); }
      if (event.key === "Tab") trapDialogTab(idCameraPanel, event);
    };
    const idSideHandlers = (["front", "back"] as const).map((side) => {
      const scan = () => openIdCamera(side);
      const upload = chooseFile(side);
      idSideButtons[side].scan?.addEventListener("click", scan);
      idSideButtons[side].upload?.addEventListener("click", upload);
      return () => {
        idSideButtons[side].scan?.removeEventListener("click", scan);
        idSideButtons[side].upload?.removeEventListener("click", upload);
      };
    });
    captureIdBtn?.addEventListener("click", handleCaptureId);
    closeIdCameraBtn?.addEventListener("click", closeIdCamera);
    retakeIdBtn?.addEventListener("click", handleRetryIdCamera);
    retryIdCameraBtn?.addEventListener("click", handleRetryIdCamera);
    useIdBtn?.addEventListener("click", handleUseIdPhoto);
    uploadIdInsteadBtn?.addEventListener("click", handleUploadIdInstead);
    idCameraPanel?.addEventListener("keydown", handleIdCameraKey);

    function showSelfieCaptured() {
      selfieTaken = selfieViews.count() === 3;
      selfieFile = selfieViews.get("front");
      selfieSection?.classList.toggle("has-capture", selfieTaken);
      selfieCapture?.classList.toggle("has-capture", selfieTaken);
      if (selfieCount) selfieCount.textContent = `${selfieViews.count()} of 3 photos captured`;
      if (selfieMain) selfieMain.textContent = selfieTaken ? "Three views captured" : "Continue guided selfie";
      for (const view of SELFIE_VIEWS) {
        const image = root?.querySelector<HTMLImageElement>(`#selfieThumb${view.label}`);
        const retake = root?.querySelector<HTMLButtonElement>(`#retakeSelfie${view.label}`);
        if (image && selfieUrls.has(view.key)) {
          image.src = selfieUrls.get(view.key)!;
          image.hidden = false;
        }
        if (retake) retake.disabled = !selfieViews.get(view.key);
      }
      updateContinueState();
    }

    let activeSelfieView: SelfieView = "front";
    let cameraAttempt = 0;
    let captureBusy = false;
    let confirmationBusy = false;
    let guidanceReady = false;
    let guidanceController: AbortController | null = null;
    let guidanceSession: { stop: () => void } | null = null;
    let guidanceOwner: ReturnType<typeof createSelfieGuidanceSession> | null = null;
    let pendingSelfieUrl: string | null = null;
    let previousBodyOverflow: string | null = null;

    function warmSelfieGuidance() {
      if (disposed || !navigator.mediaDevices?.getUserMedia) return;
      guidanceOwner ??= createSelfieGuidanceSession();
      guidanceOwner.preload?.();
    }
    function releaseWarmSelfieGuidance() {
      if (selfieCameraPanel?.classList.contains("active")) return;
      guidanceOwner?.close();
      guidanceOwner = null;
    }
    // One camera stream serves every view while the dialog stays open, so the
    // next view starts without asking the camera to open again.
    function liveSelfieStream() {
      if (selfieStream?.getTracks().some((track) => track.readyState !== "ended")) return selfieStream;
      selfieStream?.getTracks().forEach((track) => track.stop());
      selfieStream = null;
      return null;
    }

    const renderSelfieCue = (state: { code: string; direction?: string; progress?: number }) => {
      const cue = selfieGuidanceCue(state, activeSelfieView);
      selfieCameraPanel?.setAttribute("data-turn", cue.kind === "turn" && (cue.direction === "left" || cue.direction === "right") ? cue.direction : "none");
      if (selfieDirectionCue) {
        selfieDirectionCue.hidden = cue.direction === "none";
        selfieDirectionCue.setAttribute("data-direction", cue.direction);
        selfieDirectionCue.setAttribute("data-kind", cue.kind);
      }
      if (selfieCueTitle && selfieCueTitle.textContent !== cue.title) selfieCueTitle.textContent = cue.title;
      if (selfieCueDetail && selfieCueDetail.textContent !== cue.detail) selfieCueDetail.textContent = cue.detail;
      selfieFaceGuide?.setAttribute("data-feedback", cue.kind);
      selfieCameraPanel?.setAttribute("data-guidance", state.code === "loading" ? "loading" : state.code === "review" ? "review" : "active");
    };

    const releaseGuidance = () => {
      guidanceController?.abort();
      guidanceController = null;
      guidanceSession?.stop();
      guidanceSession = null;
      guidanceReady = false;
    };
    const releasePreviewUrl = () => {
      if (pendingSelfieUrl) URL.revokeObjectURL(pendingSelfieUrl);
      pendingSelfieUrl = null;
    };
    const resetSelfieCameraUi = () => {
      releasePreviewUrl();
      pendingSelfieBlob = null;
      captureBusy = false;
      confirmationBusy = false;
      if (selfieVideo) selfieVideo.hidden = false;
      if (selfiePreview) {
        selfiePreview.hidden = true;
        selfiePreview.removeAttribute("src");
      }
      if (activeSelfieView === "front") selfieFaceGuide?.removeAttribute("hidden");
      else selfieFaceGuide?.setAttribute("hidden", "true");
      selfieFaceGuide?.classList.remove("ready");
      selfieFaceGuide?.style.setProperty("--capture-progress", "0%");
      selfieHoldProgress?.style.setProperty("--capture-progress", "0%");
      renderSelfieCue({ code: "loading" });
      if (selfieGuidance) selfieGuidance.textContent = "Opening camera…";
      if (captureSelfieBtn) { captureSelfieBtn.hidden = false; captureSelfieBtn.disabled = true; }
      if (useSelfieBtn) useSelfieBtn.disabled = false;
      if (selfieCameraRetry) selfieCameraRetry.hidden = true;
      if (selfieReviewActions) selfieReviewActions.hidden = true;
    };

    const closeSelfieCamera = (keepDetector = false, keepStream = false) => {
      cameraAttempt++;
      releaseGuidance();
      if (!keepDetector) { guidanceOwner?.close(); guidanceOwner = null; }
      if (!keepStream) {
        selfieStream?.getTracks().forEach((track) => track.stop());
        selfieStream = null;
        if (selfieVideo) selfieVideo.srcObject = null;
      }
      selfieCameraPanel?.classList.remove("active");
      selfieCameraPanel?.setAttribute("aria-hidden", "true");
      selfieCapture?.setAttribute("aria-expanded", "false");
      resetSelfieCameraUi();
      if (previousBodyOverflow !== null) {
        root.ownerDocument.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = null;
        if (!disposed) selfieCapture?.focus();
      }
    };
    const stopSelfieCamera = () => closeSelfieCamera();

    // The camera keeps running behind the review so the next view opens at once.
    const showSelfieReview = (dataUrl: string) => {
      releaseGuidance();
      if (selfieVideo) selfieVideo.hidden = true;
      if (selfiePreview) {
        selfiePreview.src = dataUrl;
        selfiePreview.hidden = false;
      }
      selfieFaceGuide?.setAttribute("hidden", "true");
      renderSelfieCue({ code: "review" });
      if (selfieGuidance) selfieGuidance.textContent = "Is your face clear? Confirm this photo or take it again.";
      if (captureSelfieBtn) captureSelfieBtn.hidden = true;
      if (selfieReviewActions) selfieReviewActions.hidden = false;
    };

    const startSelfieCamera = async (view: SelfieView = selfieViews.nextMissing() ?? "front") => {
      closeSelfieCamera(true, true);
      activeSelfieView = view;
      selfieCameraPanel?.setAttribute("data-view", view);
      const attempt = cameraAttempt;
      if (!navigator.mediaDevices?.getUserMedia || !selfieVideo) {
        formStatus.textContent = "Camera access is not supported by this browser. Try a recent Chrome, Safari or Edge browser.";
        return;
      }
      const pose = SELFIE_VIEWS.find(item => item.key === view)!;
      try {
        resetSelfieCameraUi();
        if (selfieCameraHeading) selfieCameraHeading.textContent = pose.heading;
        if (selfieCameraProgress) selfieCameraProgress.textContent = `${SELFIE_VIEWS.findIndex(item => item.key === view) + 1} / 3 · ${pose.label} view`;
        for (const phase of SELFIE_VIEWS) {
          const node = root.querySelector<HTMLElement>(`#selfiePhase${phase.label}`);
          node?.setAttribute("data-state", phase.key === view ? "active" : selfieViews.get(phase.key) ? "done" : "pending");
        }
        selfieCameraPanel?.classList.add("active");
        selfieCameraPanel?.setAttribute("aria-hidden", "false");
        selfieCapture?.setAttribute("aria-expanded", "true");
        previousBodyOverflow = root.ownerDocument.body.style.overflow;
        root.ownerDocument.body.style.overflow = "hidden";
        cancelSelfieBtn?.focus();
        let stream = liveSelfieStream();
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false,
          });
          if (disposed || attempt !== cameraAttempt) { stream.getTracks().forEach(track => track.stop()); return; }
          selfieStream = stream;
        }
        if (selfieVideo.srcObject !== stream) selfieVideo.srcObject = stream;
        await selfieVideo.play();
        if (disposed || attempt !== cameraAttempt) return;
        if (selfieGuidance) selfieGuidance.textContent = "Preparing face guidance…";
        if (!selfieFaceGuide) throw new Error("Missing face guide");
        guidanceController = new AbortController();
        guidanceOwner ??= createSelfieGuidanceSession();
        const session = await guidanceOwner.start({
          video: selfieVideo, guide: selfieFaceGuide, view, signal: guidanceController.signal,
          onUpdate: (state) => {
            if (disposed || attempt !== cameraAttempt || captureBusy || pendingSelfieBlob) return;
            guidanceReady = state.ready;
            if (selfieGuidance && selfieGuidance.textContent !== state.message) selfieGuidance.textContent = state.message;
            renderSelfieCue(state);
            if (state.code === "unavailable") {
              guidanceOwner?.close(); guidanceOwner = null;
              if (selfieCameraRetry) selfieCameraRetry.hidden = false;
            }
            selfieFaceGuide.classList.toggle("ready", state.ready);
            selfieFaceGuide.style.setProperty("--capture-progress", `${Math.round(state.progress * 100)}%`);
            selfieHoldProgress?.style.setProperty("--capture-progress", `${Math.round(state.progress * 100)}%`);
            // Manual capture uses the same sustained-position gate as auto capture.
            if (captureSelfieBtn) captureSelfieBtn.disabled = !state.ready || state.progress < 1;
          },
          onReady: () => {
            if (!disposed && attempt === cameraAttempt && !captureBusy && !pendingSelfieBlob) handleCaptureSelfie();
          },
        });
        if (disposed || attempt !== cameraAttempt || pendingSelfieBlob) session.stop();
        else guidanceSession = session;
      } catch {
        if (disposed || attempt !== cameraAttempt) return;
        releaseGuidance();
        guidanceOwner?.close(); guidanceOwner = null;
        selfieStream?.getTracks().forEach(track => track.stop()); selfieStream = null;
        selfieVideo.srcObject = null;
        if (selfieGuidance) selfieGuidance.textContent = "We couldn’t start face guidance. Allow camera access, check your connection and try again.";
        renderSelfieCue({ code: "unavailable" });
        if (selfieCameraRetry) selfieCameraRetry.hidden = false;
      }
    };

    const handleSelfieClick = async () => {
      // A connection or server failure keeps the photos: check them again.
      if (selfieTaken && faceRetryable) {
        await verifyConfirmedSelfie();
        return;
      }
      await startSelfieCamera();
    };

    const handleCaptureSelfie = () => {
      if (!guidanceReady || captureSelfieBtn?.disabled || captureBusy || pendingSelfieBlob
        || !selfieStream || !selfieVideo || selfieVideo.readyState < 2 || !selfieVideo.videoWidth || !selfieVideo.videoHeight) return;
      const attempt = cameraAttempt;
      captureBusy = true;
      if (captureSelfieBtn) captureSelfieBtn.disabled = true;
      const frame = root.ownerDocument.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(selfieVideo.videoWidth, selfieVideo.videoHeight));
      frame.width = Math.round(selfieVideo.videoWidth * scale);
      frame.height = Math.round(selfieVideo.videoHeight * scale);
      frame.getContext("2d")?.drawImage(selfieVideo, 0, 0, frame.width, frame.height);
      frame.toBlob((blob) => {
        if (disposed || attempt !== cameraAttempt) return;
        if (!blob) {
          captureBusy = false;
          void startSelfieCamera(activeSelfieView);
          return;
        }
        pendingSelfieBlob = blob;
        selfieCaptureFlash?.animate?.([{ opacity: 0.8 }, { opacity: 0 }], { duration: 450, easing: "ease-out" });
        // Side views are saved at once; only the front photo, which is
        // compared with the ID, is shown for review.
        if (activeSelfieView !== "front") {
          void handleUseSelfie();
          return;
        }
        pendingSelfieUrl = URL.createObjectURL(blob);
        showSelfieReview(pendingSelfieUrl);
      }, "image/jpeg", 0.88);
    };

    const handleUseSelfie = async () => {
      if (!pendingSelfieBlob || confirmationBusy) return;
      const attempt = cameraAttempt;
      const view = activeSelfieView;
      confirmationBusy = true;
      if (useSelfieBtn) useSelfieBtn.disabled = true;
      try {
        const confirmed = await shrinkPhoto(new File([pendingSelfieBlob], `resident-selfie-${view}-${Date.now()}.jpg`, { type: "image/jpeg" }), { maxSize: 1280, maxBytes: 350 * 1024 });
        if (disposed || attempt !== cameraAttempt) return;
        if (confirmed.size > 350 * 1024) throw new Error("PHOTO_TOO_LARGE");
        faceCheckController.invalidate();
        selfieViews.set(view, confirmed);
        const previous = selfieUrls.get(view);
        if (previous) URL.revokeObjectURL(previous);
        selfieUrls.set(view, URL.createObjectURL(confirmed));
        const next = selfieViews.nextMissing();
        closeSelfieCamera(Boolean(next), Boolean(next));
        showSelfieCaptured();
        if (next) await startSelfieCamera(next);
        else await verifyConfirmedSelfie();
      } catch {
        if (!disposed && attempt === cameraAttempt) {
          if (selfieGuidance) selfieGuidance.textContent = "Unable to prepare this photo. Please retake it.";
          // Side views have no review buttons, so take that view again.
          if (view !== "front") void startSelfieCamera(view);
        }
      } finally {
        if (attempt === cameraAttempt) {
          confirmationBusy = false;
          if (useSelfieBtn) useSelfieBtn.disabled = false;
        }
      }
    };

    const handleRetakeSelfie = async () => {
      await startSelfieCamera(activeSelfieView);
    };

    const viewRetakeHandlers = SELFIE_VIEWS.map(view => {
      const button = root.querySelector<HTMLButtonElement>(`#retakeSelfie${view.label}`);
      const handler = () => { if (selfieViews.get(view.key)) void startSelfieCamera(view.key); };
      button?.addEventListener("click", handler);
      return () => button?.removeEventListener("click", handler);
    });
    const handleCameraKey = (event: KeyboardEvent) => {
      if (!selfieCameraPanel?.classList.contains("active")) return;
      if (event.key === "Escape") { event.preventDefault(); stopSelfieCamera(); }
      if (event.key === "Tab") trapDialogTab(selfieCameraPanel, event);
    };
    selfieCameraPanel?.addEventListener("keydown", handleCameraKey);

    selfieCapture?.addEventListener("click", handleSelfieClick);
    captureSelfieBtn?.addEventListener("click", handleCaptureSelfie);
    cancelSelfieBtn?.addEventListener("click", stopSelfieCamera);
    retakeSelfieBtn?.addEventListener("click", handleRetakeSelfie);
    useSelfieBtn?.addEventListener("click", handleUseSelfie);
    selfieCameraRetry?.addEventListener("click", handleRetakeSelfie);

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
      formStatus.textContent = `Please complete your ${fieldLabel(invalidField)} to continue.`;
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
      if (validateStep(panels[1])) goToStep(frontFile && backFile && idVerificationToken ? 4 : 3);
    };
    const handleToStep4 = () => {
      formStatus.textContent = "";
      if (!validateStep(panels[2])) return;
      if (!frontFile || !backFile) {
        formStatus.textContent = "Upload the front and back of your valid ID before continuing.";
        return;
      }
      if (!idVerificationToken) {
        if (idScanState === "scanning") formStatus.textContent = "Please wait while we check your ID.";
        else {
          formStatus.textContent = "Your ID must be verified before you continue.";
          if (idScanState !== "failed") void scanFrontId();
        }
        return;
      }
      goToStep(4);
    };
    const handleToStep5 = async () => {
      formStatus.textContent = "";
      if (!idVerificationToken) {
        goToStep(3);
        formStatus.textContent = "Verify both sides of your ID before taking your selfie.";
        return;
      }
      if (selfieTaken && faceRetryable && !faceCheckController.getToken(currentFaceEvidence())) {
        if (!(await verifyConfirmedSelfie()) || disposed || currentStep !== 4) return;
        formStatus.textContent = "";
      }
      if (!selfieTaken || !faceCheckController.getToken(currentFaceEvidence())) {
        formStatus.textContent = faceMatchState === "checking"
          ? "Please wait while we compare your selfie with your ID."
          : "Confirm a selfie that matches your ID photo before continuing.";
        return;
      }
      goToStep(5);
    };
    const handleToStep6 = () => {
      formStatus.textContent = "";
      if (!validateStep(panels[4])) return;
      if (passwordField?.value !== confirmField?.value) {
        formStatus.textContent = "Passwords do not match.";
        return;
      }
      goToStep(6);
    };
    const handleBackToStep1 = () => goToStep(1);
    const handleBackToStep2 = () => goToStep(2);
    const handleBackToStep3 = () => goToStep(3);
    const handleBackToStep4 = () => goToStep(4);
    const handleBackToStep5 = () => goToStep(5);

    const validateRegistration = () => {
      for (const [index, panel] of panels.entries()) {
        const invalidField = getInvalidField(panel);
        if (invalidField) {
          showInvalidField(index + 1, invalidField);
          return false;
        }
      }

      if (!frontFile || !backFile) {
        goToStep(3);
        formStatus.textContent = "Upload the front and back of your valid ID to continue.";
        return false;
      }

      if (!selfieTaken) {
        goToStep(4);
        formStatus.textContent = "Take and confirm your selfie to continue.";
        return false;
      }

      if (!idVerificationToken) {
        goToStep(3);
        formStatus.textContent = "Your ID must be verified before you continue.";
        return false;
      }

      if (!faceCheckController.getToken(currentFaceEvidence())) {
        goToStep(4);
        formStatus.textContent = faceMatchState === "checking"
          ? "Please wait while we compare your selfie with your ID."
          : "Confirm a selfie that matches your ID photo to continue.";
        return false;
      }

      if (!passwordField || passwordField.value !== confirmField?.value) {
        goToStep(5);
        formStatus.textContent = "Passwords do not match.";
        confirmField?.focus();
        return false;
      }

      const termsCheck = root.querySelector<HTMLInputElement>("#termsCheck");
      if (!termsCheck?.checked) {
        goToStep(6);
        formStatus.textContent = "Please agree to the Terms of Service and Privacy Policy.";
        termsCheck?.focus();
        return false;
      }

      return true;
    };

    const showAccountConfirmation = (verificationId: string) => {
      const panel = panels[5];
      if (!panel) return;
      panel.innerHTML = `<section style="display:grid;gap:1.15rem;padding:clamp(.25rem,1vw,.75rem) 0;text-align:center"><div style="margin:auto;display:grid;place-items:center;width:4.2rem;height:4.2rem;border-radius:1.35rem;background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 .9rem 1.8rem rgba(22,163,74,.22);color:#fff;font-size:1.65rem">✓</div><div><h3 style="margin:0;color:#166534;font-size:1.45rem">Phone verified</h3><p style="margin:.5rem auto 0;max-width:27rem;color:#475569;line-height:1.55">Your phone is confirmed. Review your details, then create your resident account.</p></div><div style="display:grid;gap:.55rem;padding:1rem;border:1px solid #dcfce7;border-radius:1rem;background:#f0fdf4;text-align:left;color:#334155;font-size:.9rem"><span><strong>Name:</strong> ${root.querySelector<HTMLInputElement>("#firstName")?.value ?? ""} ${root.querySelector<HTMLInputElement>("#lastName")?.value ?? ""}</span><span><strong>Username:</strong> ${root.querySelector<HTMLInputElement>("#username")?.value ?? ""}</span><span><strong>Phone:</strong> ${root.querySelector<HTMLInputElement>("#phone")?.value ?? ""}</span></div><p id="accountConfirmationStatus" role="alert" style="min-height:1.3rem;margin:0;color:#b91c1c;font-size:.86rem;font-weight:700"></p><button id="completeAccountButton" type="button" style="width:100%;border:0;border-radius:.85rem;padding:1rem;background:linear-gradient(135deg,#ef2d1d,#b91c1c);box-shadow:0 .7rem 1.4rem rgba(220,38,38,.22);color:#fff;font-weight:800;cursor:pointer">Create my account</button></section>`;
      const completeButton = panel.querySelector<HTMLButtonElement>("#completeAccountButton")!;
      const status = panel.querySelector<HTMLElement>("#accountConfirmationStatus")!;
      completeButton.onclick = async () => {
        completeButton.disabled = true;
        completeButton.textContent = "Creating your account…";
        status.textContent = "";
        try {
          const views = selfieViews.evidence();
          if (!frontFile || !backFile || !views) throw new Error("MISSING_EVIDENCE");
          if (!idVerificationToken) {
            completeButton.disabled = false;
            completeButton.textContent = "Create my account";
            status.textContent = "Your ID must be verified first. Go back to Identity Verification.";
            return;
          }
          const faceVerificationToken = faceCheckController.getToken(currentFaceEvidence());
          if (!faceVerificationToken) {
            completeButton.disabled = false;
            completeButton.textContent = "Create my account";
            goToStep(4);
            formStatus.textContent = "Confirm a selfie that matches your ID photo to continue.";
            return;
          }
          const registration = new FormData();
          registration.set("verificationId", verificationId);
          registration.set("idVerificationToken", idVerificationToken);
          registration.set("faceVerificationToken", faceVerificationToken);
          registration.set("frontId", frontFile);
          registration.set("backId", backFile);
          registration.set("selfie", views.selfie);
          registration.set("selfieRight", views.selfieRight);
          registration.set("selfieLeft", views.selfieLeft);
          const register = await fetch("/api/auth/register", { method: "POST", body: registration });
          if (!register.ok) {
            const failed = await register.json() as { error?: string; code?: string };
            if (failed.code === "ID_NOT_VERIFIED") {
              resetIdVerification();
              goToStep(3);
              formStatus.textContent = failed.error ?? "Please verify both sides of your ID again.";
            }
            if (failed.code === "FACE_NOT_VERIFIED") {
              faceCheckController.invalidate();
              goToStep(4);
              formStatus.textContent = failed.error ?? "Please confirm your selfie again.";
            }
            completeButton.disabled = false;
            completeButton.textContent = "Create my account";
            status.textContent = failed.error ?? "Unable to create your account.";
            return;
          }
          clearDraft();
          window.location.assign("/resident/application");
        } catch {
          completeButton.disabled = false;
          completeButton.textContent = "Create my account";
          status.textContent = "Unable to reach the account service. Please try again.";
        }
      };
    };

    const showOtpPanel = (verificationId: string, phone: string) => {
      const panel = panels[5];
      if (!panel) return;
      currentStep = 6;
      goToStep(6);
      panel.innerHTML = `<section style="display:grid;gap:1.15rem;padding:clamp(.25rem,1vw,.75rem) 0;text-align:center"><div style="margin:auto;display:grid;place-items:center;width:4.2rem;height:4.2rem;border-radius:1.35rem;background:linear-gradient(135deg,#ef2d1d,#b91c1c);box-shadow:0 .9rem 1.8rem rgba(220,38,38,.25);color:#fff;font-size:1.65rem">✦</div><div><h3 style="margin:0;color:#7f1d1d;font-size:1.35rem">Enter your verification code</h3><p style="margin:.5rem auto 0;max-width:25rem;color:#475569;line-height:1.55">We sent a six-digit code to <strong>${phone.replace(/.(?=.{4})/g, "•")}</strong>. It expires in 5 minutes.</p></div><div id="otpDigits" style="display:flex;justify-content:center;gap:clamp(.28rem,1vw,.55rem);margin:.35rem 0">${Array.from({ length: 6 }, (_, i) => `<input aria-label="Verification code digit ${i + 1}" inputmode="numeric" autocomplete="one-time-code" maxlength="1" style="width:clamp(2.4rem,10vw,3rem);height:3.35rem;border:2px solid #fecaca;border-radius:.85rem;text-align:center;font-size:1.4rem;font-weight:800;outline-color:#dc2626">`).join("")}</div><p id="otpStatus" role="alert" style="min-height:1.3rem;margin:0;color:#b91c1c;font-size:.86rem;font-weight:700"></p><button id="verifyOtpButton" type="button" style="width:100%;border:0;border-radius:.85rem;padding:1rem;background:linear-gradient(135deg,#ef2d1d,#b91c1c);box-shadow:0 .7rem 1.4rem rgba(220,38,38,.22);color:#fff;font-weight:800;cursor:pointer">Verify & Continue</button><button id="resendOtpButton" type="button" disabled style="border:0;background:none;color:#94a3b8;font-weight:750;cursor:not-allowed">Resend code in 01:00</button><button id="editSignupDetails" type="button" style="border:0;background:none;color:#b91c1c;font-weight:700;cursor:pointer">Back and edit details</button></section>`;
      const inputs = Array.from(panel.querySelectorAll<HTMLInputElement>("#otpDigits input"));
      const status = panel.querySelector<HTMLElement>("#otpStatus")!;
      const verifyButton = panel.querySelector<HTMLButtonElement>("#verifyOtpButton")!;
      const resendButton = panel.querySelector<HTMLButtonElement>("#resendOtpButton")!;
      let activeVerificationId = verificationId;
      let secondsRemaining = RESEND_COOLDOWN_SECONDS;
      const updateResendButton = () => {
        const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, "0");
        const seconds = (secondsRemaining % 60).toString().padStart(2, "0");
        resendButton.disabled = secondsRemaining > 0;
        resendButton.textContent = secondsRemaining > 0 ? `Resend code in ${minutes}:${seconds}` : "Resend code";
        resendButton.style.color = secondsRemaining > 0 ? "#94a3b8" : "#b91c1c";
        resendButton.style.cursor = secondsRemaining > 0 ? "not-allowed" : "pointer";
      };
      let resendTimer: number | undefined;
      stopOtpCountdown?.();
      stopOtpCountdown = () => window.clearInterval(resendTimer);
      const startResendCountdown = () => {
        window.clearInterval(resendTimer);
        secondsRemaining = RESEND_COOLDOWN_SECONDS;
        updateResendButton();
        resendTimer = window.setInterval(() => {
          secondsRemaining = Math.max(0, secondsRemaining - 1);
          updateResendButton();
          if (secondsRemaining === 0) {
            window.clearInterval(resendTimer);
            resendTimer = undefined;
          }
        }, 1000);
      };
      startResendCountdown();
      inputs.forEach((input, index) => input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 1); if (input.value) inputs[index + 1]?.focus(); }));
      panel.querySelector<HTMLButtonElement>("#editSignupDetails")!.onclick = () => { window.clearInterval(resendTimer); goToStep(5); };
      const requestOtp = async () => {
        const value = (id: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? "";
        const response = await fetch("/api/auth/register/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: value("firstName"), lastName: value("lastName"), email: value("email"), phone: value("phone"), municipality: value("municipality"), barangay: value("barangay"), address: currentAddress(), username: value("username"), password: passwordField?.value, frontDocumentName: frontFile?.name, backDocumentName: backFile?.name, selfieCaptured: selfieTaken, termsAccepted: true }) });
        const result = await response.json() as { verificationId?: string; error?: string };
        if (!response.ok || !result.verificationId) throw new Error(result.error ?? "Unable to send the verification code.");
        return result.verificationId;
      };
      resendButton.onclick = async () => { status.textContent = "Sending a new code…"; try { activeVerificationId = await requestOtp(); inputs.forEach((input) => { input.value = ""; }); inputs[0]?.focus(); startResendCountdown(); status.textContent = "A new code was sent. You can request another code in 01:00."; } catch (error) { status.textContent = error instanceof Error ? error.message : "Unable to resend the code."; } };
      verifyButton.onclick = async () => {
        const code = inputs.map((input) => input.value).join("");
        if (code.length !== 6) { status.textContent = "Enter all six digits."; return; }
        verifyButton.disabled = true; verifyButton.textContent = "Verifying…"; status.textContent = "";
        const verify = await fetch("/api/auth/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationId: activeVerificationId, code }) });
        const result = await verify.json() as { error?: string };
        if (!verify.ok) { verifyButton.disabled = false; verifyButton.textContent = "Verify & Continue"; status.textContent = result.error ?? "Unable to verify the code."; return; }
        window.clearInterval(resendTimer);
        showAccountConfirmation(activeVerificationId);
      };
      inputs[0]?.focus();
    };

    const handleSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      if (isStartingVerification) return;
      formStatus.textContent = "";
      if (!validateRegistration()) return;
      if (!passwordField || !frontFile) return;

      const value = (id: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? "";
      formStatus.textContent = "Sending your verification code…";
      const submitButton = root.querySelector<HTMLButtonElement>("#submitBtn");
      const submitButtonMarkup = submitButton?.innerHTML;
      isStartingVerification = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending verification code…";
      }
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
            address: currentAddress(),
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
      } finally {
        isStartingVerification = false;
        // OTP temporarily detaches the review controls. Reset the retained
        // button too, so Back/edit can restore a usable submission button.
        if (submitButton) {
          submitButton.disabled = false;
          if (submitButtonMarkup !== undefined) submitButton.innerHTML = submitButtonMarkup;
        }
      }
    };

    const handleGoogleSignup = () => {
      window.location.assign("/api/auth/google/start");
    };

    // Attach listeners
    toStep2?.addEventListener("click", handleToStep2);
    toStep3?.addEventListener("click", handleToStep3);
    toStep4?.addEventListener("click", handleToStep4);
    updateContinueState();
    toStep5?.addEventListener("click", handleToStep5);
    toStep6?.addEventListener("click", handleToStep6);
    backToStep1?.addEventListener("click", handleBackToStep1);
    backToStep2?.addEventListener("click", handleBackToStep2);
    backToStep3?.addEventListener("click", handleBackToStep3);
    backToStep4?.addEventListener("click", handleBackToStep4);
    backToStep5?.addEventListener("click", handleBackToStep5);
    togglePass1?.addEventListener("click", handleToggle1);
    togglePass2?.addEventListener("click", handleToggle2);
    passwordField?.addEventListener("input", handlePasswordInput);
    form?.addEventListener("submit", handleSubmit);
    googleBtn?.addEventListener("click", handleGoogleSignup);
    restoreDraft();

    return () => {
      disposed = true;
      stopOtpCountdown?.();
      faceCheckController.dispose();
      form?.removeEventListener("input", saveDraft);
      form?.removeEventListener("change", saveDraft);
      toStep2?.removeEventListener("click", handleToStep2);
      toStep3?.removeEventListener("click", handleToStep3);
      toStep4?.removeEventListener("click", handleToStep4);
      toStep5?.removeEventListener("click", handleToStep5);
      toStep6?.removeEventListener("click", handleToStep6);
      backToStep1?.removeEventListener("click", handleBackToStep1);
      backToStep2?.removeEventListener("click", handleBackToStep2);
      backToStep3?.removeEventListener("click", handleBackToStep3);
      backToStep4?.removeEventListener("click", handleBackToStep4);
      backToStep5?.removeEventListener("click", handleBackToStep5);
      togglePass1?.removeEventListener("click", handleToggle1);
      togglePass2?.removeEventListener("click", handleToggle2);
      passwordField?.removeEventListener("input", handlePasswordInput);
      form?.removeEventListener("submit", handleSubmit);
      googleBtn?.removeEventListener("click", handleGoogleSignup);
      formStatus.remove();
      fileFrontInput?.removeEventListener("change", handleFrontFileChange);
      firstNameInput?.removeEventListener("input", handleNameChange);
      addressInputs.forEach((field) => {
        field.removeEventListener("input", updateAddressPreview);
        field.removeEventListener("change", updateAddressPreview);
      });
      lastNameInput?.removeEventListener("input", handleNameChange);
      idScanController?.abort();
      fileBackInput?.removeEventListener("change", handleBackFileChange);
      dropzoneFront?.removeEventListener("click", handleDropzoneClick);
      dropzoneBack?.removeEventListener("click", handleDropzoneClick);
      selfieCapture?.removeEventListener("click", handleSelfieClick);
      captureSelfieBtn?.removeEventListener("click", handleCaptureSelfie);
      cancelSelfieBtn?.removeEventListener("click", stopSelfieCamera);
      retakeSelfieBtn?.removeEventListener("click", handleRetakeSelfie);
      useSelfieBtn?.removeEventListener("click", handleUseSelfie);
      selfieCameraRetry?.removeEventListener("click", handleRetakeSelfie);
      selfieCameraPanel?.removeEventListener("keydown", handleCameraKey);
      viewRetakeHandlers.forEach(remove => remove());
      stopSelfieCamera();
      selfieUrls.forEach(url => URL.revokeObjectURL(url));
      selfieUrls.clear();
      selfieViews.clear();
      cleanupDragFront?.();
      cleanupDragBack?.();
      idSideHandlers.forEach(remove => remove());
      captureIdBtn?.removeEventListener("click", handleCaptureId);
      closeIdCameraBtn?.removeEventListener("click", closeIdCamera);
      retakeIdBtn?.removeEventListener("click", handleRetryIdCamera);
      retryIdCameraBtn?.removeEventListener("click", handleRetryIdCamera);
      useIdBtn?.removeEventListener("click", handleUseIdPhoto);
      uploadIdInsteadBtn?.removeEventListener("click", handleUploadIdInstead);
      idCameraPanel?.removeEventListener("keydown", handleIdCameraKey);
      closeIdCamera();
      idThumbUrls.forEach(url => URL.revokeObjectURL(url));
      idThumbUrls.clear();
    };
  }, []);

  return (
    <>
      <style>{residentAuthFontStyles}</style>
      <style>{signupStyles}</style>
      <div
        ref={rootRef}
        className={`signup-page-root ${fontVariableClassName}`}
        dangerouslySetInnerHTML={{ __html: signupMarkup }}
      />
    </>
  );
}

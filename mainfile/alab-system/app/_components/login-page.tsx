"use client";

import { useEffect, useRef } from "react";

import { loginMarkup, loginStyles } from "../_content/login-content";

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

type LoginPageProps = {
  fontVariableClassName: string;
};

export function LoginPage({
  fontVariableClassName,
}: LoginPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const password = root.querySelector<HTMLInputElement>("#password");
    const identifier = root.querySelector<HTMLInputElement>("#username");
    const toggle =
      root.querySelector<HTMLButtonElement>("#togglePasswordBtn");
    const eye = root.querySelector<SVGElement>("#eyeIcon");
    const form = root.querySelector<HTMLFormElement>("#loginForm");
    const forgot =
      root.querySelector<HTMLAnchorElement>(".forgot-password");
    const register =
      root.querySelector<HTMLAnchorElement>(".register-link a");
    const google = root.querySelector<HTMLButtonElement>(".btn-social");

    if (!password || !identifier || !toggle || !eye || !form) return;

    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    const status = root.ownerDocument.createElement("p");
    status.setAttribute("role", "alert");
    status.style.cssText = "min-height: 1.25rem; margin-top: 0.75rem; color: #b91c1c; font-size: 0.8rem; font-weight: 700; text-align: center;";
    form.appendChild(status);

    const popup = root.ownerDocument.createElement("div");
    popup.style.cssText = "display:none; position:fixed; inset:0; z-index:1000; align-items:center; justify-content:center; padding:1.5rem; background:radial-gradient(circle at top, rgba(217,27,16,.32), rgba(15,23,42,.82)); backdrop-filter:blur(7px);";
    const popupCard = root.ownerDocument.createElement("section");
    popupCard.setAttribute("role", "alertdialog");
    popupCard.setAttribute("aria-modal", "true");
    popupCard.style.cssText = "width:min(94vw,34rem); border:1px solid rgba(217,27,16,.22); border-radius:24px; padding:2.4rem 2.2rem 2.1rem; background:linear-gradient(145deg,#fffaf8,#ffffff); box-shadow:0 32px 90px rgba(0,0,0,.42), inset 0 1px 0 #fff; text-align:center; font-family:Georgia, \"Times New Roman\", serif;";
    const popupIcon = root.ownerDocument.createElement("div");
    popupIcon.textContent = "!";
    popupIcon.setAttribute("aria-hidden", "true");
    popupIcon.style.cssText = "display:grid; place-items:center; width:5.5rem; height:5.5rem; margin:0 auto 1.3rem; border-radius:50%; background:linear-gradient(145deg,#ef3d2c,#b8160c); color:#fff; font-family:Georgia, \"Times New Roman\", serif; font-size:3.3rem; font-weight:700; line-height:1; box-shadow:0 .85rem 1.8rem rgba(217,27,16,.32);";
    const popupTitle = root.ownerDocument.createElement("h2");
    popupTitle.textContent = "Login failed";
    popupTitle.style.cssText = "margin:0 0 .75rem; color:#7f1d1d; font-family:Georgia, \"Times New Roman\", serif; font-size:clamp(1.8rem,5vw,2.45rem); font-weight:700; letter-spacing:-.03em;";
    const popupMessage = root.ownerDocument.createElement("p");
    popupMessage.style.cssText = "max-width:26rem; margin:0 auto; color:#475569; font-family:Georgia, \"Times New Roman\", serif; font-size:1.08rem; line-height:1.65;";
    const popupClose = root.ownerDocument.createElement("button");
    popupClose.type = "button";
    popupClose.textContent = "Try again";
    popupClose.style.cssText = "width:min(100%,18rem); margin-top:1.7rem; border:0; border-radius:12px; padding:1rem 1.2rem; background:linear-gradient(135deg,#e8331a,#b8150c); color:#fff; font-family:Georgia, \"Times New Roman\", serif; font-size:1.05rem; font-weight:700; letter-spacing:.02em; cursor:pointer; box-shadow:0 .7rem 1.5rem rgba(217,27,16,.28);";
    popupCard.append(popupIcon, popupTitle, popupMessage, popupClose);
    popup.appendChild(popupCard);
    root.ownerDocument.body.appendChild(popup);

    const showLoginPopup = (message: string) => {
      status.textContent = message;
      popupMessage.textContent = message;
      popup.style.display = "flex";
      popupClose.focus();
    };
    const hideLoginPopup = () => {
      popup.style.display = "none";
      password.focus();
    };

    const handleToggle = () => {
      const isPassword = password.type === "password";
      password.type = isPassword ? "text" : "password";
      eye.innerHTML = isPassword ? visibleEye : hiddenEye;
    };
    const handleSubmit = async (event: SubmitEvent) => {
      event.preventDefault();
      status.textContent = "";
      if (submitButton) submitButton.disabled = true;
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.value, password: password.value }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) {
          if (response.status === 401) showLoginPopup("Incorrect username/email or password.");
          else if (response.status === 429) showLoginPopup(result.error ?? "Too many login attempts. Please wait before trying again.");
          else showLoginPopup("The login service cannot connect to the database yet. Please try again later.");
          return;
        }
        window.location.assign("/resident");
      } catch {
        showLoginPopup("Unable to reach the login service. Please try again.");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    };
    const handleForgot = (event: Event) => {
      event.preventDefault();
      window.alert("Password reset link sent to your email.");
    };
    const handleRegister = (event: Event) => {
      event.preventDefault();
      window.location.assign("/resident/signup");
    };

    toggle.addEventListener("click", handleToggle);
    form.addEventListener("submit", handleSubmit);
    forgot?.addEventListener("click", handleForgot);
    register?.addEventListener("click", handleRegister);
    const handleGoogle = () => {
      if (google) {
        google.disabled = true;
        google.textContent = "Opening Google…";
      }
      window.location.assign("/api/auth/google/start");
    };
    google?.addEventListener("click", handleGoogle);
    popupClose.addEventListener("click", hideLoginPopup);
    popup.addEventListener("click", (event) => {
      if (event.target === popup) hideLoginPopup();
    });

    return () => {
      toggle.removeEventListener("click", handleToggle);
      form.removeEventListener("submit", handleSubmit);
      forgot?.removeEventListener("click", handleForgot);
      register?.removeEventListener("click", handleRegister);
      google?.removeEventListener("click", handleGoogle);
      popupClose.removeEventListener("click", hideLoginPopup);
      status.remove();
      popup.remove();
    };
  }, []);

  return (
    <>
      <style>{loginStyles}</style>
      <div
        ref={rootRef}
        className={`login-page-root ${fontVariableClassName}`}
        dangerouslySetInnerHTML={{ __html: loginMarkup }}
      />
    </>
  );
}

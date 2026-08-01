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
    const toggle =
      root.querySelector<HTMLButtonElement>("#togglePasswordBtn");
    const eye = root.querySelector<SVGElement>("#eyeIcon");
    const form = root.querySelector<HTMLFormElement>("#loginForm");
    const forgot =
      root.querySelector<HTMLAnchorElement>(".forgot-password");
    const register =
      root.querySelector<HTMLAnchorElement>(".register-link a");
    const google = root.querySelector<HTMLButtonElement>(".btn-social");

    if (!password || !toggle || !eye || !form) return;

    const handleToggle = () => {
      const isPassword = password.type === "password";
      password.type = isPassword ? "text" : "password";
      eye.innerHTML = isPassword ? visibleEye : hiddenEye;
    };
    const goHome = () => {
      window.location.assign("/resident");
    };
    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      goHome();
    };
    const handleForgot = (event: Event) => {
      event.preventDefault();
      window.alert("Password reset link sent to your email.");
    };
    const handleRegister = (event: Event) => {
      event.preventDefault();
      window.alert("Registration portal opening soon.");
    };

    toggle.addEventListener("click", handleToggle);
    form.addEventListener("submit", handleSubmit);
    forgot?.addEventListener("click", handleForgot);
    register?.addEventListener("click", handleRegister);
    google?.addEventListener("click", goHome);

    return () => {
      toggle.removeEventListener("click", handleToggle);
      form.removeEventListener("submit", handleSubmit);
      forgot?.removeEventListener("click", handleForgot);
      register?.removeEventListener("click", handleRegister);
      google?.removeEventListener("click", goHome);
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

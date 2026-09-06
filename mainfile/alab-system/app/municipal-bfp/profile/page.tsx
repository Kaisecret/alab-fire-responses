"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MunicipalIdentity = {
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityName: string;
  assignmentRole: string;
  mustChangePassword: boolean;
  photoUrl?: string | null;
};

const COMMON_RANKS = [
  "Municipal Fire Marshal",
  "Senior Fire Officer",
  "Fire Inspector",
  "Station Commander",
  "Fire Officer",
];

const styles = `
  .municipal-settings {
    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    padding: 10px 24px 50px;
    color: #0f172a;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
  }
  .municipal-settings__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.95fr);
    gap: 20px;
    align-items: stretch;
  }
  .municipal-settings__card {
    min-width: 0;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    background: #ffffff;
    box-shadow: 0 6px 24px -4px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03);
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .municipal-settings__card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 10px 32px -4px rgba(15, 23, 42, 0.09);
  }

  /* Profile Command Hero Card */
  .municipal-settings__profile {
    padding: 30px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
    box-sizing: border-box;
  }
  .municipal-settings__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  .municipal-settings__badge-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 6px 12px;
    border-radius: 9999px;
  }
  .municipal-settings__pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: municipal-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
  }
  @keyframes municipal-pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

  .municipal-settings__edit-toggle {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 700;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 7px 14px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .municipal-settings__edit-toggle:hover {
    color: #0f172a;
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  /* Identity & Avatar Studio */
  .municipal-settings__identity {
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .municipal-settings__avatar-container {
    position: relative;
    flex: 0 0 88px;
  }
  .municipal-settings__avatar {
    width: 88px;
    height: 88px;
    border: 1px solid #d7e0ea;
    border-radius: 26px;
    display: grid;
    place-items: center;
    color: #334155;
    background: #f8fafc;
    box-shadow: 0 10px 24px rgba(15,23,42,.08);
    position: relative;
    overflow: hidden;
  }
  .municipal-settings__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .municipal-settings__avatar svg {
    width: 42px;
    height: 42px;
    display: block;
  }
  .municipal-settings__avatar-upload-trigger {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 32px;
    height: 32px;
    border-radius: 11px;
    background: #e23632;
    color: #ffffff;
    border: 2.5px solid #ffffff;
    box-shadow: 0 2px 10px rgba(226, 54, 50, 0.4);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 0.15s ease, background-color 0.15s ease;
  }
  .municipal-settings__avatar-upload-trigger:hover {
    transform: scale(1.1);
    background: #c42724;
  }
  .municipal-settings__avatar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .municipal-settings__btn-sm {
    font-size: 11.5px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 9px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }
  .municipal-settings__btn-reset {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  .municipal-settings__btn-reset:hover {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fca5a5;
  }

  .municipal-settings__identity strong {
    display: block;
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .municipal-settings__role {
    display: inline-block;
    margin-top: 4px;
    color: #e23632;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: .02em;
  }

  /* Form & Inline Edit */
  .municipal-settings__form {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 20px;
    display: grid;
    gap: 14px;
  }
  .municipal-settings__form-group {
    display: grid;
    gap: 5px;
  }
  .municipal-settings__form-label {
    font-size: 11.5px;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .municipal-settings__input {
    width: 100%;
    padding: 11px 14px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .municipal-settings__input:focus {
    outline: none;
    border-color: #e23632;
    box-shadow: 0 0 0 3px rgba(226, 54, 50, 0.14);
  }
  .municipal-settings__rank-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 4px;
  }
  .municipal-settings__chip {
    font-size: 11.5px;
    font-weight: 700;
    padding: 5px 11px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #475569;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .municipal-settings__chip:hover,
  .municipal-settings__chip--active {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fca5a5;
  }
  .municipal-settings__form-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }
  .municipal-settings__btn-primary {
    padding: 10px 20px;
    border-radius: 12px;
    background: #e23632;
    color: #ffffff;
    border: none;
    font-size: 13.5px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    box-shadow: 0 4px 14px rgba(226, 54, 50, 0.28);
    transition: background-color 0.15s ease, transform 0.1s ease;
  }
  .municipal-settings__btn-primary:hover {
    background: #c42724;
    transform: translateY(-1px);
  }
  .municipal-settings__btn-secondary {
    padding: 10px 18px;
    border-radius: 12px;
    background: #ffffff;
    color: #475569;
    border: 1px solid #cbd5e1;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .municipal-settings__btn-secondary:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  /* Fields Bento */
  .municipal-settings__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: auto;
  }
  .municipal-settings__field {
    min-height: 94px;
    padding: 18px 20px;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.18s ease;
  }
  .municipal-settings__field:hover {
    border-color: #cbd5e1;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  }
  .municipal-settings__field-icon-box {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: 18px;
  }
  .municipal-settings__field-icon-box--red { background: #fee2e2; color: #dc2626; }
  .municipal-settings__field-icon-box--blue { background: #dbeafe; color: #2563eb; }
  .municipal-settings__field-icon-box--purple { background: #ede9fe; color: #7c3aed; }
  .municipal-settings__field-icon-box--green { background: #dcfce7; color: #16a34a; }
  .municipal-settings__field-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .municipal-settings__field small {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .municipal-settings__field strong {
    overflow-wrap: anywhere;
    font-size: 14.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .municipal-settings__field-action {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 700;
    color: #e23632;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .municipal-settings__field-action:hover {
    text-decoration: underline;
  }

  /* Right Side Panels */
  .municipal-settings__side {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
  }
  .municipal-settings__security-card {
    padding: 24px;
    display: grid;
    gap: 16px;
  }
  .municipal-settings__security-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .municipal-settings__security-header i {
    color: #e23632;
    font-size: 18px;
  }
  .municipal-settings__security-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .municipal-settings__security-status span {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .municipal-settings__btn-update-pwd {
    width: 100%;
    min-height: 48px;
    padding: 12px;
    border-radius: 14px;
    background: #0f172a;
    color: #ffffff;
    border: none;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .02em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .municipal-settings__btn-update-pwd:hover {
    background: #1e293b;
    transform: translateY(-1px);
  }

  /* Notification Card */
  .municipal-settings__notifications {
    padding: 24px;
    display: grid;
    gap: 14px;
    flex: 1;
  }
  .municipal-settings__section-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .municipal-settings__section-title i {
    color: #e23632;
    font-size: 18px;
  }
  .municipal-settings__status {
    min-height: 68px;
    padding: 14px 16px;
    border: 1px solid #bbf7d0;
    border-radius: 16px;
    background: #f0fdf4;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .municipal-settings__status-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #047857;
    background: #dcfce7;
    font-size: 18px;
    flex-shrink: 0;
  }
  .municipal-settings__status strong {
    color: #065f46;
    font-size: 13.5px;
    display: block;
  }
  .municipal-settings__status small {
    margin-top: 2px;
    color: #166534;
    font-size: 11.5px;
    display: block;
  }
  .municipal-settings__coverage {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .municipal-settings__coverage span {
    min-height: 48px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    background: #f8fafc;
    transition: all 0.15s ease;
  }
  .municipal-settings__coverage span:hover {
    border-color: #cbd5e1;
    color: #0f172a;
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  }
  .municipal-settings__coverage-inner {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .municipal-settings__coverage-inner i {
    color: #e23632;
    font-size: 13px;
  }
  .municipal-settings__coverage-arrow {
    color: #94a3b8;
    font-size: 11px;
  }
  .municipal-settings__link {
    min-height: 48px;
    margin-top: 4px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #ffffff;
    background: #e23632;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.25);
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .municipal-settings__link:hover {
    background: #c42724;
    transform: translateY(-1px);
  }

  /* Password Modal Overlay */
  .municipal-settings__modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 1000;
    padding: 16px;
  }
  .municipal-settings__modal {
    width: 100%;
    max-width: 450px;
    background: #ffffff;
    border-radius: 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.28);
    padding: 26px;
    display: grid;
    gap: 18px;
    position: relative;
    animation: municipal-modal-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes municipal-modal-pop {
    0% { opacity: 0; transform: scale(0.96); }
    100% { opacity: 1; transform: scale(1); }
  }
  .municipal-settings__modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .municipal-settings__modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .municipal-settings__modal-close {
    background: #f1f5f9;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .municipal-settings__modal-close:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
  .municipal-settings__pwd-wrapper {
    position: relative;
  }
  .municipal-settings__pwd-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
  }
  .municipal-settings__pwd-toggle:hover {
    color: #475569;
  }

  /* Toast Notification */
  .municipal-settings__toast {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 1100;
    padding: 14px 20px;
    border-radius: 14px;
    font-size: 13.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.2);
    animation: municipal-toast-slide 0.25s ease;
  }
  .municipal-settings__toast--success {
    background: #0f172a;
    color: #ffffff;
    border-left: 4px solid #10b981;
  }
  .municipal-settings__toast--error {
    background: #0f172a;
    color: #ffffff;
    border-left: 4px solid #ef4444;
  }
  @keyframes municipal-toast-slide {
    0% { opacity: 0; transform: translateY(-8px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .municipal-settings__state {
    min-height: 360px;
    display: grid;
    place-items: center;
    color: #64748b;
    font-weight: 600;
  }

  @media (max-width: 900px) {
    .municipal-settings { padding: 12px 14px 40px; }
    .municipal-settings__grid { grid-template-columns: 1fr; }
    .municipal-settings__fields { grid-template-columns: 1fr; }
  }
`;

export default function ProfilePage() {
  const [identity, setIdentity] = useState<MunicipalIdentity | null>(null);
  const [error, setError] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRank, setEditRank] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isResettingPhoto, setIsResettingPhoto] = useState(false);

  // Password state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNextPass, setShowNextPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/municipal-bfp/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("PROFILE_FETCH_FAILED");
        return response.json() as Promise<{ user: MunicipalIdentity }>;
      })
      .then((payload) => {
        if (active) {
          setIdentity(payload.user);
          setEditDisplayName(payload.user.displayName);
          setEditRank(payload.user.rankOrPosition || "");
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Save profile changes (Display Name & Rank)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDisplayName.trim() || editDisplayName.trim().length < 2) {
      showToast("Officer name must be at least 2 characters.", "error");
      return;
    }
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/municipal-bfp/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          rankOrPosition: editRank.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      setIdentity(data.user);
      setIsEditing(false);
      showToast("Profile details updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save profile.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload custom photo
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Please choose a JPG, PNG, or WebP photo.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Photo must be smaller than 5 MB.", "error");
      return;
    }

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch("/api/municipal-bfp/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Photo upload failed");

      setIdentity((prev) => (prev ? { ...prev, photoUrl: data.photoUrl } : null));
      showToast("Profile photo updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to upload photo.", "error");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reset to default insignia avatar
  const handleResetToDefaultAvatar = async () => {
    if (!confirm("Reset your profile photo back to the default civic BFP insignia?")) return;
    setIsResettingPhoto(true);
    try {
      const response = await fetch("/api/municipal-bfp/profile/photo", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset avatar");

      setIdentity((prev) => (prev ? { ...prev, photoUrl: null } : null));
      showToast("Profile avatar reset to default insignia.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to reset avatar.", "error");
    } finally {
      setIsResettingPhoto(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("Please enter your current password.", "error");
      return;
    }
    if (nextPassword.length < 12) {
      showToast("New password must be at least 12 characters.", "error");
      return;
    }
    if (nextPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/auth/bfp/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          nextPassword,
          portal: "MUNICIPAL",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Password change failed");

      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to change password.", "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {toast && (
        <div className={`municipal-settings__toast municipal-settings__toast--${toast.type}`} role="status">
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check text-emerald-400" : "fa-triangle-exclamation text-rose-400"}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hidden Photo File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handlePhotoUpload}
      />

      <section className="municipal-settings">
        {!identity && !error && (
          <div className="municipal-settings__card municipal-settings__state">
            <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: "12px", color: "#e23632" }} />
            Loading secure account details…
          </div>
        )}

        {error && (
          <div className="municipal-settings__card municipal-settings__state">
            <i className="fa-solid fa-triangle-exclamation fa-2x" style={{ marginBottom: "12px", color: "#ef4444" }} />
            Account details are temporarily unavailable.
          </div>
        )}

        {identity && (
          <div className="municipal-settings__grid">
            {/* Officer Profile Command Card */}
            <article className="municipal-settings__card municipal-settings__profile">
              <div className="municipal-settings__card-header">
                <span className="municipal-settings__badge-status">
                  <span className="municipal-settings__pulse-dot" />
                  Verified Station Officer
                </span>
                {!isEditing && (
                  <button
                    type="button"
                    className="municipal-settings__edit-toggle"
                    onClick={() => {
                      setEditDisplayName(identity.displayName);
                      setEditRank(identity.rankOrPosition || "");
                      setIsEditing(true);
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square" /> Edit profile
                  </button>
                )}
              </div>

              {/* Identity & Avatar Studio */}
              <div className="municipal-settings__identity">
                <div className="municipal-settings__avatar-container">
                  <span
                    className="municipal-settings__avatar"
                    data-municipal-profile-avatar
                    aria-hidden="true"
                    title={identity.photoUrl ? "Custom officer photo" : "Default civic insignia"}
                  >
                    {identity.photoUrl ? (
                      <img src={identity.photoUrl} alt={identity.displayName} />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="3.75" stroke="currentColor" strokeWidth="1.8" />
                        <path
                          d="M4.75 20c.7-4.1 3.12-6.15 7.25-6.15S18.55 15.9 19.25 20"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                  <button
                    type="button"
                    className="municipal-settings__avatar-upload-trigger"
                    title="Upload profile photo"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs" />
                    ) : (
                      <i className="fa-solid fa-camera text-xs" />
                    )}
                  </button>
                </div>

                <div>
                  <strong>{identity.displayName}</strong>
                  <span className="municipal-settings__role">
                    {identity.rankOrPosition ?? "Municipal Fire Marshal"}
                  </span>
                  <div className="municipal-settings__avatar-actions">
                    <button
                      type="button"
                      className="municipal-settings__btn-sm municipal-settings__btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                    >
                      <i className="fa-solid fa-upload" /> Change photo
                    </button>
                    {identity.photoUrl && (
                      <button
                        type="button"
                        className="municipal-settings__btn-sm municipal-settings__btn-reset"
                        onClick={handleResetToDefaultAvatar}
                        disabled={isResettingPhoto}
                      >
                        {isResettingPhoto ? (
                          <i className="fa-solid fa-spinner fa-spin" />
                        ) : (
                          <i className="fa-solid fa-rotate-left" />
                        )}
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline Profile Edit Form */}
              {isEditing && (
                <form className="municipal-settings__form" onSubmit={handleSaveProfile}>
                  <div className="municipal-settings__form-group">
                    <label className="municipal-settings__form-label">Officer Name</label>
                    <input
                      type="text"
                      className="municipal-settings__input"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="e.g. Inspector Juan Dela Cruz"
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="municipal-settings__form-group">
                    <label className="municipal-settings__form-label">Rank / Position</label>
                    <input
                      type="text"
                      className="municipal-settings__input"
                      value={editRank}
                      onChange={(e) => setEditRank(e.target.value)}
                      placeholder="e.g. Municipal Fire Marshal"
                    />
                    <div className="municipal-settings__rank-chips">
                      {COMMON_RANKS.map((rank) => (
                        <button
                          key={rank}
                          type="button"
                          className={`municipal-settings__chip ${editRank === rank ? "municipal-settings__chip--active" : ""}`}
                          onClick={() => setEditRank(rank)}
                        >
                          {rank}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="municipal-settings__form-actions">
                    <button
                      type="submit"
                      className="municipal-settings__btn-primary"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check" /> Save profile
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="municipal-settings__btn-secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingProfile}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Affiliation Fields Bento with Rich Icon Badges */}
              <div className="municipal-settings__fields">
                <div className="municipal-settings__field">
                  <div className="municipal-settings__field-icon-box municipal-settings__field-icon-box--red">
                    <i className="fa-solid fa-envelope" />
                  </div>
                  <div className="municipal-settings__field-content">
                    <small>Email</small>
                    <strong>{identity.email}</strong>
                  </div>
                </div>

                <div className="municipal-settings__field">
                  <div className="municipal-settings__field-icon-box municipal-settings__field-icon-box--blue">
                    <i className="fa-solid fa-building-shield" />
                  </div>
                  <div className="municipal-settings__field-content">
                    <small>Station</small>
                    <strong>{identity.municipalityName} Fire Station</strong>
                  </div>
                </div>

                <div className="municipal-settings__field">
                  <div className="municipal-settings__field-icon-box municipal-settings__field-icon-box--purple">
                    <i className="fa-solid fa-id-badge" />
                  </div>
                  <div className="municipal-settings__field-content">
                    <small>Assignment</small>
                    <strong>{identity.assignmentRole.replaceAll("_", " ")}</strong>
                  </div>
                </div>

                <div className="municipal-settings__field">
                  <div className="municipal-settings__field-icon-box municipal-settings__field-icon-box--green">
                    <i className="fa-solid fa-lock" />
                  </div>
                  <div className="municipal-settings__field-content">
                    <small>Account security</small>
                    <strong>
                      {identity.mustChangePassword ? "Password change required" : "Password active"}
                    </strong>
                    <button
                      type="button"
                      className="municipal-settings__field-action"
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      Change password <i className="fa-solid fa-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* Side Column: Security & Notifications */}
            <div className="municipal-settings__side">
              {/* Account Security Quick Card */}
              <article className="municipal-settings__card municipal-settings__security-card">
                <div className="municipal-settings__security-header">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Account Security</span>
                </div>
                <div className="municipal-settings__security-status">
                  <span>
                    <i className="fa-solid fa-circle-check text-emerald-600" />
                    Encrypted &amp; Active
                  </span>
                  <small style={{ color: "#64748b", fontSize: "11.5px", fontWeight: 700 }}>
                    SHA-256 + scrypt
                  </small>
                </div>
                <button
                  type="button"
                  className="municipal-settings__btn-update-pwd"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <i className="fa-solid fa-key" /> Update password
                </button>
              </article>

              {/* Live Notifications Service */}
              <article className="municipal-settings__card municipal-settings__notifications">
                <h2 className="municipal-settings__section-title">
                  <i className="fa-solid fa-bell" /> Notification service
                </h2>
                <div className="municipal-settings__status">
                  <span className="municipal-settings__status-icon">
                    <i className="fa-solid fa-circle-check" />
                  </span>
                  <span>
                    <strong>In-app notifications active</strong>
                    <small>Updates every 5 seconds while this tab is open.</small>
                  </span>
                </div>
                <div className="municipal-settings__coverage">
                  <span>
                    <span className="municipal-settings__coverage-inner">
                      <i className="fa-solid fa-fire" /> New incidents
                    </span>
                    <i className="fa-solid fa-chevron-right municipal-settings__coverage-arrow" />
                  </span>
                  <span>
                    <span className="municipal-settings__coverage-inner">
                      <i className="fa-solid fa-id-card" /> Resident applications
                    </span>
                    <i className="fa-solid fa-chevron-right municipal-settings__coverage-arrow" />
                  </span>
                  <span>
                    <span className="municipal-settings__coverage-inner">
                      <i className="fa-solid fa-truck-medical" /> Response updates
                    </span>
                    <i className="fa-solid fa-chevron-right municipal-settings__coverage-arrow" />
                  </span>
                  <span>
                    <span className="municipal-settings__coverage-inner">
                      <i className="fa-solid fa-user-shield" /> Account notices
                    </span>
                    <i className="fa-solid fa-chevron-right municipal-settings__coverage-arrow" />
                  </span>
                </div>
                <Link className="municipal-settings__link" href="/municipal-bfp/notifications">
                  <i className="fa-solid fa-table-cells" /> Open notification center <i className="fa-solid fa-arrow-right" />
                </Link>
              </article>
            </div>
          </div>
        )}
      </section>

      {/* Password Change Dialog Modal */}
      {isPasswordModalOpen && (
        <div
          className="municipal-settings__modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPasswordModalOpen(false);
          }}
        >
          <div className="municipal-settings__modal" role="dialog" aria-modal="true">
            <div className="municipal-settings__modal-head">
              <h3 className="municipal-settings__modal-title">
                <i className="fa-solid fa-key text-red-600" /> Update Password
              </h3>
              <button
                type="button"
                className="municipal-settings__modal-close"
                onClick={() => setIsPasswordModalOpen(false)}
                title="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ display: "grid", gap: "16px" }}>
              <div className="municipal-settings__form-group">
                <label className="municipal-settings__form-label">Current Password</label>
                <div className="municipal-settings__pwd-wrapper">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    className="municipal-settings__input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="municipal-settings__pwd-toggle"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    title={showCurrentPass ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showCurrentPass ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </div>

              <div className="municipal-settings__form-group">
                <label className="municipal-settings__form-label">New Password (min 12 characters)</label>
                <div className="municipal-settings__pwd-wrapper">
                  <input
                    type={showNextPass ? "text" : "password"}
                    className="municipal-settings__input"
                    value={nextPassword}
                    onChange={(e) => setNextPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    required
                    minLength={12}
                  />
                  <button
                    type="button"
                    className="municipal-settings__pwd-toggle"
                    onClick={() => setShowNextPass(!showNextPass)}
                    title={showNextPass ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showNextPass ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </div>

              <div className="municipal-settings__form-group">
                <label className="municipal-settings__form-label">Confirm New Password</label>
                <input
                  type={showNextPass ? "text" : "password"}
                  className="municipal-settings__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={12}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  className="municipal-settings__btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" /> Updating…
                    </>
                  ) : (
                    "Save password"
                  )}
                </button>
                <button
                  type="button"
                  className="municipal-settings__btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { profileStyles, profileMarkup } from "../../_content/resident-profile-content";

export default function ProfilePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<style>" + profileStyles + "</style>" + profileMarkup }} />
  );
}

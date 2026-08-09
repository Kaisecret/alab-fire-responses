"use client";

import { profileStyles, profileMarkup } from "../../_content/resident-profile-content";

export default function ProfilePage() {
  return (
    <>
      <style>{profileStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: profileMarkup }} />
    </>
  );
}

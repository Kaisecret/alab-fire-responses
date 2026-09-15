export const RESIDENT_ID_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateResidentIdFile(file: Pick<File, "type" | "size">): string {
  if (!RESIDENT_ID_ACCEPT.split(",").includes(file.type)) return "Choose a JPG, PNG or WebP photo.";
  if (!file.size) return "Choose a photo that is not empty.";
  if (file.size > 6 * 1024 * 1024) return "Choose a photo that is 6 MB or smaller.";
  return "";
}

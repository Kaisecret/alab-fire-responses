import { isIP } from "node:net";

export type FireReportSubmissionAudit = {
  ipAddress: string | null;
  deviceSummary: string | null;
};

function firstValidIp(value: string | null) {
  const candidate = value?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

function deviceSummary(userAgent: string | null) {
  if (!userAgent) return null;

  const browser = /EdgA?\//i.test(userAgent)
    ? "Microsoft Edge"
    : /OPR\//i.test(userAgent)
      ? "Opera"
      : /CriOS\//i.test(userAgent)
        ? "Chrome"
        : /Chrome\//i.test(userAgent)
          ? "Chrome"
          : /Firefox\//i.test(userAgent)
            ? "Firefox"
            : /Safari\//i.test(userAgent)
              ? "Safari"
              : "Browser";
  const platform = /Android/i.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "iOS"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Unknown device";

  return `${browser} on ${platform}`.slice(0, 160);
}

/** Uses headers set by the trusted server platform; no client-provided form field is accepted. */
export function submissionAuditFromHeaders(headers: Headers): FireReportSubmissionAudit {
  const ipAddress = firstValidIp(headers.get("x-vercel-forwarded-for"))
    ?? firstValidIp(headers.get("x-forwarded-for"))
    ?? firstValidIp(headers.get("x-real-ip"));

  return { ipAddress, deviceSummary: deviceSummary(headers.get("user-agent")) };
}

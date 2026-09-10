import nodemailer from "nodemailer";

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ""));
}

export async function sendGmailEmail(input: { to: string; subject: string; html: string; text: string }) {
  const user = process.env.GMAIL_USER?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !password) throw new Error("GMAIL_NOT_CONFIGURED");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user, pass: password },
    dnsTimeout: 5_000, connectionTimeout: 5_000, greetingTimeout: 5_000, socketTimeout: 10_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: { name: "ALAB", address: user }, to: input.to,
      subject: input.subject, html: input.html, text: input.text,
    });
    if (!result.accepted?.length) throw new Error("GMAIL_DELIVERY_UNCONFIRMED");
    return { providerId: result.messageId || null };
  } catch (error) {
    const code = (error as { responseCode?: number } | null)?.responseCode;
    // Explicit SMTP rejection is safe to retry. A dropped connection may
    // follow acceptance, so preserve the existing unconfirmed-delivery guard.
    if (typeof code === "number" && code >= 400 && code < 600) throw new Error("GMAIL_DELIVERY_FAILED");
    throw new Error("GMAIL_DELIVERY_UNCONFIRMED");
  } finally {
    try { transport.close(); } catch { /* closing cannot change send acceptance */ }
  }
}

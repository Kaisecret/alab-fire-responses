export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_NOT_CONFIGURED");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (response.status >= 500 || response.status === 408 || (response.ok && !result?.id)) {
    throw new Error("RESEND_DELIVERY_UNCONFIRMED");
  }
  if (!response.ok || !result?.id) {
    const detail = typeof result?.message === "string" ? result.message.replace(/\s+/g, " ").slice(0, 300) : "unknown provider error";
    throw new Error(`RESEND_DELIVERY_FAILED: ${detail}`);
  }
  return { providerId: result.id };
}

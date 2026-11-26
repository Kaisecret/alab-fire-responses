import { normalizePhilippinePhone } from "../auth/registration-otp.ts";

export async function sendIprogSmsMessage({ phone, message }: { phone: string; message: string }) {
  const token = process.env.IPROGSMS_API_TOKEN;
  if (!token) throw new Error("IPROGSMS_NOT_CONFIGURED");

  const response = await fetch("https://www.iprogsms.com/api/v1/sms_messages", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ api_token: token, phone_number: normalizePhilippinePhone(phone), message }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null) as {
    status?: number;
    message?: string;
    message_id?: string | number;
  } | null;
  if (response.status >= 500 || response.status === 408 || typeof result?.status !== "number") {
    throw new Error("IPROGSMS_DELIVERY_UNCONFIRMED");
  }
  if (!response.ok || result.status !== 200) {
    const detail = typeof result.message === "string" ? result.message.slice(0, 300) : "unknown provider error";
    throw new Error(`IPROGSMS_DELIVERY_FAILED: ${detail}`);
  }
  return { providerId: result.message_id ? String(result.message_id) : null };
}

export async function sendIprogSmsOtp({ phone, code }: { phone: string; code: string }) {
  return sendIprogSmsMessage({
    phone,
    message: `Your ALAB verification code is ${code}. It expires in 5 minutes.`,
  });
}

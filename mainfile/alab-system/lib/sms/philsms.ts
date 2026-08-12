type PhilSmsOtp = { phone: string; code: string };

export async function sendPhilSmsOtp({ phone, code }: PhilSmsOtp) {
  const token = process.env.PHILSMS_API_TOKEN;
  const senderId = process.env.PHILSMS_SENDER_ID;
  if (!token || !senderId) throw new Error("PHILSMS_NOT_CONFIGURED");

  const response = await fetch("https://dashboard.philsms.com/api/v3/sms/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: phone, sender_id: senderId, type: "plain", message: `Your ALAB verification code is ${code}. It expires in 5 minutes.` }),
  });
  const result = await response.json().catch(() => null) as { status?: string; message?: string } | null;
  if (!response.ok || result?.status !== "success") {
    const detail = typeof result?.message === "string" ? result.message.slice(0, 300) : "unknown provider error";
    throw new Error(`PHILSMS_DELIVERY_FAILED: ${detail}`);
  }
}

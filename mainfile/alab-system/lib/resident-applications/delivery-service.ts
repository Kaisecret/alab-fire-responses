import "server-only";
import { sendResendEmail } from "../email/resend";
import { sendPhilSmsMessage } from "../sms/philsms";
import { createCorrectionMessages } from "./correction-messages";
import { claimResidentCorrectionDeliveries, completeResidentCorrectionDelivery, type DirectCorrectionDelivery, type DeliveryJob } from "./delivery-queue";
import { processCorrectionDeliveries, processDeliveryJob } from "./delivery-engine";
export type { ChannelDeliveryResult } from "./delivery-engine";

function applicationUrl() {
  try { return new URL("/resident/application", process.env.NEXT_PUBLIC_APP_URL || "https://alab-fire-responses-bynr.vercel.app").toString(); }
  catch { return "https://alab-fire-responses-bynr.vercel.app/resident/application"; }
}
function dependencies() {
  return {
    claim: (ids: string[]) => claimResidentCorrectionDeliveries(ids),
    record: completeResidentCorrectionDelivery,
    retryScheduled: Boolean(process.env.CRON_SECRET),
    send: async (job: DeliveryJob) => {
      const messages = createCorrectionMessages({ ...job.payload, applicationUrl: applicationUrl() });
      return job.channel === "SMS"
        ? sendPhilSmsMessage({ phone: job.destination, message: messages.sms })
        : sendResendEmail({ to: job.destination, subject: messages.emailSubject, html: messages.emailHtml,
            text: messages.emailText, idempotencyKey: `resident-correction-delivery:${job.id}` });
    },
  };
}
export async function deliverResidentCorrectionNotifications(ids: string[], directDelivery: DirectCorrectionDelivery | null) {
  return processCorrectionDeliveries(ids, directDelivery, dependencies());
}
export async function retryResidentCorrectionNotifications() {
  const channels: ("SMS" | "EMAIL")[] = [];
  if (process.env.PHILSMS_API_TOKEN && process.env.PHILSMS_SENDER_ID) channels.push("SMS");
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) channels.push("EMAIL");
  if (!channels.length) return { processed: 0, message: "No delivery providers are configured." };
  const jobs = await claimResidentCorrectionDeliveries(null, channels);
  const results = await Promise.allSettled(jobs.map(job => processDeliveryJob(job, dependencies())));
  return { processed: results.length, sent: results.filter(item => item.status === "fulfilled" && item.value.status === "SENT").length };
}

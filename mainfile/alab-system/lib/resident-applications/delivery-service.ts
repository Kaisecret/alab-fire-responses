import "server-only";

import { sendResendEmail } from "../email/resend";
import { sendPhilSmsMessage } from "../sms/philsms";
import { createCorrectionMessages } from "./correction-messages";
import {
  claimResidentCorrectionDeliveries,
  completeResidentCorrectionDelivery,
  type DirectCorrectionDelivery,
  type DeliveryJob,
} from "./delivery-queue";

export type ChannelDeliveryResult = {
  channel: "SMS" | "EMAIL";
  status: "SENT" | "FAILED" | "NOT_CONFIGURED";
};

function applicationUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  try {
    return new URL("/resident/application", configured || "https://alab-fire-responses-bynr.vercel.app").toString();
  } catch {
    return "https://alab-fire-responses-bynr.vercel.app/resident/application";
  }
}

function safeFailureStatus(error: unknown): ChannelDeliveryResult["status"] {
  const message = error instanceof Error ? error.message : "DELIVERY_FAILED";
  return message === "PHILSMS_NOT_CONFIGURED" || message === "RESEND_NOT_CONFIGURED"
    ? "NOT_CONFIGURED"
    : "FAILED";
}

async function deliverJob(job: DeliveryJob, persistResult = true): Promise<ChannelDeliveryResult> {
  const messages = createCorrectionMessages({ ...job.payload, applicationUrl: applicationUrl() });
  try {
    const result = job.channel === "SMS"
      ? await sendPhilSmsMessage({ phone: job.destination, message: messages.sms })
      : await sendResendEmail({
          to: job.destination,
          subject: messages.emailSubject,
          html: messages.emailHtml,
          text: messages.emailText,
          idempotencyKey: `resident-correction-delivery:${job.id}`,
        });
    if (persistResult) {
      await completeResidentCorrectionDelivery(job.id, { status: "SENT", providerMessageId: result.providerId });
    }
    return { channel: job.channel, status: "SENT" };
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "DELIVERY_FAILED";
    if (persistResult) {
      await completeResidentCorrectionDelivery(job.id, { status: "FAILED", error: safeError });
    }
    return { channel: job.channel, status: safeFailureStatus(error) };
  }
}

export async function deliverResidentCorrectionNotifications(ids: string[], directDelivery: DirectCorrectionDelivery | null) {
  const queuedJobs = await claimResidentCorrectionDeliveries(ids);
  const directJobs = (directDelivery ? [
    {
      id: `${directDelivery.verificationId}:${directDelivery.submissionNumber}:sms`,
      channel: "SMS",
      destination: directDelivery.phone,
      payload: directDelivery.payload,
      attemptCount: 1,
    },
    {
      id: `${directDelivery.verificationId}:${directDelivery.submissionNumber}:email`,
      channel: "EMAIL",
      destination: directDelivery.email,
      payload: directDelivery.payload,
      attemptCount: 1,
    },
  ] satisfies DeliveryJob[] : []).filter((job) => job.destination.trim());
  const jobs = [...queuedJobs, ...directJobs];
  const deliveries = await Promise.allSettled(jobs.map((job, index) => deliverJob(job, index < queuedJobs.length)));
  return deliveries.flatMap((delivery, index) => {
    if (delivery.status === "fulfilled") return [delivery.value];
    return [{ channel: jobs[index].channel, status: "FAILED" } satisfies ChannelDeliveryResult];
  });
}

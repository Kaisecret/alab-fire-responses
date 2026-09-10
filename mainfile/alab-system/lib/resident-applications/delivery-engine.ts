import type { DeliveryJob, DirectCorrectionDelivery } from "./delivery-queue";

export type ChannelDeliveryResult = {
  channel: "SMS" | "EMAIL";
  status: "SENT" | "FAILED" | "NOT_CONFIGURED" | "QUEUED" | "UNCONFIRMED";
  tracking?: "UNAVAILABLE";
};
export type DeliveryRecord =
  | { status: "SENT"; providerMessageId: string | null }
  | { status: "FAILED" | "PROCESSING"; error: string };
type Dependencies = {
  send: (job: DeliveryJob) => Promise<{ providerId: string | null }>;
  record: (id: string, result: DeliveryRecord) => Promise<unknown>;
  claim: (ids: string[]) => Promise<DeliveryJob[]>;
  retryScheduled: boolean;
};
export function unconfirmedDeliveries(): ChannelDeliveryResult[] {
  return [{ channel: "SMS", status: "UNCONFIRMED" }, { channel: "EMAIL", status: "UNCONFIRMED" }];
}
export async function processDeliveryJob(job: DeliveryJob, deps: Dependencies, persist = true): Promise<ChannelDeliveryResult> {
  let accepted: { providerId: string | null };
  try { accepted = await deps.send(job); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missing = /^(PHILSMS|RESEND|GMAIL)_NOT_CONFIGURED$/.test(message);
    const rejected = /^(PHILSMS|RESEND|GMAIL)_DELIVERY_FAILED(?::|$)/.test(message);
    // A timeout may follow provider acceptance. Hold that job for review.
    const record: DeliveryRecord = {
      status: missing || rejected ? "FAILED" : "PROCESSING",
      error: missing || rejected ? message.split(":")[0] : "PROVIDER_RESULT_UNCONFIRMED",
    };
    let recorded = false;
    if (persist) {
      try { await deps.record(job.id, record); recorded = true; } catch { /* tracking is independent */ }
    }
    const status = missing ? "NOT_CONFIGURED" : !rejected ? "UNCONFIRMED"
      : recorded && deps.retryScheduled && job.attemptCount < (job.maxAttempts ?? 3) ? "QUEUED" : "FAILED";
    return { channel: job.channel, status, ...(persist && !recorded ? { tracking: "UNAVAILABLE" as const } : {}) };
  }
  // Recording acceptance must never enter the provider-failure branch.
  if (persist) {
    try { await deps.record(job.id, { status: "SENT", providerMessageId: accepted.providerId }); }
    catch { return { channel: job.channel, status: "SENT", tracking: "UNAVAILABLE" }; }
  }
  return { channel: job.channel, status: "SENT" };
}
export async function processCorrectionDeliveries(ids: string[], direct: DirectCorrectionDelivery | null, deps: Dependencies): Promise<ChannelDeliveryResult[]> {
  let queued: DeliveryJob[];
  try { queued = await deps.claim(ids); } catch { return unconfirmedDeliveries(); }
  const directJobs: DeliveryJob[] = direct ? [
    { id: `${direct.verificationId}:${direct.submissionNumber}:sms`, channel: "SMS", destination: direct.phone, payload: direct.payload, attemptCount: 1 },
    { id: `${direct.verificationId}:${direct.submissionNumber}:email`, channel: "EMAIL", destination: direct.email, payload: direct.payload, attemptCount: 1 },
  ].filter(job => job.destination?.trim()) as DeliveryJob[] : [];
  const jobs = [...queued, ...directJobs];
  const outcomes = await Promise.allSettled(jobs.map((job, index) => processDeliveryJob(job, deps, index < queued.length)));
  return outcomes.map((outcome, index) => outcome.status === "fulfilled" ? outcome.value
    : { channel: jobs[index].channel, status: "UNCONFIRMED" });
}

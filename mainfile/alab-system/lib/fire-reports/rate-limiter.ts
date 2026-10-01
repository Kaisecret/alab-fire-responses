import type { PoolClient } from "pg";

/** One fire report per resident account, then a 5-minute cooldown. */
export const SOS_RATE_LIMIT_MAX_REPORTS = 1;
/**
 * A network address may send a little more, because neighbours sharing one
 * Wi-Fi or mobile carrier address can each report a fire.
 */
export const SOS_RATE_LIMIT_MAX_REPORTS_PER_IP = 2;
export const SOS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
export const SOS_RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes in seconds

export const SOS_RATE_LIMIT_ERROR_EN =
  "You can send 1 fire report every 5 minutes. Please wait before submitting again.";

// In-memory sliding window cache for fast checks and test/mock environments
// Maps userId (or `ip:<address>`) -> timestamps of SUCCESSFUL submissions
const memorySuccessfulSosReports = new Map<string, number[]>();

function memoryTimestamps(key: string, now: number): number[] {
  const windowStart = now - SOS_RATE_LIMIT_WINDOW_MS;
  const timestamps = memorySuccessfulSosReports.get(key) || [];
  const valid = timestamps.filter((t) => t > windowStart).sort((a, b) => a - b);
  if (valid.length !== timestamps.length) {
    if (valid.length > 0) {
      memorySuccessfulSosReports.set(key, valid);
    } else {
      memorySuccessfulSosReports.delete(key);
    }
  }
  return valid;
}

export function getMemorySosReportCount(key: string, now = Date.now()): number {
  return memoryTimestamps(key, now).length;
}

export function recordSuccessfulSosReportMemory(key: string, timestamp = Date.now()): void {
  const windowStart = timestamp - SOS_RATE_LIMIT_WINDOW_MS;
  const existing = (memorySuccessfulSosReports.get(key) || []).filter((t) => t > windowStart);
  existing.push(timestamp);
  memorySuccessfulSosReports.set(key, existing);
}

export function clearMemorySosReports(key?: string): void {
  if (key) {
    memorySuccessfulSosReports.delete(key);
  } else {
    memorySuccessfulSosReports.clear();
  }
}

export interface SosRateLimitCheckResult {
  allowed: boolean;
  count: number;
  maxReports: number;
  retryAfterSeconds: number;
  message: string;
}

/**
 * Seconds until the window holds fewer than `max` reports again, or 0 when it
 * already does. `timestamps` are the reports inside the window, oldest first.
 */
function secondsUntilFree(timestamps: number[], max: number, now: number) {
  if (timestamps.length < max) return 0;
  const freesAt = timestamps[timestamps.length - max] + SOS_RATE_LIMIT_WINDOW_MS;
  return Math.max(1, Math.ceil((freesAt - now) / 1000));
}

function decide(account: number[], ip: number[], now: number): SosRateLimitCheckResult {
  const waitAccount = secondsUntilFree(account, SOS_RATE_LIMIT_MAX_REPORTS, now);
  const waitIp = secondsUntilFree(ip, SOS_RATE_LIMIT_MAX_REPORTS_PER_IP, now);
  const retryAfterSeconds = Math.max(waitAccount, waitIp);
  const blockedByIp = waitIp > waitAccount;
  return {
    allowed: retryAfterSeconds === 0,
    count: blockedByIp ? ip.length : account.length,
    maxReports: blockedByIp ? SOS_RATE_LIMIT_MAX_REPORTS_PER_IP : SOS_RATE_LIMIT_MAX_REPORTS,
    retryAfterSeconds,
    message: retryAfterSeconds === 0 ? "" : SOS_RATE_LIMIT_ERROR_EN,
  };
}

function merged(memory: number[], stored: number[]) {
  // The database is authoritative; memory only covers reports another
  // instance has not seen yet. Take whichever list knows about more reports.
  return stored.length >= memory.length ? stored : memory;
}

/**
 * Checks whether the resident account (1 report) or its network address
 * (2 reports) has used up the 5-minute quota. Only successfully saved fire
 * reports count.
 */
export async function checkResidentSosRateLimit(
  userId: string,
  ipAddress?: string | null,
  providedClient?: PoolClient | null
): Promise<SosRateLimitCheckResult> {
  const now = Date.now();
  const windowStart = new Date(now - SOS_RATE_LIMIT_WINDOW_MS);

  // 1. In-memory tracking answers immediately when it already blocks.
  const memoryAccount = memoryTimestamps(userId, now);
  const memoryIp = ipAddress ? memoryTimestamps(`ip:${ipAddress}`, now) : [];
  const fromMemory = decide(memoryAccount, memoryIp, now);
  if (!fromMemory.allowed || providedClient === null) return fromMemory;

  // 2. Saved reports in the last 5 minutes, per account and per address.
  try {
    const executeQuery = async (client: PoolClient) => {
      const result = await client.query<{ account_times: string[] | null; ip_times: string[] | null }>(
        `SELECT array_agg(fr.submitted_at::text ORDER BY fr.submitted_at) FILTER (WHERE rp.user_id = $1) AS account_times,
                array_agg(fr.submitted_at::text ORDER BY fr.submitted_at)
                  FILTER (WHERE $2::text IS NOT NULL AND host(fr.reporter_ip_address) = $2::text) AS ip_times
         FROM fire_reports fr
         LEFT JOIN resident_profiles rp ON rp.id = fr.resident_profile_id
         WHERE (rp.user_id = $1 OR ($2::text IS NOT NULL AND host(fr.reporter_ip_address) = $2::text))
           AND fr.submitted_at >= $3`,
        [userId, ipAddress || null, windowStart.toISOString()]
      );
      const times = (values: string[] | null) => (values ?? []).map((value) => new Date(value).getTime());
      return { account: times(result.rows[0]?.account_times ?? null), ip: times(result.rows[0]?.ip_times ?? null) };
    };

    let stored: { account: number[]; ip: number[] };
    if (providedClient) {
      stored = await executeQuery(providedClient);
    } else {
      const { getDatabase } = await import("../db");
      const client = await getDatabase().connect();
      try {
        stored = await executeQuery(client);
      } finally {
        client.release();
      }
    }
    return decide(merged(memoryAccount, stored.account), merged(memoryIp, stored.ip), now);
  } catch (error) {
    // If the database query fails, fall back to the in-memory check without crashing
    console.warn("[SOS_RATE_LIMIT] Database query failed, relying on memory check:", error);
    return fromMemory;
  }
}

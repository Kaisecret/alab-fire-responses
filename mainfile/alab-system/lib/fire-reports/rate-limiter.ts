import type { PoolClient } from "pg";

export const SOS_RATE_LIMIT_MAX_REPORTS = 2;
export const SOS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
export const SOS_RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes in seconds

export const SOS_RATE_LIMIT_ERROR_EN =
  "You can only send up to 2 fire reports every 5 minutes. Please wait before submitting again.";

// In-memory sliding window cache for fast checks and test/mock environments
// Maps userId (or IP) -> array of timestamps of SUCCESSFUL submissions
const memorySuccessfulSosReports = new Map<string, number[]>();

export function getMemorySosReportCount(key: string, now = Date.now()): number {
  const windowStart = now - SOS_RATE_LIMIT_WINDOW_MS;
  const timestamps = memorySuccessfulSosReports.get(key) || [];
  const valid = timestamps.filter((t) => t > windowStart);
  if (valid.length !== timestamps.length) {
    if (valid.length > 0) {
      memorySuccessfulSosReports.set(key, valid);
    } else {
      memorySuccessfulSosReports.delete(key);
    }
  }
  return valid.length;
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
 * Checks whether the resident user or IP has exceeded the 2 reports per 5 minutes quota.
 * Only successfully saved fire reports within the last 5 minutes are counted.
 */
export async function checkResidentSosRateLimit(
  userId: string,
  ipAddress?: string | null,
  providedClient?: PoolClient | null
): Promise<SosRateLimitCheckResult> {
  const now = Date.now();
  const windowStart = new Date(now - SOS_RATE_LIMIT_WINDOW_MS);

  // 1. Check in-memory tracking first
  const memoryCount = Math.max(
    getMemorySosReportCount(userId, now),
    ipAddress ? getMemorySosReportCount(`ip:${ipAddress}`, now) : 0
  );

  if (memoryCount >= SOS_RATE_LIMIT_MAX_REPORTS) {
    return {
      allowed: false,
      count: memoryCount,
      maxReports: SOS_RATE_LIMIT_MAX_REPORTS,
      retryAfterSeconds: SOS_RATE_LIMIT_WINDOW_SECONDS,
      message: SOS_RATE_LIMIT_ERROR_EN,
    };
  }

  // 2. Query database for persistent successful reports in the last 5 minutes
  try {
    const executeQuery = async (client: PoolClient) => {
      const result = await client.query<{ count: string; oldest_submitted_at: string | null }>(
        `SELECT COUNT(*)::text AS count,
                MIN(fr.submitted_at)::text AS oldest_submitted_at
         FROM fire_reports fr
         LEFT JOIN resident_profiles rp ON rp.id = fr.resident_profile_id
         WHERE (rp.user_id = $1 OR ($2::text IS NOT NULL AND fr.reporter_ip_address = $2))
           AND fr.submitted_at >= $3`,
        [userId, ipAddress || null, windowStart.toISOString()]
      );

      const dbCount = parseInt(result.rows[0]?.count || "0", 10);
      return { dbCount, oldestSubmitted: result.rows[0]?.oldest_submitted_at };
    };

    let dbCount = 0;
    let oldestSubmitted: string | null = null;

    if (providedClient) {
      const res = await executeQuery(providedClient);
      dbCount = res.dbCount;
      oldestSubmitted = res.oldestSubmitted;
    } else if (providedClient === null) {
      // Explicit null = unit test / in-memory mode
      dbCount = 0;
    } else {
      const { getDatabase } = await import("../db");
      const pool = getDatabase();
      const client = await pool.connect();
      try {
        const res = await executeQuery(client);
        dbCount = res.dbCount;
        oldestSubmitted = res.oldestSubmitted;
      } finally {
        client.release();
      }
    }

    const effectiveCount = Math.max(memoryCount, dbCount);

    if (effectiveCount >= SOS_RATE_LIMIT_MAX_REPORTS) {
      let retryAfterSeconds = SOS_RATE_LIMIT_WINDOW_SECONDS;
      if (oldestSubmitted) {
        const oldestTime = new Date(oldestSubmitted).getTime();
        const elapsed = now - oldestTime;
        retryAfterSeconds = Math.max(1, Math.ceil((SOS_RATE_LIMIT_WINDOW_MS - elapsed) / 1000));
      }

      return {
        allowed: false,
        count: effectiveCount,
        maxReports: SOS_RATE_LIMIT_MAX_REPORTS,
        retryAfterSeconds,
        message: SOS_RATE_LIMIT_ERROR_EN,
      };
    }

    return {
      allowed: true,
      count: effectiveCount,
      maxReports: SOS_RATE_LIMIT_MAX_REPORTS,
      retryAfterSeconds: 0,
      message: "",
    };
  } catch (error) {
    // If database query fails, fallback to in-memory check without crashing
    console.warn("[SOS_RATE_LIMIT] Database query failed, relying on memory check:", error);
    const allowed = memoryCount < SOS_RATE_LIMIT_MAX_REPORTS;
    return {
      allowed,
      count: memoryCount,
      maxReports: SOS_RATE_LIMIT_MAX_REPORTS,
      retryAfterSeconds: allowed ? 0 : SOS_RATE_LIMIT_WINDOW_SECONDS,
      message: allowed ? "" : SOS_RATE_LIMIT_ERROR_EN,
    };
  }
}

import "server-only";
import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;

/** Bound notification DB waits after the review has committed. */
export async function withDeliveryTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) throw new Error("DELIVERY_DATABASE_NOT_CONFIGURED");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 2,
    connectionTimeoutMillis: 5_000, query_timeout: 5_000, statement_timeout: 5_000 });
  const client = await pool.connect();
  let failed = false;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    failed = true;
    try { await client.query("ROLLBACK"); } catch { /* discard this connection */ }
    throw error;
  } finally { client.release(failed); }
}

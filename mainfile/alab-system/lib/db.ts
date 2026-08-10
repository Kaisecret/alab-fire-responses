import { Pool, type PoolClient } from "pg";

declare global {
  var alabDatabasePool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for resident account data.");
  }

  return new Pool({ connectionString, max: 5 });
}

export function getDatabase() {
  if (!global.alabDatabasePool) {
    global.alabDatabasePool = createPool();
  }
  return global.alabDatabasePool;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

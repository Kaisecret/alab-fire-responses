export type DatabaseHealth =
  | { status: "ok"; database: "connected" }
  | { status: "error"; database: "unavailable" };

export type DatabaseProbe = () => Promise<unknown>;

export async function checkDatabaseConnection(
  probe: DatabaseProbe,
): Promise<DatabaseHealth> {
  try {
    await probe();
    return { status: "ok", database: "connected" };
  } catch {
    return { status: "error", database: "unavailable" };
  }
}

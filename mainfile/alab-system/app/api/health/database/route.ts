import { NextResponse } from "next/server";

import {
  checkDatabaseConnection,
} from "../../../../lib/database-health";
import { getPrisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkDatabaseConnection(
    async () => getPrisma().$queryRaw`SELECT 1`,
  );

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 503,
  });
}

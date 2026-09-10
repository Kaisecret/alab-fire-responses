import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";
import type { ManagementActor } from "./management/types";

export type ProvincialBfpIdentity = BfpIdentity & {
  role: "PROVINCIAL_BFP";
};

export async function requireProvincialBfp(
  request: NextRequest,
): Promise<ProvincialBfpIdentity | NextResponse> {
  const session = verifyBfpSession(
    request.cookies.get(bfpSessionCookieName("PROVINCIAL_BFP"))?.value,
  );
  if (!session || session.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Provincial BFP sign-in is required." },
      { status: 401 },
    );
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity || identity.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Your provincial access is no longer active." },
      { status: 403 },
    );
  }
  return identity as ProvincialBfpIdentity;
}

export function isProvincialAuthorizationResponse(
  value: unknown,
): value is NextResponse {
  return value instanceof NextResponse;
}

export async function getManagementActor(
  request: NextRequest,
): Promise<ManagementActor | NextResponse> {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) {
    return identity;
  }
  return {
    userId: identity.userId,
    role: "PROVINCIAL_BFP",
    province: "Antique",
  };
}

export function isManagementActor(value: unknown): value is ManagementActor {
  if (!value || typeof value !== "object") return false;
  const actor = value as Partial<ManagementActor>;
  return (
    actor.role === "PROVINCIAL_BFP" &&
    actor.province === "Antique" &&
    typeof actor.userId === "string"
  );
}

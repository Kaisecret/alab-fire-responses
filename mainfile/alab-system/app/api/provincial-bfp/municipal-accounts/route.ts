import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db";
import { getBfpIdentity, provisionMunicipalBfpAccount } from "../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

async function provincialActor(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("PROVINCIAL_BFP"))?.value);
  if (!session || session.role !== "PROVINCIAL_BFP") return null;
  const identity = await getBfpIdentity(session.userId);
  return identity?.role === "PROVINCIAL_BFP" ? identity : null;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await provincialActor(request);
    if (!actor) return NextResponse.json({ error: "Provincial BFP sign-in is required." }, { status: 401 });
    const database = getDatabase();
    const [municipalities, accounts] = await Promise.all([
      database.query<{ id: string; name: string; psgcCode: string | null }>(
        `select id, name, psgc_code as "psgcCode" from municipalities where province = 'Antique' order by name`,
      ),
      database.query<{ userId: string; email: string; displayName: string; rankOrPosition: string | null; municipalityId: string; municipalityName: string; assignmentRole: string; status: string; mustChangePassword: boolean }>(
        `select u.id as "userId", u.email, p.display_name as "displayName", p.rank_or_position as "rankOrPosition",
                a.municipality_id as "municipalityId", m.name as "municipalityName", a.assignment_role as "assignmentRole",
                a.status, p.must_change_password as "mustChangePassword"
           from bfp_municipality_assignments a
           join bfp_personnel_profiles p on p.id = a.personnel_profile_id
           join users u on u.id = p.user_id
           join municipalities m on m.id = a.municipality_id
          order by m.name, p.display_name`,
      ),
    ]);
    return NextResponse.json({ municipalities: municipalities.rows, accounts: accounts.rows });
  } catch (error) {
    console.error("Municipal account roster failed", error);
    return NextResponse.json({ error: "Unable to load municipal accounts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: string; displayName?: string; rankOrPosition?: string; municipalityId?: string; assignmentRole?: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF"; temporaryPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid municipal account data." }, { status: 400 });
  }
  try {
    const actor = await provincialActor(request);
    if (!actor) return NextResponse.json({ error: "Provincial BFP sign-in is required." }, { status: 401 });
    const account = await provisionMunicipalBfpAccount(actor.userId, {
      email: body.email ?? "",
      displayName: body.displayName ?? "",
      rankOrPosition: body.rankOrPosition,
      municipalityId: body.municipalityId ?? "",
      assignmentRole: body.assignmentRole ?? "MUNICIPAL_STAFF",
      temporaryPassword: body.temporaryPassword,
    });
    return NextResponse.json({
      account: {
        userId: account.userId,
        municipalityName: account.municipalityName,
        email: account.email,
        displayName: account.displayName,
        assignmentRole: account.assignmentRole,
      },
      temporaryPassword: account.temporaryPassword,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_BFP_ACCOUNT_INPUT"
      ? "Complete the staff name, official email, municipality, and role."
      : error instanceof Error && error.message === "TEMPORARY_PASSWORD_TOO_SHORT"
        ? "A temporary password must have at least 12 characters."
        : error instanceof Error && error.message === "INVALID_MUNICIPALITY"
          ? "Select an Antique municipality."
          : typeof error === "object" && error && "code" in error && error.code === "23505"
            ? "That email is already assigned or this municipality already has an active administrator."
            : "Unable to issue this municipal account.";
    if (!(typeof error === "object" && error && "code" in error && error.code === "23505")) console.error("Municipal account provisioning failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireProvincialBfp, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { listProvincialBarangayAlerts, acknowledgeProvincialBarangayAlert, assignBarangayIncidentAssistance } from "../../../../lib/intermunicipality/barangay-alerts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const quantity = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 500;

function failed(error: unknown) {
  const message=error instanceof Error ? error.message : "";
  const conflicts:Record<string,string>={
    BARANGAY_ALERT_CHANGED:"The active incidents changed. Refresh coordination and try again.",
    BARANGAY_DISPATCH_REQUIRED:"This incident is awaiting municipal dispatch. Assistance can be assigned after dispatch.",
    ASSISTANCE_ALREADY_OPEN:"This municipality already has a command for this incident. Review its existing assignment.",
    INCIDENT_NOT_FOUND:"This incident no longer has an active dispatch.",
    INCIDENT_NOT_ACTIVE:"This incident is no longer active.",
    UNSELECTED_ASSISTANCE_RECIPIENT:"The selected municipality is no longer available for this dispatch.",
  };
  if (message in conflicts) return NextResponse.json({error:conflicts[message]},{status:409,headers});
  if (/^(INVALID_|ASSISTANCE_RESOURCES_REQUIRED)/.test(message)) return NextResponse.json({error:"Choose an available nearby municipality and valid resources."},{status:400,headers});
  console.error("Provincial barangay coordination failed",error);
  return NextResponse.json({error:"Unable to update barangay coordination."},{status:500,headers});
}

export async function GET(request:NextRequest) {
  const identity=await requireProvincialBfp(request);
  if(isProvincialAuthorizationResponse(identity))return identity;
  try { return NextResponse.json({alerts:await listProvincialBarangayAlerts()},{headers}); }
  catch(error){return failed(error);}
}

async function bodyFor(request:NextRequest):Promise<Record<string,unknown>|null> {
  try {const body=await request.json();return body && typeof body==="object" && !Array.isArray(body) ? body:null;}
  catch {return null;}
}

export async function PATCH(request:NextRequest) {
  const identity=await requireProvincialBfp(request);
  if(isProvincialAuthorizationResponse(identity))return identity;
  const body=await bodyFor(request);
  if(!body || !uuid(body.alertId) || !Array.isArray(body.incidentIds) || body.incidentIds.length<3 || !body.incidentIds.every(uuid)) {
    return NextResponse.json({error:"A valid alert and its current incidents are required."},{status:400,headers});
  }
  try {return NextResponse.json(await acknowledgeProvincialBarangayAlert(body.alertId,[...new Set(body.incidentIds)],identity.userId),{headers});}
  catch(error){return failed(error);}
}

export async function POST(request:NextRequest) {
  const identity=await requireProvincialBfp(request);
  if(isProvincialAuthorizationResponse(identity))return identity;
  const body=await bodyFor(request);
  if(!body || !uuid(body.alertId) || !uuid(body.fireReportId) || !uuid(body.recipientMunicipalityId)
    || !quantity(body.requestedFiretrucks) || !quantity(body.requestedPersonnel) || body.requestedFiretrucks+body.requestedPersonnel===0) {
    return NextResponse.json({error:"Select an incident, municipality, and at least one firetruck or personnel."},{status:400,headers});
  }
  try {
    const assistanceRequests=await assignBarangayIncidentAssistance({alertId:body.alertId,fireReportId:body.fireReportId,
      recipientMunicipalityId:body.recipientMunicipalityId,requestedFiretrucks:body.requestedFiretrucks,
      requestedPersonnel:body.requestedPersonnel,actorUserId:identity.userId});
    return NextResponse.json({assistanceRequests},{status:201,headers});
  }catch(error){return failed(error);}
}

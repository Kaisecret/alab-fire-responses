import { NextRequest, NextResponse } from "next/server";

import { listAccountNotifications, markAccountNotificationRead, markAllAccountNotificationsRead } from "../../../../lib/notifications/service";
import { residentNotificationUser } from "../../../../lib/notifications/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = residentNotificationUser(request);
  if (!identity) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 25);
    return NextResponse.json(await listAccountNotifications(identity.userId, limit), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Resident notification lookup failed", error);
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const identity = residentNotificationUser(request);
  if (!identity) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  try {
    const body = await request.json() as { notificationId?: unknown; markAll?: unknown };
    if (body.markAll === true) {
      await markAllAccountNotificationsRead(identity.userId);
      return NextResponse.json({ ok: true });
    }
    if (typeof body.notificationId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.notificationId)) {
      return NextResponse.json({ error: "Select a valid notification." }, { status: 400 });
    }
    const found = await markAccountNotificationRead(identity.userId, body.notificationId);
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Notification not found." }, { status: 404 });
  } catch (error) {
    console.error("Resident notification update failed", error);
    return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}

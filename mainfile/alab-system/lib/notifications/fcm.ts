import "server-only";

import { createSign, randomUUID } from "node:crypto";

import { getDatabase } from "../db";

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

type FcmDevice = { id: string; user_id: string; fcm_token: string; notification_id: string };

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function firebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FirebaseServiceAccount;
    return parsed.client_email && parsed.private_key && parsed.project_id ? parsed : null;
  } catch {
    return null;
  }
}

async function accessToken(account: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const assertion = `${header}.${payload}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = await response.json() as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error("FCM_AUTH_FAILED");
  return body.access_token;
}

export async function registerMobileDevice(userId: string, installationId: string, fcmToken: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || installationId.trim().length < 16 || installationId.length > 255 || fcmToken.trim().length < 20 || fcmToken.length > 4096) {
    throw new Error("INVALID_DEVICE_REGISTRATION");
  }
  const database = getDatabase();
  await database.query("delete from bfp_mobile_devices where fcm_token = $1 and user_id <> $2", [fcmToken, userId]);
  await database.query(
    `insert into bfp_mobile_devices (id, user_id, installation_id, fcm_token, platform, push_enabled, last_seen_at, created_at, updated_at)
     values ($1,$2,$3,$4,'ANDROID',true,now(),now(),now())
     on conflict (user_id, installation_id) do update set fcm_token = excluded.fcm_token, platform = 'ANDROID',
       push_enabled = true, revoked_at = null, last_seen_at = now(), updated_at = now()`,
    [randomUUID(), userId, installationId.trim(), fcmToken.trim()],
  );
}

export async function sendDispatchPush(input: { dispatchId: string; fireReportId: string; referenceNumber: string; recipientUserIds: string[] }) {
  const account = firebaseServiceAccount();
  if (!account || !input.recipientUserIds.length) return;
  const database = getDatabase();
  const devices = await database.query<FcmDevice>(
    `select device.id, device.user_id, device.fcm_token, notification.id as notification_id
       from bfp_mobile_devices device
       join account_notifications notification on notification.recipient_user_id = device.user_id
      where device.user_id = any($1::uuid[]) and device.push_enabled = true and device.revoked_at is null
        and notification.event_type = 'INCIDENT_DISPATCH_ASSIGNED'
        and notification.context->>'dispatchId' = $2`,
    [input.recipientUserIds, input.dispatchId],
  );
  if (!devices.rowCount) return;
  const token = await accessToken(account);
  await Promise.all(devices.rows.map(async (device) => {
    let status = "SENT";
    let providerMessageId: string | null = null;
    let failureCode: string | null = null;
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: {
          token: device.fcm_token,
          notification: { title: "Emergency dispatch assigned", body: input.referenceNumber },
          data: { dispatchId: input.dispatchId, fireReportId: input.fireReportId, type: "INCIDENT_DISPATCH_ASSIGNED" },
          android: { priority: "high", notification: { channel_id: "incident_dispatches", sound: "default", notification_priority: "PRIORITY_MAX" } },
        } }),
      });
      const body = await response.json() as { name?: string; error?: { status?: string } };
      if (!response.ok) {
        failureCode = body.error?.status ?? "FCM_SEND_FAILED";
        status = failureCode === "UNREGISTERED" ? "INVALID" : "FAILED";
        if (status === "INVALID") await database.query("update bfp_mobile_devices set revoked_at = now(), updated_at = now() where id = $1", [device.id]);
      } else providerMessageId = body.name ?? null;
    } catch {
      status = "FAILED";
      failureCode = "FCM_NETWORK_FAILED";
    }
    await database.query(
      `insert into push_notification_deliveries (id, account_notification_id, device_id, status, provider_message_id, failure_code, attempted_at, sent_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,now(),case when $4 = 'SENT' then now() else null end,now(),now())
       on conflict (account_notification_id, device_id) do update set status = excluded.status, provider_message_id = excluded.provider_message_id,
         failure_code = excluded.failure_code, attempted_at = excluded.attempted_at, sent_at = excluded.sent_at, updated_at = now()`,
      [randomUUID(), device.notification_id, device.id, status, providerMessageId, failureCode],
    );
  }));
}

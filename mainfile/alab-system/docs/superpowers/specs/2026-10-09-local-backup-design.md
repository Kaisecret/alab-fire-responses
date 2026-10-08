# Local Backup Design

Date: 2026-10-09. Requested by the capstone team; the mobile part was approved in chat, and the team asked for the work to start without a separate spec review.

## Problem

A municipality with more than one station often sends only one of them to a fire. When that crew needs help, the only button in the mobile app is **Request backup**, which goes to the province and becomes a second alarm. That calls other municipalities even though the responder's own town still has a free station.

## Goal

A responder can ask for another station from their own town. The town's fire marshal approves it on the website, and the chosen station joins the same response. The province, alarms and inter-municipality coordination are not involved and not changed.

## Mobile app (approved)

- A **Local backup** button sits under **Request backup** on the map.
- It shows only when the responder's own municipality (from their account, not the fire's location) has two or more active stations, and at least one of those stations is not on this fire and has crew on duty.
- Tapping it opens a sheet with one card per station of the responder's town: name, head, distance to the fire, crew on duty, and a status of **Available**, **Busy** (on another active fire), **On this fire** or **No crew**. Only Available and Busy stations can be picked.
- The nearest Available station is marked **Recommended** and pre-ticked. The responder can tick one or more cards, add an optional reason, and tap **Ask fire marshal**.
- While the request waits, the button reads "Waiting for fire marshal". When the marshal sends stations the app says which are coming; when the marshal declines, the app says so. The button disappears once no station can be picked.
- **Request backup** (province) is unchanged and can be used at any time.

## Website (municipal portal)

- A new **Local backup** alert, built like the existing backup alarm: it checks every 5 seconds, sounds a tone, and shows a card for the oldest open request in the signed-in municipality.
- The card shows the report code, barangay, who asked, the reason, and the town's stations with the responder's choices ticked. The officer can change the ticks.
- **Send** adds the ticked stations to the running dispatch. **Decline** closes the request. There is no timer and nothing forwards to the province.
- Any municipal BFP account of that town can act on it, as with the existing backup alarm.

## Server

- New table `incident_local_backup_requests`: incident, dispatch, municipality, requester, requested station ids, reason, status (`PENDING`, `SENT`, `DECLINED`, `CANCELLED`), stations sent, who handled it and when. At most one `PENDING` request per dispatch and municipality.
- New module `lib/municipal-bfp/local-backup.ts`, with the card ranking in a pure helper `lib/municipal-bfp/local-backup-options.ts`.
- Mobile API `GET/POST /api/mobile-bfp/local-backup`: the responder's options and open request, and creating a request. The responder must be a recipient on the active dispatch.
- Municipal API `GET/PATCH /api/municipal-bfp/local-backup-requests`: open requests with station options, and `SEND` or `DECLINE`.
- **Send** adds each station and its active crew to the existing active dispatch, notes it in the incident history, and sends the normal dispatch notification and push to the new crew only. It does not change the incident status, alarm level, observers or assistance requests. `lib/municipal-bfp/dispatch.ts` and the inter-municipality modules are not edited.
- Notifications: `LOCAL_BACKUP_REQUESTED` to the town's accounts, `LOCAL_BACKUP_SENT` or `LOCAL_BACKUP_DECLINED` to the requester.
- The migration reaches production through `scripts/apply-command-migration.mjs`.

## Errors

- Request while not on an active dispatch, not eligible, choosing a station of another town or one already on the fire: refused with a plain message.
- A second request while one is open: refused ("already waiting for the fire marshal").
- Send after the dispatch ended or a chosen station lost its crew: refused, and the card stays open with the message.

## Testing

- Unit tests for the card ranking and eligibility (pure helper).
- Source tests that the routes exist, check authorization and never touch alarm, observer or assistance code.
- `flutter analyze` for the app, and the existing test suite for everything else.

# ALAB — complete system IPO framework

Prepared on 2026-09-13 from the repository's current code and the existing framework in `tests/alab-ipo-framework-2026-09-12.png`.

The diagram follows the supplied Input → Process → Output structure with an Output → Evaluate → Input feedback loop. It covers the resident portal, Municipal BFP portal, Provincial BFP portal, responder mobile application, and shared services. This is a conceptual overview, not a claim that every workflow has passed live deployment testing.

## INPUT

- Residents submit identity evidence, contact details, addresses, and registration corrections.
- Residents and BFP staff submit app-based or phone-call fire reports with photos, location, landmarks, and fire details.
- GIS, building density, road access, structure materials, and weather provide severity-assessment inputs.
- BFP personnel maintain municipality, station, personnel, resident, and account records.
- Municipal BFP selects responders and submits dispatch actions, backup requirements, and incident outcomes.
- Mobile responders provide route-start and GPS location updates for assigned incidents.
- Users supply search criteria, reporting periods, notification preferences, and emergency text for translation.

## PROCESS

- Authenticate users; enforce role and jurisdiction access; review resident applications for approval or correction.
- Validate and store reports; route incidents to Municipal BFP for review and map their locations.
- Calculate weighted severity and alarm recommendations using environmental and incident factors.
- Record authorized dispatches; deliver mobile assignments; provide road routes and track responder locations.
- After local dispatch, notify nearby eligible municipalities; process explicit backup requests and responses.
- Manage provincial and municipal records; preserve incident histories, permissions, and audit trails.
- Update report status; send relevant notifications; translate emergency text; aggregate and export provincial reports.

## OUTPUT

- Verified resident accounts, application decisions, correction instructions, and updated profiles.
- Fire-report references, status histories, incident details, and GIS maps of incidents and stations.
- Severity scores, alarm recommendations, road routes, and responder-location views for decision support.
- Mobile dispatch assignments, response tracking, and municipally recorded incident resolutions.
- Neighbor alerts, backup-request decisions, and inter-municipality coordination records.
- Province-wide directories, monitoring dashboards, filtered incident summaries, CSV exports, and audit logs.
- In-app, push, SMS, or email messages where supported; translated emergency text and resident safety guidance.

## EVALUATE

Review data accuracy, access control, usability, notification delivery, response times, and coordination effectiveness. Findings inform corrections to records, configuration, and procedures. This is the proposed evaluation loop, not an automated evaluation feature.

Final dispatch, backup, and incident-resolution decisions remain with authorized Municipal BFP personnel. Provincial management authority does not confer municipal incident-command authority.

## Coverage and source map

All paths below are relative to the workspace root.

| System area | Source evidence |
|---|---|
| Resident registration, authentication and access | `mainfile/alab-system/lib/auth/`; `app/api/auth/` within that project |
| Resident application review, correction, resubmission and delivery | `mainfile/alab-system/lib/resident-applications/`; municipal and provincial resident-application APIs |
| Resident profile, history, reporting and safety guidance | `mainfile/alab-system/app/resident/`; `app/_components/resident-guide-page.tsx` |
| Citizen and phone-call incident intake | `mainfile/alab-system/lib/fire-reports/`; `lib/municipal-bfp/phone-incidents.ts` |
| Weighted severity assessment | `mainfile/alab-system/lib/fire-reports/severity.ts`; building density and weather services |
| GIS and road routing | `mainfile/alab-system/app/_components/antique-gis-map.tsx`; municipal GIS components; `app/api/routes/road/` |
| Municipal stations, personnel and dispatch | `mainfile/alab-system/lib/municipal-bfp/`; municipal station and personnel APIs |
| Mobile assignments, route start and location updates | `mainfile/alab-system/app/api/mobile-bfp/`; `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart` |
| Inter-municipality alerts and backup coordination | `mainfile/alab-system/lib/intermunicipality/` |
| Provincial municipalities, stations, personnel, residents and applications | `mainfile/alab-system/lib/provincial-bfp/management/` |
| Provincial report registry, summaries, export and audit | `reports.ts`, `report-summaries.ts`, `exports.ts`, `audit.ts` in provincial management |
| Notifications | `mainfile/alab-system/lib/notifications/`, `lib/sms/`, `lib/email/` and resident delivery services |
| Emergency translation | `mainfile/alab-system/app/api/nlp/translate/route.ts`; `app/_lib/nlp-translator.ts` |

## Additional screens and scope limits

The broader system overview includes firetruck readiness, water-source management, offline field operations, and expanded field status reporting. These should not all be presented as completed operational services merely because they appear in the overview or navigation.

- **Water sources:** The municipal water-source page currently contains a hardcoded sample array. Describe this as a resource-reference screen until persistence and operational verification are established.
- **Firetruck/resource screens:** Resource and onboarding screens exist, but this review does not establish a complete persisted fleet-management or automatic firetruck-optimization service.
- **Offline support:** Resident PWA and offline emergency components exist. This does not establish full offline responder maps, queued field updates, or synchronization.
- **Mobile operations:** The inspected dispatch-update API supports `START_ROUTE` and `LOCATION_PING`. The diagram does not imply that all statuses listed in the broad overview are implemented.
- **Safety guidance and translation:** These support residents and emergency communication. Translation accepts Hiligaynon, Tagalog, and English.
- **Severity assessment:** The current implementation uses weighted criteria for density, wind, structure, route access, and weather. It is decision support, not AI image verification or a validated prediction of fire outcomes.
- **Notifications:** Delivery channels depend on the workflow and configured integrations; the diagram does not imply that every event uses every channel.
- **Evaluation:** The proposed evaluation criteria have not been measured by creating this diagram.

The open provincial-management plan was used as context and cross-checked against existing services; its unchecked tasks alone are not evidence of completed behavior.

## Production

Image generated with the built-in image-generation tool. The exact generation prompt is saved alongside this document. The previous framework is preserved.


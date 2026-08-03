# GIS-Based Provincial Fire Response and Decision Support System

## Project Title

**GIS-Based Provincial Fire Response and Decision Support System with Smart Dispatch and Inter-Municipality Coordination for BFP in Antique**

## 1. Application Overview

The application is an integrated emergency-response platform designed for the Bureau of Fire Protection (BFP) in the Province of Antique. It supports fire reporting, incident verification, GIS mapping, preliminary fire-severity assessment, firetruck dispatch recommendations, route guidance, verified water-source identification, firefighter field operations, incident command, inter-municipality coordination, analytics, and report generation.

The system is composed of the following major applications:

1. **Citizen Emergency Reporting Application** – allows residents or citizen reporters to report fire incidents.
2. **Provincial BFP Web Dashboard** – provides province-wide monitoring of incidents, resources, and assistance requests.
3. **Municipal BFP Web Dashboard** – manages local incidents, firetrucks, water sources, responders, and municipal reports.
4. **Firefighter Mobile Application** – gives field responders access to incident details, routes, tasks, water sources, and offline emergency information.
5. **Central Backend and Database** – stores and manages users, incidents, resources, maps, timelines, assistance requests, and reports.
6. **GIS and Decision-Support Module** – identifies locations, nearby resources, possible routes, severity recommendations, and suitable response units.

> **Important:** The application only provides recommendations and decision support. Final decisions regarding fire severity, dispatch, route selection, firetruck assignment, and inter-municipality assistance remain under the authority of authorized BFP personnel.

---

## 2. Main Objectives

The system aims to:

- Provide faster and more organized fire-incident reporting.
- Identify the exact fire location through GPS and GIS mapping.
- Support manual verification of submitted reports.
- Maintain a centralized database of incidents and BFP resources.
- Recommend an initial fire-severity level using predefined rules.
- Recommend suitable available firetrucks based on operational criteria.
- Show nearby verified water sources and possible response routes.
- Support coordination between neighboring municipal BFP stations.
- Allow firefighters to access incident information through a mobile application.
- Support offline access during weak or unavailable internet connectivity.
- Record a complete timeline of incident-response activities.
- Generate response analytics and operational reports.

---

## 3. System Users

### 3.1 Resident or Citizen Reporter

A resident can submit a fire report using the Citizen Emergency Reporting Application.

#### Main Functions

- Submit a fire-incident report.
- Provide GPS location or select a location on the map.
- Enter a landmark and incident description.
- Provide contact information.
- Upload an incident image.
- Receive a report reference number.
- View basic submission status, when permitted.

#### Access Limitations

- Cannot verify or confirm an incident.
- Cannot assign firetrucks or responders.
- Cannot view confidential BFP operational information.
- Cannot make final severity or dispatch decisions.

---

### 3.2 Municipal BFP Personnel

Municipal BFP personnel manage fire incidents and response resources within their assigned municipality.

#### Main Functions

- Review submitted fire reports.
- Contact reporters for additional information.
- Confirm, reject, or mark reports as false or duplicate.
- Create official incident records from verified reports.
- Enter verified fire-severity information.
- Review and approve the system's preliminary severity recommendation.
- Manage fire stations and firetrucks.
- Update firetruck operational condition and availability.
- Manage crew assignments.
- Manage verified water-source records.
- Assign firetrucks and responders.
- View recommended response routes.
- Monitor responder and incident status.
- Request assistance from nearby municipalities.
- Accept or reject incoming assistance requests.
- Generate municipal reports.
- Manage authorized user accounts and local access assignments when permitted.
- Close completed incidents.

#### Access Limitations

- Can access only records from the assigned municipality.
- Can access another municipality's information only when connected to an authorized assistance request.
- Administrative and dispatch actions must be recorded in the audit log.

---

### 3.3 Provincial BFP Personnel

Provincial BFP personnel monitor incidents and resources across participating municipalities in Antique.

#### Main Functions

- View province-wide fire incidents.
- Monitor municipal incident status.
- View province-wide fire station and firetruck information.
- Monitor available and assigned resources.
- Monitor inter-municipality assistance requests.
- View provincial GIS maps and incident distribution.
- Review response-time performance.
- View fire trends and statistics.
- Generate provincial reports.
- Monitor resource shortages and recurring high-risk areas.
- Review system activity and coordination records.
- Manage system-wide user accounts, roles, permissions, configuration, backups, and audit logs when officially authorized.

#### Access Limitations

- Province-wide access must follow official authorization.
- Changes to municipal records should follow assigned permissions and operational policies.
- Administrative access must be logged and protected.

---

### 3.4 Firefighter or Authorized Field Responder

Firefighters use the mobile application during field response.

#### Main Functions

- View assigned fire incidents.
- View confirmed incident details.
- View the reported fire location on the map.
- View the assigned task.
- View the recommended response route.
- View nearby landmarks and verified water sources.
- Update responder status.
- Submit field observations.
- Upload incident photographs.
- Record response activities.
- Request additional assistance through authorized channels.
- Access downloaded maps and resource records offline.
- Synchronize offline updates when internet connectivity returns.

#### Common Status Updates

- Assignment Received
- Departed
- En Route
- Arrived
- Responding
- Needs Assistance
- Contained
- Returning
- Available

#### Access Limitations

- Can access only assigned incidents and authorized operational information.
- Cannot alter administrative records or final command decisions unless permitted by role.

---

## 4. Major System Modules and Functions

### 4.1 Authentication and Access Control

#### Functions

- User registration or account creation by authorized Municipal or Provincial BFP personnel.
- Secure login and logout.
- Password reset.
- Role-based access control.
- Municipality-based access control.
- Barangay-based access control.
- Incident-specific access for assistance coordination.
- Session management.
- User activity logging.

---

### 4.2 Real-Time Fire Reporting

#### Functions

- Capture GPS coordinates.
- Allow manual map-pin adjustment.
- Record municipality and barangay.
- Record landmark and description.
- Record reporter contact information.
- Upload an incident image.
- Generate a unique report reference number.
- Route the report to the responsible municipal BFP station.
- Record report date and time.

---

### 4.3 Manual Fire-Report Verification

#### Functions

- View submitted location and map details.
- Review description and image.
- Review reporter information.
- Contact the reporter.
- Compare the report with active incidents.
- Mark the report as:
  - Confirmed
  - Rejected
  - False Report
  - Duplicate
  - Needs More Information
- Convert a verified report into an official incident.

> Uploaded images are used only for manual verification and documentation. The system does not automatically analyze images.

---

### 4.4 GIS-Based Incident Mapping

#### Functions

- Display active and historical fire incidents.
- Display municipal and barangay boundaries.
- Display fire stations.
- Display firetruck locations when available.
- Display verified water sources.
- Display road networks.
- Display landmarks and evacuation areas.
- Identify the municipality and barangay of an incident.
- Search for nearby stations and water sources.
- Display suggested response routes.
- Filter incidents by date, severity, type, municipality, or status.

---

### 4.5 Rule-Based Preliminary Fire-Severity Classification

#### Input Factors

- Type of fire.
- Number of affected structures.
- Presence of trapped persons.
- Presence of injured persons.
- Presence of hazardous materials.
- Rate of fire spread.
- Nearby structures at risk.
- Road accessibility.
- Available firetrucks.
- Nearby verified water sources.

#### Recommended Severity Levels

- Low
- Moderate
- High
- Critical

#### Functions

- Evaluate verified incident information.
- Apply predefined rules.
- Generate a recommended severity level.
- Display the reasons and triggered rules.
- Allow authorized personnel to approve or modify the recommendation.
- Record the final severity, approving user, date, and time.

---

### 4.6 Fire Station Management

#### Functions

- Add and update fire stations.
- Record station name and location.
- Assign the station to a municipality.
- Record contact information.
- View station resources.
- Display the station on the GIS map.

---

### 4.7 Firetruck Management

#### Functions

- Register firetrucks.
- Record vehicle type and identifier.
- Record water capacity.
- Record operational condition.
- Record availability status.
- Assign a crew.
- Record current assignment.
- Maintain status history.
- Mark a firetruck as:
  - Available
  - Reserved
  - Assigned
  - En Route
  - On Scene
  - Returning
  - Under Maintenance
  - Out of Service

---

### 4.8 Verified Water-Source Mapping

#### Supported Water Sources

- Fire hydrants
- Water tanks
- Rivers
- Reservoirs
- Wells
- Other approved sources

#### Functions

- Record coordinates.
- Record water-source type.
- Record accessibility.
- Record current condition.
- Record verification status.
- Record the verifier and verification date.
- Display nearby verified sources on the map.
- Filter out unverified or unavailable sources from recommendations.

---

### 4.9 Smart Firetruck Dispatch Recommendation

#### Evaluation Criteria

- Distance to the incident.
- Estimated travel time.
- Firetruck availability.
- Crew availability.
- Water capacity.
- Operational condition.
- Road accessibility.
- Current assignment.

#### Functions

- Exclude unavailable or non-operational units.
- Rank eligible firetrucks.
- Recommend the most suitable unit.
- Show alternative firetrucks.
- Display the basis for the recommendation.
- Allow authorized Municipal BFP personnel to approve or change the recommendation.
- Record override reasons.

---

### 4.10 Recommended Response Route

#### Functions

- Calculate a possible route from the fire station to the incident.
- Estimate travel distance and travel time.
- Consider available road information.
- Consider road width, condition, and restrictions when recorded.
- Display alternative routes when available.
- Allow authorized personnel to approve or change the route.

> The route is a recommendation because traffic, road obstructions, flooding, construction, and other temporary conditions may not be reflected in the system.

---

### 4.11 Inter-Municipality Assistance

#### Functions

- Select an active incident.
- Identify the requested resource.
- Select a receiving municipality.
- State the reason and priority.
- Submit the assistance request.
- Allow the receiving municipality to accept, partially accept, or reject.
- Assign accepted resources.
- Track assistance status.
- Record dispatch, arrival, completion, and return times.
- Restrict shared information to what is necessary for coordination.

#### Suggested Request Statuses

- Draft
- Submitted
- Under Review
- Accepted
- Partially Accepted
- Rejected
- Resources Assigned
- En Route
- Arrived
- Completed
- Closed

---

### 4.12 Incident Command and Status Tracking

#### Incident Statuses

1. Reported
2. Under Verification
3. Confirmed
4. Dispatched
5. En Route
6. Arrived
7. Responding
8. Contained
9. Cleared
10. Closed

#### Functions

- Assign an incident commander.
- Assign firetrucks and responders.
- Assign operational tasks.
- Update incident severity.
- Monitor unit and responder status.
- Request backup resources.
- Record operational decisions.
- Close the incident after completion.

---

### 4.13 Automatic Incident Timeline

#### Recorded Events

- Report submission
- Report verification
- Incident confirmation
- Severity assessment
- Firetruck recommendation
- Assignment
- Dispatch
- Departure
- En route
- Arrival
- Response activities
- Containment
- Clearance
- Incident closure

#### Functions

- Automatically record event timestamps.
- Record the user responsible for each action.
- Preserve chronological incident history.
- Support post-incident review and reporting.

---

### 4.14 Firefighter Mobile Application

#### Functions

- Secure mobile login.
- View assigned incidents.
- View location and map details.
- View confirmed severity.
- View assigned tasks.
- View recommended route.
- View nearby landmarks and water sources.
- Update responder status.
- Add field observations.
- Upload photographs.
- Record activities.
- Work with selected data offline.
- Synchronize pending updates after reconnection.

---

### 4.15 Offline Emergency Mode

#### Offline Data

- Assigned municipality map.
- Road information.
- Landmarks.
- Fire stations.
- Verified water sources.
- Current assignments.
- Pending observations and status updates.

#### Functions

- Download approved municipality data.
- Store data securely on the mobile device.
- Queue updates while offline.
- Retry synchronization when connectivity returns.
- Prevent duplicate records.
- Handle data conflicts based on predefined synchronization rules.

---

### 4.16 Dashboards

#### Provincial Dashboard

- Province-wide active incidents.
- Incident summary by municipality.
- Resource availability.
- Inter-municipality assistance status.
- Response-time statistics.
- Fire trends and incident distribution.
- Provincial report generation.

#### Municipal Dashboard

- Local active incidents.
- Pending report verification.
- Local firetrucks and crews.
- Fire stations.
- Verified water sources.
- Barangays and local maps.
- Assistance requests.
- Municipal analytics and reports.

---

### 4.17 Response Analytics and Report Generation

#### Analytics

- Total reported incidents.
- Confirmed incidents.
- Rejected and false reports.
- Incidents by municipality and barangay.
- Incidents by fire type.
- Incidents by severity.
- Average verification time.
- Average dispatch time.
- Average travel time.
- Average arrival time.
- Average containment time.
- Firetruck utilization.
- Water-source usage.
- Inter-municipality assistance frequency.

#### Reports

- Incident report.
- Incident timeline report.
- Municipal monthly report.
- Provincial monthly report.
- Firetruck utilization report.
- Response-time report.
- Assistance-request report.
- Water-source report.
- User-activity report.
- Post-incident report.

---

### 4.18 Searchable BFP Knowledge Base

#### Functions

- Store approved procedures and references.
- Organize articles by category.
- Search using keywords.
- Attach approved documents.
- Record article version and approval status.
- Publish safety reminders and dispatch guidelines.

> The knowledge base is for reference only and does not make emergency-response decisions.

---

### 4.19 Notifications

#### Functions

- Notify the responsible municipal BFP station about a new report.
- Notify personnel when a report is confirmed.
- Notify assigned responders.
- Notify municipalities about assistance requests.
- Notify users when a request is accepted or rejected.
- Notify authorized Provincial BFP personnel about failed synchronization or system issues.

Possible notification channels may include in-app notifications, push notifications, SMS integration, or email, depending on approved project scope and available services.

---

### 4.20 Audit Logs and Security Monitoring

#### Functions

- Record login attempts.
- Record account and permission changes.
- Record incident modifications.
- Record dispatch decisions.
- Record recommendation overrides.
- Record assistance-request actions.
- Record report generation and data exports.
- Record administrative activities.

Audit records should include the user, action, affected record, previous value, new value, date, time, and device or session information when available.

---

## 5. User and Function Matrix

| Function | Resident or Citizen Reporter | Municipal BFP Personnel | Provincial BFP Personnel | Firefighter or Authorized Field Responder |
|---|---:|---:|---:|---:|
| Submit fire report | Yes | Yes | Yes | Authorized |
| Upload incident image | Yes | Yes | Yes | Yes |
| Verify fire report | No | Yes | Authorized | No |
| Confirm or reject report | No | Yes | Authorized | No |
| View local incident map | Limited | Yes | Yes | Assigned incident |
| View province-wide incidents | No | No | Yes | No |
| Manage fire stations | No | Yes | Authorized | No |
| Manage firetrucks | No | Yes | Authorized | Status only |
| Manage water sources | No | Yes | Authorized | Field observation |
| Review severity recommendation | No | Yes | Yes | View only |
| Approve final severity | No | Authorized | Authorized | No |
| View dispatch recommendation | No | Yes | Yes | Assigned result |
| Assign firetruck | No | Authorized | Authorized | No |
| Update responder status | No | Monitor | Monitor | Yes |
| Request municipal assistance | No | Yes | Yes | Request through command |
| Accept assistance request | No | Yes | Monitor | No |
| Generate municipal reports | No | Yes | Yes | No |
| Generate provincial reports | No | No | Yes | No |
| Manage users and permissions | No | Authorized | Authorized | No |
| View audit logs | No | Limited | Authorized | No |
| Manage backups and configuration | No | Authorized | Authorized | No |

---

## 6. Core Incident Workflow

```text
Resident or Citizen Reporter Submits Report
                    ↓
System Identifies Municipality and Barangay
                    ↓
Municipal BFP Receives the Report
                    ↓
Manual Verification
        ┌───────────┼────────────┐
        ↓           ↓            ↓
    Confirmed    Rejected      False/Duplicate
        ↓
Official Incident Record Created
        ↓
Verified Incident Details Entered
        ↓
Preliminary Severity Recommendation
        ↓
BFP Personnel Approves or Changes Severity
        ↓
Smart Firetruck and Route Recommendation
        ↓
Municipal BFP Personnel Approves or Changes Assignment
        ↓
Firefighters Receive Mobile Assignment
        ↓
En Route → Arrived → Responding
        ↓
Assistance Requested When Required
        ↓
Contained → Cleared → Closed
        ↓
Timeline, Analytics, and Post-Incident Report
```

---

## 7. Suggested Technical Architecture

```text
Citizen Progressive Web Application
                │
Provincial and Municipal Web Dashboards
                │
Flutter Firefighter Mobile Application
                │
                ▼
        Central Backend API
                │
    ┌───────────┼────────────┐
    ▼           ▼            ▼
PostgreSQL   GIS Service   File Storage
 + PostGIS    and Routing   for Images
    │
    ▼
Analytics, Notifications, and Report Generation
```

### Recommended Technologies

- **Web application:** Next.js, React, TypeScript
- **User-interface styling:** Tailwind CSS
- **Mobile application:** Flutter and Dart
- **Backend:** TypeScript-based REST API
- **Database:** PostgreSQL with PostGIS
- **Version control:** Git and GitHub
- **Design:** Figma
- **Web deployment:** Vercel or an approved server platform
- **Mobile offline storage:** SQLite or another secure local database
- **Image storage:** Secure object or file storage service

---

## 8. Main Database Entities

### User and Access Entities

- Users
- Roles
- Permissions
- User Roles
- User Municipalities
- User Barangays
- Sessions
- Audit Logs

### Location Entities

- Provinces
- Municipalities
- Barangays
- Roads
- Landmarks
- Evacuation Areas
- Geographic Boundaries

### Resource Entities

- Fire Stations
- Firetrucks
- Firetruck Status History
- Crews
- Crew Assignments
- Water Sources
- Water-Source Verification Records

### Incident Entities

- Fire Reports
- Fire Incidents
- Incident Locations
- Incident Verifications
- Severity Assessments
- Incident Status History
- Incident Events
- Incident Attachments
- Field Observations

### Dispatch and Coordination Entities

- Dispatch Recommendations
- Dispatch Assignments
- Response Routes
- Assistance Requests
- Assistance Resources
- Responder Status Updates

### Supporting Entities

- Notifications
- Knowledge Articles
- Generated Reports
- Offline Synchronization Records
- System Configuration

---

## 9. Functional Requirements Summary

The system shall:

1. Allow residents or citizen reporters and authorized BFP users to submit fire reports.
2. Record incident GPS coordinates, landmarks, descriptions, contact details, and images.
3. Route reports to the responsible municipality.
4. Allow BFP personnel to verify reports manually.
5. Display incidents and response resources on a GIS map.
6. Store centralized incident and resource records.
7. Apply predefined rules for preliminary severity recommendations.
8. Allow authorized BFP personnel to approve or override recommendations.
9. Recommend suitable available firetrucks.
10. Recommend nearby verified water sources.
11. Recommend possible response routes.
12. Support firetruck and crew assignment.
13. Support inter-municipality assistance requests.
14. Provide role-based and location-based access restrictions.
15. Provide a mobile application for firefighters.
16. Support selected offline emergency functions.
17. Record an automatic incident timeline.
18. Produce analytics and operational reports.
19. Maintain a searchable BFP knowledge base.
20. Record security and activity audit logs.

---

## 10. Nonfunctional Requirements

### Security

- Passwords must be securely hashed.
- Access must be restricted by role, municipality, barangay, and incident assignment.
- Sensitive actions must be logged.
- Uploaded files must be validated.
- Sessions must expire after a defined period.

### Availability

- Core services should remain accessible during emergency operations.
- Backup and recovery procedures must be defined.
- The mobile application should support selected offline data.

### Performance

- Active incident maps should load within an acceptable period.
- Incident updates should appear with minimal delay under stable connectivity.
- Search and filtering should work with increasing incident records.

### Reliability

- Incident timestamps must be preserved.
- Duplicate reports and duplicate synchronization records must be controlled.
- Failed updates must be retried or clearly reported.

### Usability

- Emergency controls should be clear and easy to locate.
- Mobile buttons should be large enough for field use.
- Severity and status labels should use approved BFP terminology.

### Maintainability

- The system should use modular code.
- APIs and database structures should be documented.
- Decision-support rules should be configurable when practical.

---

## 11. Development Priority

### Minimum Viable Product

1. Authentication and access control
2. Municipality and barangay records
3. Citizen fire reporting
4. Manual report verification
5. GIS incident mapping
6. Fire station management
7. Firetruck management
8. Water-source management
9. Incident status tracking
10. Firetruck assignment
11. Automatic incident timeline
12. Basic dashboards and reports

### Second Release

1. Rule-based severity recommendation
2. Smart firetruck recommendation
3. Route recommendation
4. Nearby water-source recommendation
5. Inter-municipality assistance

### Third Release

1. Firefighter mobile application
2. Offline emergency mode
3. Offline synchronization
4. Field observations and photographs

### Final Release

1. Advanced analytics
2. Executive reports
3. Searchable knowledge base
4. Notifications
5. Enhanced audit and security monitoring

---

## 12. System Boundaries and Limitations

- The system does not automatically detect fire from uploaded images.
- The system does not replace BFP personnel or incident commanders.
- Fire-severity results are preliminary recommendations only.
- Dispatch recommendations require human approval.
- Route recommendations may not reflect temporary traffic, obstructions, flooding, or road construction.
- Offline data may be outdated until synchronization is completed.
- GIS accuracy depends on the quality of available coordinates, road data, boundaries, and verified resource records.
- Province-wide deployment should occur only after controlled pilot testing.

---

## 13. Expected Outputs

The completed application should provide:

- A working Citizen Emergency Reporting Application.
- A Provincial BFP Dashboard.
- Municipal BFP Dashboards.
- A Firefighter Mobile Application.
- A centralized and secured database.
- GIS-based incident and resource maps.
- Preliminary severity and dispatch recommendations.
- Inter-municipality coordination tools.
- Automatic incident timelines.
- Offline field functions.
- Response analytics and reports.
- Technical documentation and user manuals.

---

## 14. Conclusion

The proposed system combines fire reporting, GIS mapping, incident command, resource management, decision support, mobile field operations, and municipal coordination in one platform. Its purpose is to assist BFP personnel in organizing information and making informed emergency-response decisions. The system must preserve human authority, enforce strict access control, maintain reliable incident records, and be developed in manageable releases beginning with a functional minimum viable product.

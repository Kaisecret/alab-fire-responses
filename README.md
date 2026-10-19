# ALAB Fire Response

**A GIS-Based Provincial Inter-Municipal Fire Response and Decision Support System for BFP Antique**

## What is ALAB?

ALAB is a fire reporting and response coordination application for the Bureau of Fire Protection (BFP) in Antique. It connects residents, municipal fire stations, provincial BFP personnel, and field responders through a shared system for incident information.

Residents can report a fire with its location, description, and photographs. BFP personnel can review reports, locate incidents on a map, manage response resources, coordinate assistance, and track the response until an incident is closed.

The application combines a resident reporting interface, municipal and provincial web dashboards, and a mobile app for firefighters. Its Geographic Information System (GIS) maps show incidents alongside stations, water sources, and other information that helps personnel plan a response.

## What problem does it address?

Fire response requires several groups to work with the same information: where the fire is, what has been reported, which resources are available, who is responding, and whether more assistance is needed.

When those details are spread across phone calls, messages, and separate records, personnel can have difficulty maintaining a complete and current view of an incident. An unclear location, repeated report, missing resource update, or untracked assistance request can complicate coordination.

ALAB addresses these information and coordination problems by bringing reporting, mapping, resource records, and response updates into one application.

## How does ALAB help?

| Problem | How the application addresses it |
| --- | --- |
| A fire report has an unclear location or incomplete details. | Residents can provide GPS coordinates or a map pin, landmarks, a description, and photographs. |
| Reports need checking, and several people may report the same fire. | BFP personnel can review submitted information and identify duplicate reports linked to an incident. |
| Incident locations and response resources are difficult to compare. | GIS maps display incidents, fire stations, water sources, and suggested routes. |
| Personnel need to know which response resources are available. | The system maintains station, firetruck, personnel, availability, and assignment records. |
| An incident needs support from another station or municipality. | Assistance requests, acknowledgments, and coordination records help personnel track backup arrangements. |
| Municipal, provincial, and field personnel need updates. | Role-based dashboards and the responder app provide access to relevant incidents and response status. |
| Incident information is difficult to consolidate afterward. | Saved incident records, activity timelines, analytics, and report exports support review and documentation. |

## Who uses the application?

| User | Main purpose |
| --- | --- |
| Residents | Submit fire reports and follow their report status. |
| Municipal BFP personnel | Review local reports, manage incidents and resources, assign responders, and coordinate assistance. |
| Provincial BFP personnel | Monitor incidents and resources across Antique and oversee coordination between municipalities. |
| Firefighters and field responders | View assigned incidents, access maps and response information, and provide field updates through the mobile app. |

Each user receives access according to their role and authorized responsibilities.

## How does the response workflow work?

1. A resident submits a fire report with the available location and incident details. Authorized BFP personnel can also record incidents received by phone.
2. The system organizes the report and displays its location and available context.
3. Municipal BFP personnel review the report, check for duplicates, and manage the incident response.
4. Personnel use resource information and decision support to arrange firetrucks, stations, and responders.
5. Field responders access their assignments and provide response updates. Additional assistance can be coordinated when needed.
6. Provincial BFP personnel monitor incidents and coordination across municipalities.
7. BFP personnel record the incident outcome and retain its history for reporting and review.

## What does the decision support do?

ALAB helps personnel assess reported conditions and compare response options. Its decision support includes preliminary levels of danger, firetruck recommendations, nearby resources, and route guidance. Supported fire assessments use Analytic Hierarchy Process (AHP) scoring and predefined rules, depending on the fire type.

These outputs assist BFP personnel in making decisions. Personnel remain responsible for verifying reports, assessing actual conditions, and directing the response. Map and route information depends on the available data, and offline records may be outdated until refreshed.

## What is the project trying to achieve?

The project aims to make fire reporting clearer, incident information easier to access, and coordination between residents and BFP units more organized. It also aims to reduce repeated information gathering and provide a consistent record of response activities.

Its intended outcome is better information for the people managing an emergency. Actual effects on response time and operational performance need to be evaluated through testing and use with BFP personnel.

See the [system overview](BFP_Fire_Response_System_Overview.md) for detailed roles, modules, workflows, and project boundaries.

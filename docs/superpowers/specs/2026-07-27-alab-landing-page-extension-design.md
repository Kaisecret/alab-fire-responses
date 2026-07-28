# ALAB Public-Service Landing Page Extension Design

**Date:** July 27, 2026  
**Status:** Approved design, pending written-spec review  
**Scope:** Add a polished, scrollable public-service experience below the existing ALAB header and hero in `BFP/index.html`.

## Goal

Extend the existing ALAB hero into a complete public emergency-service landing page that helps residents and responders understand how the proposed GIS-Based Provincial Fire Response and Decision Support System works. The extension must translate the supplied capstone content into concise public-facing language and guide users toward the future fire-reporting application and responder portal.

## Non-Negotiable Constraint

The existing top of the page must remain visually and functionally unchanged. This includes the current:

- Header and navigation presentation
- Hero markup and content
- Hero CSS, image composition, sizing, and breakpoints
- Hero entrance animations and mobile menu behavior

Implementation may connect the existing fragment links to new section IDs below the hero. New lower-page styles and behavior must use new, scoped class names so they do not alter the existing header or hero.

## Audience and Tone

The primary audience is the public, barangay officials, firefighters, and BFP personnel in Antique. The page should feel like a trustworthy emergency-service website rather than an academic presentation.

Copy must be:

- Clear enough for residents to scan quickly
- Accurate about the system being decision support, not autonomous emergency command
- Focused on response, preparedness, coordination, and accountability
- Free of long thesis paragraphs, implementation jargon, and unsupported promises

## Visual Thesis

A calm, authoritative public-safety experience where warm cream surfaces and disciplined BFP red accents meet GIS-inspired route lines, coordinates, and map-grid details. The page should feel operational and human, not like a generic software dashboard.

The existing red, cream, white, and dark-navy palette remains the foundation. The extension will use generous spacing, strong typography, thin dividers, and a small number of large compositions instead of a repeated card grid.

## Content Plan

### 1. Antique at a Glance

Purpose: establish why the system matters using the supplied incident figures.

Content:

- 243 recorded fire incidents in Antique in 2025
- 20 incidents recorded from January to February 2026
- 28 incidents during the same period in 2025, presented as comparison context
- Grass fires reduced from 92 in 2024 to 4 in 2025
- Forest fires reduced from 23 in 2024 to 0 in 2025

Presentation: one wide editorial statistics composition with large numerals, short labels, and a restrained comparison treatment. A short introduction explains the province-wide challenge created by distance, road access, resource availability, and water-source limitations.

The figures must be described as supplied BFP-Antique data and must not be presented as live data.

### 2. From Report to Response

Purpose: explain the operational journey in plain language.

Sequence:

1. Report — a resident or authorized user provides location, landmark, description, and an image.
2. Verify — authorized BFP personnel review and confirm the report manually.
3. Assess — verified incident details produce a preliminary rule-based severity recommendation.
4. Dispatch — the system recommends suitable available firetrucks, routes, resources, and water sources.
5. Respond — firefighters receive assignments and field information, while municipalities coordinate assistance.
6. Document — the system records timestamps, status changes, observations, and post-incident information.

Presentation: a vertical response route with a highlighted active segment as the section enters the viewport. Each step uses a concise heading and one sentence. The layout becomes a simple stacked sequence on small screens.

### 3. Connected Response Capabilities

Purpose: summarize the system without reproducing all 17 source features as individual cards.

Four capability groups:

- Report and verify — real-time reporting, GPS details, image attachment, and manual validation.
- Locate and route — GIS incident mapping, fire stations, road data, evacuation areas, landmarks, and verified water sources.
- Dispatch and coordinate — rule-based severity support, firetruck recommendations, incident command, and inter-municipality assistance.
- Monitor and learn — automatic timelines, response analytics, reports, incident trends, and the searchable BFP knowledge base.

Presentation: four alternating editorial rows separated by fine rules. Each row has one simple inline SVG icon or CSS graphic, a short description, and a compact list of supporting functions.

Every reference to assessment, routing, dispatch, and coordination must make clear that the system recommends or supports decisions. Final decisions remain with authorized BFP personnel.

### 4. Access Built for Every Responder

Purpose: explain role-based and municipality-based access.

Roles:

- Residents submit essential incident details.
- Barangay officials manage information permitted for their assigned area.
- Municipal BFP personnel manage local incidents, stations, firetrucks, and water sources.
- Provincial BFP personnel monitor participating municipalities and province-wide resources.
- Firefighters receive assigned incident details, routes, tasks, landmarks, and field tools.

Presentation: a single shared-system diagram centered on ALAB, with role labels arranged around it on desktop and in a readable linear order on mobile. The composition must communicate controlled access rather than unrestricted data sharing.

### 5. Field Ready, Even Offline

Purpose: make the firefighter mobile application and offline emergency mode memorable.

Content:

- Assigned incident location and verified details
- Recommended route and nearby landmarks
- Verified water sources within the assigned municipality
- Locally stored status updates and observations
- Synchronization when connectivity returns

Presentation: a dark, high-contrast band with a phone-shaped interface abstraction built with HTML and CSS. Existing image assets may be reused only if they fit naturally and do not duplicate the unchanged hero composition.

The copy must explain that offline access depends on previously downloaded municipal data.

### 6. Report and Portal Connection

Purpose: provide a clear destination for the hero and navigation actions.

The section with `id="report"` will explain that the emergency reporting application will collect GPS location, landmark, description, and an image. It will provide a prominent future-application call-to-action without including a functioning report form in this scope.

The section will also contain a clear portal-access action associated with `id="login"` for authorized personnel. Links may remain non-submitting demonstration actions until their destination applications exist, but they must not misleadingly claim that a report or login has been completed.

### 7. Contact and Footer

Purpose: complete the landing page and make navigation destinations meaningful.

The footer will contain:

- ALAB identity and short system description
- Page links for incidents, resources, map, about, report, and portal access
- A contact area identifying the project and service context; omit phone, email, and address fields until real details are provided
- A concise decision-support disclaimer
- Project context identifying BFP in Antique

No unverified emergency telephone number, office address, or email address will be invented.

## Navigation and Anchor Mapping

The existing links will connect to these lower-page destinations:

- `#incidents` — Antique at a Glance
- `#resources` — Connected Response Capabilities
- `#map` — From Report to Response, with GIS and routing emphasized
- `#about` — Access Built for Every Responder
- `#contact` — Contact/footer area
- `#report` — Report connection panel
- `#login` — Authorized-personnel portal action

The existing `#home` destination remains unchanged.

## Interaction Thesis

Three restrained motion ideas will shape the lower page:

1. Section content will reveal through small opacity and vertical-position transitions using `IntersectionObserver`.
2. The response-journey line will fill progressively when its section becomes visible, reinforcing the report-to-response sequence.
3. Capability rows and calls to action will use subtle icon, underline, or directional movement on hover and keyboard focus.

All lower-page content must remain visible and usable if JavaScript is unavailable. The page will honor the existing `prefers-reduced-motion: reduce` behavior, and new animations will be disabled by the same preference.

## Architecture

The implementation remains self-contained:

- `BFP/index.html` contains semantic lower-page markup, scoped CSS, inline SVG icons, and a small enhancement script.
- `BFP/tests/landing.test.mjs` validates the new section structure, content contract, anchors, decision-support language, progressive enhancement, and responsive/reduced-motion hooks.
- No network-hosted fonts, icon libraries, frameworks, or third-party scripts are introduced.
- Existing image files remain untouched.

## Accessibility

The extension will:

- Use semantic sections and descriptive headings in a logical hierarchy
- Provide visible focus states for every interactive element
- Maintain readable color contrast
- Avoid encoding meaning through color alone
- Provide meaningful labels for diagrams and decorative-image handling
- Keep tap targets comfortably usable on mobile
- Preserve content order when responsive layouts collapse
- Keep all important content available without animation or JavaScript

## Responsive Behavior

Desktop layouts may use split compositions and wide editorial rows. Tablet layouts reduce decorative geometry and maintain readable line lengths. Mobile layouts become single-column, keep statistics legible without horizontal scrolling, simplify the response route, and preserve generous touch spacing.

The extension must not introduce horizontal overflow at 390px, 768px, 1280px, or 1680px viewport widths.

## Verification

Implementation is complete only after:

- The existing hero contract still passes unchanged.
- New landing-page contract tests pass.
- Every existing navigation fragment resolves to an element.
- The page contains no dead internal anchor targets.
- The supplied incident figures and decision-support limitations are stated accurately.
- Desktop, tablet, and mobile screenshots show a continuous composition with no overlap or horizontal overflow.
- The browser console reports no JavaScript errors.
- Lower-page content remains visible with JavaScript disabled.
- Reduced-motion mode removes decorative animation.

## Out of Scope

- A functional fire-report submission form
- Authentication or a working responder portal
- Live GIS maps, API calls, routing, or location services
- Live incident feeds
- Backend or database integration
- Automatic image analysis
- Invented contact or emergency-service information

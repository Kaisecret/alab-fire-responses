export type WebRoleKey = "resident" | "municipal-bfp" | "provincial-bfp";

export type ModuleAction = {
  label: string;
  href: string;
  description: string;
};

export type ModuleHighlight = {
  label: string;
  value: string;
  detail: string;
};

export type ModuleSection = {
  title: string;
  items: string[];
};

export type UserModuleDefinition = {
  key: WebRoleKey;
  role: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryActions: ModuleAction[];
  highlights: ModuleHighlight[];
  sections: ModuleSection[];
};

export const userModules = {
  resident: {
    key: "resident",
    role: "Resident or Citizen Reporter",
    eyebrow: "Citizen reporting module",
    title: "Report fires and follow submission status",
    description:
      "Residents can submit fire incident details, provide location information, upload supporting images, and check basic report progress when permitted.",
    primaryActions: [
      {
        label: "Submit fire report",
        href: "/resident/report",
        description:
          "Send location, landmark, description, contact details, and image.",
      },
      {
        label: "Check report status",
        href: "/resident/status",
        description: "Use a reference number to view allowed submission updates.",
      },
    ],
    highlights: [
      {
        label: "Access",
        value: "Public",
        detail: "Focused on fast emergency reporting.",
      },
      {
        label: "Location",
        value: "GPS or map pin",
        detail: "Supports precise incident location capture.",
      },
      {
        label: "Limit",
        value: "No dispatch control",
        detail: "BFP personnel make verification and response decisions.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "Submit a fire incident report.",
          "Provide GPS location or select a location on the map.",
          "Enter landmark, description, contact information, and image.",
          "Receive a report reference number.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Cannot verify or confirm incidents.",
          "Cannot assign firetrucks or responders.",
          "Cannot view confidential BFP operational information.",
        ],
      },
    ],
  },
  "municipal-bfp": {
    key: "municipal-bfp",
    role: "Municipal BFP Personnel",
    eyebrow: "Municipal operations module",
    title: "Manage local incidents, resources, and response coordination",
    description:
      "Municipal BFP personnel handle report verification, local incident records, resources, water sources, assignments, assistance requests, and municipal reports.",
    primaryActions: [
      {
        label: "Review reports",
        href: "/municipal-bfp/reports",
        description:
          "Verify submitted fire reports and create official incidents.",
      },
      {
        label: "Manage incidents",
        href: "/municipal-bfp/incidents",
        description: "Track severity, response status, assignments, and closure.",
      },
      {
        label: "Manage resources",
        href: "/municipal-bfp/firetrucks",
        description:
          "Maintain firetrucks, crews, stations, and water-source records.",
      },
    ],
    highlights: [
      {
        label: "Scope",
        value: "Assigned municipality",
        detail: "Access is limited to authorized municipal records.",
      },
      {
        label: "Authority",
        value: "Verification",
        detail: "Can confirm, reject, or mark reports as false or duplicate.",
      },
      {
        label: "Coordination",
        value: "Assistance requests",
        detail: "Can request and respond to inter-municipality support.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "Review submitted fire reports and contact reporters.",
          "Create official incident records from verified reports.",
          "Manage fire stations, firetrucks, crews, and verified water sources.",
          "Assign firetrucks and responders according to authorization.",
          "Generate municipal reports.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Can access only assigned municipality records.",
          "Can access another municipality only through authorized assistance coordination.",
          "Administrative and dispatch actions must be recorded in the audit log.",
        ],
      },
    ],
  },
  "provincial-bfp": {
    key: "provincial-bfp",
    role: "Provincial BFP Personnel",
    eyebrow: "Province-wide monitoring module",
    title: "Monitor incidents, resources, analytics, and coordination across Antique",
    description:
      "Provincial BFP personnel oversee province-wide incidents, municipal status, resource availability, assistance coordination, analytics, reports, and authorized system activity.",
    primaryActions: [
      {
        label: "View province incidents",
        href: "/provincial-bfp/incidents",
        description:
          "Monitor active and historical incidents across municipalities.",
      },
      {
        label: "Check resources",
        href: "/provincial-bfp/resources",
        description: "Review fire stations, firetrucks, and resource shortages.",
      },
      {
        label: "Open analytics",
        href: "/provincial-bfp/analytics",
        description: "Review trends, response times, and operational reports.",
      },
    ],
    highlights: [
      {
        label: "Scope",
        value: "Province-wide",
        detail: "Access follows official provincial authorization.",
      },
      {
        label: "Focus",
        value: "Monitoring",
        detail: "Tracks municipal incidents, resources, and assistance.",
      },
      {
        label: "Reports",
        value: "Provincial",
        detail: "Supports analytics and executive reporting.",
      },
    ],
    sections: [
      {
        title: "Main functions",
        items: [
          "View province-wide fire incidents and municipal status.",
          "Monitor fire station, firetruck, and resource information.",
          "Review inter-municipality assistance requests.",
          "Generate provincial analytics and reports.",
          "Review authorized system activity and coordination records.",
        ],
      },
      {
        title: "Access limitations",
        items: [
          "Province-wide access must follow official authorization.",
          "Changes to municipal records follow assigned permissions and policies.",
          "Administrative access must be logged and protected.",
        ],
      },
    ],
  },
} satisfies Record<WebRoleKey, UserModuleDefinition>;

export const userModuleKeys = Object.keys(userModules) as WebRoleKey[];

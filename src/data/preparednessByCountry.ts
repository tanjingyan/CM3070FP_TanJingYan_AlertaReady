export type EmergencyAction = 'call' | 'sms';

export type EmergencyService = {
  id: string;
  label: string;
  number: string;
  agency: string;
  description: string;
  action: EmergencyAction;
  sourceLabel: string;
  sourceUrl: string;
};

export type PreparednessSource = {
  label: string;
  url: string;
};

export type CountryPreparednessProfile = {
  code: string;
  name: string;
  emergencyServices: EmergencyService[];
  localEvacuationNotes?: string[];
  sources: PreparednessSource[];
  coverageNote: string;
};

export const REGION_OPTIONS = [
  { code: 'AUTO', name: 'Use detected location' },
  { code: 'SG', name: 'Singapore' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'EU', name: 'European Union / EEA travel' },
  { code: 'GLOBAL', name: 'Other / Global guidance' },
] as const;

const EU_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

const PROFILES: Record<string, CountryPreparednessProfile> = {
  SG: {
    code: 'SG',
    name: 'Singapore',
    emergencyServices: [
      {
        id: 'sg-scdf-995',
        label: 'Fire / Emergency Ambulance',
        number: '995',
        agency: 'Singapore Civil Defence Force (SCDF)',
        description:
          'For fires and life-threatening medical emergencies.',
        action: 'call',
        sourceLabel: 'SCDF Emergency Medical Services',
        sourceUrl:
          'https://www.scdf.gov.sg/home/about-scdf/emergency-medical-services',
      },
      {
        id: 'sg-spf-999',
        label: 'Police Emergency',
        number: '999',
        agency: 'Singapore Police Force (SPF)',
        description:
          'For immediate Police assistance.',
        action: 'call',
        sourceLabel: 'Singapore Police Force',
        sourceUrl:
          'https://www.police.gov.sg/contact-us',
      },
      {
        id: 'sg-scdf-70995',
        label: 'SCDF Emergency SMS',
        number: '70995',
        agency: 'Singapore Civil Defence Force (SCDF)',
        description:
          'Emergency SMS for people who are deaf, hard-of-hearing or have speech impairment.',
        action: 'sms',
        sourceLabel: 'SCDF Emergency Medical Services',
        sourceUrl:
          'https://www.scdf.gov.sg/home/about-scdf/emergency-medical-services',
      },
      {
        id: 'sg-spf-70999',
        label: 'Police Emergency SMS',
        number: '70999',
        agency: 'Singapore Police Force (SPF)',
        description:
          'For urgent Police assistance when it is unsafe to call or the user cannot speak.',
        action: 'sms',
        sourceLabel: 'SPF SMS 70999',
        sourceUrl:
          'https://www.police.gov.sg/SMS-70999',
      },
    ],
    localEvacuationNotes: [
      'For a building fire, follow SCDF and building emergency instructions.',
      'Do not treat a personal route saved in Alerta Ready as an official evacuation order.',
    ],
    sources: [
      {
        label: 'SCDF emergency guidance',
        url:
          'https://www.scdf.gov.sg/home/about-scdf/emergency-medical-services',
      },
      {
        label: 'Singapore Police Force',
        url: 'https://www.police.gov.sg/contact-us',
      },
    ],
    coverageNote:
      'Official Singapore emergency numbers are included. Local evacuation instructions can vary by incident and building.',
  },

  US: {
    code: 'US',
    name: 'United States',
    emergencyServices: [
      {
        id: 'us-911',
        label: 'Emergency',
        number: '911',
        agency: 'National 911 Program',
        description:
          'For immediate Police, Fire or Emergency Medical assistance.',
        action: 'call',
        sourceLabel: '911.gov',
        sourceUrl: 'https://www.911.gov/calling-911/',
      },
    ],
    sources: [
      {
        label: '911.gov',
        url: 'https://www.911.gov/calling-911/',
      },
      {
        label: 'Ready.gov evacuation',
        url: 'https://www.ready.gov/evacuation',
      },
    ],
    coverageNote:
      '911 is the national emergency number. Evacuation details are issued by state and local authorities.',
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    emergencyServices: [
      {
        id: 'gb-999',
        label: 'Emergency',
        number: '999',
        agency: 'UK Emergency Services',
        description:
          'National emergency number for Police, Fire, Ambulance and Coastguard.',
        action: 'call',
        sourceLabel: 'GOV.UK 999 and 112 guidance',
        sourceUrl:
          'https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers',
      },
      {
        id: 'gb-112',
        label: 'Emergency',
        number: '112',
        agency: 'UK Emergency Services',
        description:
          'Alternative national emergency number connecting to the same emergency services.',
        action: 'call',
        sourceLabel: 'GOV.UK 999 and 112 guidance',
        sourceUrl:
          'https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers',
      },
    ],
    sources: [
      {
        label: 'GOV.UK emergency numbers',
        url:
          'https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers',
      },
    ],
    coverageNote:
      '999 and 112 are national emergency numbers. Local evacuation instructions depend on the incident and local authority.',
  },

  AU: {
    code: 'AU',
    name: 'Australia',
    emergencyServices: [
      {
        id: 'au-000',
        label: 'Emergency',
        number: '000',
        agency: 'Triple Zero',
        description:
          'For life-threatening or time-critical Police, Fire or Ambulance emergencies.',
        action: 'call',
        sourceLabel: 'Australian Triple Zero',
        sourceUrl: 'https://www.triplezero.gov.au/',
      },
      {
        id: 'au-112',
        label: 'Mobile Emergency',
        number: '112',
        agency: 'Australian Emergency Call Service',
        description:
          'Secondary emergency number available from most mobile phones in Australia.',
        action: 'call',
        sourceLabel: 'Australian Triple Zero',
        sourceUrl:
          'https://www.triplezero.gov.au/triple-zero/other-emergency-numbers',
      },
    ],
    sources: [
      {
        label: 'Australian Triple Zero',
        url: 'https://www.triplezero.gov.au/',
      },
    ],
    coverageNote:
      '000 is Australia’s primary emergency number. Evacuation instructions are often issued by state or territory authorities.',
  },

  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    emergencyServices: [
      {
        id: 'nz-111',
        label: 'Emergency',
        number: '111',
        agency: 'New Zealand Emergency Services',
        description:
          'For an emergency response from Police, Fire or Ambulance.',
        action: 'call',
        sourceLabel: 'New Zealand Police',
        sourceUrl: 'https://www.police.govt.nz/call-111',
      },
    ],
    sources: [
      {
        label: 'New Zealand Police 111',
        url: 'https://www.police.govt.nz/call-111',
      },
    ],
    coverageNote:
      '111 connects to Police, Fire or Ambulance. Follow Civil Defence and local authority instructions for evacuation.',
  },

  EU: {
    code: 'EU',
    name: 'European Union',
    emergencyServices: [
      {
        id: 'eu-112',
        label: 'European Emergency Number',
        number: '112',
        agency: 'European Union Emergency Services',
        description:
          'Available free of charge throughout the EU for Police, Ambulance and Fire services.',
        action: 'call',
        sourceLabel: 'European Commission',
        sourceUrl:
          'https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm',
      },
    ],
    sources: [
      {
        label: 'European Commission 112',
        url:
          'https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm',
      },
    ],
    coverageNote:
      '112 works throughout the EU. Some countries also operate national emergency numbers.',
  },

  GLOBAL: {
    code: 'GLOBAL',
    name: 'Global',
    emergencyServices: [],
    sources: [
      {
        label: 'IFRC family preparedness',
        url:
          'https://www.ifrc.org/document/prepare-your-family-and-home-pape-messages',
      },
    ],
    coverageNote:
      'Country-specific emergency numbers are not configured for this region. Confirm emergency numbers with the relevant local authority.',
  },
};

export const GLOBAL_DOCUMENT_CHECKLIST = [
  {
    id: 'identity',
    title: 'Identification documents',
    description:
      'Prepare protected copies of essential identity documents used in your country.',
  },
  {
    id: 'insurance',
    title: 'Insurance information',
    description:
      'Keep the policies or reference information you may need after an emergency.',
  },
  {
    id: 'housing',
    title: 'Housing / property records',
    description:
      'Prepare essential tenancy, ownership or property records where relevant.',
  },
  {
    id: 'medical',
    title: 'Medical information and prescriptions',
    description:
      'Keep the information needed to communicate important medical needs.',
  },
  {
    id: 'financial',
    title: 'Essential financial records',
    description:
      'Prepare the records needed for recovery while protecting sensitive account details.',
  },
  {
    id: 'contacts',
    title: 'Emergency contact list',
    description:
      'Keep important family, caregiver and emergency contact details accessible.',
  },
];

export const GLOBAL_DOCUMENT_SOURCES: PreparednessSource[] = [
  {
    label: 'Ready.gov financial preparedness',
    url: 'https://www.ready.gov/financial-preparedness',
  },
  {
    label: 'IFRC family preparedness',
    url:
      'https://www.ifrc.org/document/prepare-your-family-and-home-pape-messages',
  },
];

export const GLOBAL_EVACUATION_GUIDANCE = [
  'Identify a safe destination or shelter before an emergency.',
  'Plan a primary route and at least one alternative route.',
  'Decide how household members will travel and where they will meet if separated.',
  'Practise the plan when practical and update it when circumstances change.',
  'Follow official evacuation warnings and do not return until local authorities say it is safe.',
];

export const GLOBAL_EVACUATION_SOURCES: PreparednessSource[] = [
  {
    label: 'IFRC public preparedness guidance',
    url:
      'https://www.ifrc.org/sites/default/files/PAPE-2.0-English.pdf',
  },
  {
    label: 'IFRC family safety planning',
    url:
      'https://www.ifrc.org/document/prepare-your-family-and-home-pape-messages',
  },
];

export function normalizeCountryCode(
  countryCode?: string | null
) {
  return String(countryCode ?? '')
    .trim()
    .toUpperCase();
}

export function getPreparednessProfile(
  countryCode?: string | null,
  detectedCountryName?: string | null
): CountryPreparednessProfile {
  const normalized = normalizeCountryCode(countryCode);

  if (PROFILES[normalized]) {
    return PROFILES[normalized];
  }

  if (EU_COUNTRY_CODES.has(normalized)) {
    return {
      ...PROFILES.EU,
      code: normalized,
      name: detectedCountryName || PROFILES.EU.name,
    };
  }

  return {
    ...PROFILES.GLOBAL,
    code: normalized || 'GLOBAL',
    name: detectedCountryName || 'Global',
  };
}

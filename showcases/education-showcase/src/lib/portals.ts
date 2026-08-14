import { assetPath } from '@/lib/base-path';

/**
 * The three portal identities. One Next.js application serves three
 * subpaths, and each subpath presents itself as its own product: own name,
 * logo, palette and layout. The Ministry of Education exists only behind
 * the scenes: enrolment, issuance and revocation processing run
 * automatically in the registry. The palettes live here; the layout and typography
 * differences live in each portal's stylesheet and shell component.
 *
 * All organisations are fictional.
 */

export type PortalId = 'education' | 'school' | 'civicworks';

export type PortalConfig = {
  id: PortalId;
  /** The product name shown in the header. */
  name: string;
  /** The organisation behind the portal. */
  organisation: string;
  tagline: string;
  logo: string;
  /** The Better Auth role allowed into this portal. */
  role: 'learner' | 'school_officer' | 'employer_verifier';
  loginPath: string;
  homePath: string;
  /** Brand palette injected as CSS variables by the portal layout. */
  brand: Record<string, string>;
  footer: string;
};

export const PORTALS: Record<PortalId, PortalConfig> = {
  education: {
    id: 'education',
    name: 'National Education Portal',
    organisation: 'Government Education Services',
    tagline: 'Enrolment, credentials and lifelong learning in one place',
    logo: assetPath('/portals/education/logo.svg'),
    role: 'learner',
    loginPath: '/education/login',
    homePath: '/education/home',
    brand: {
      brand: '#1d4e89',
      'brand-dark': '#143a66',
      'brand-soft': '#e8f0fa',
      accent: '#f2b134',
      surface: '#f7f9fc',
      card: '#ffffff',
      ink: '#1a2733',
      muted: '#5b6b7a',
      line: '#d8e0e9',
    },
    footer:
      'National Education Portal is a fictional government service built for the ITU/Giga education wallet showcase.',
  },
  school: {
    id: 'school',
    name: 'Riverside Admissions',
    organisation: 'Riverside Secondary School',
    tagline: 'Admissions office workbench',
    logo: assetPath('/portals/school/logo.svg'),
    role: 'school_officer',
    loginPath: '/school/login',
    homePath: '/school/queue',
    brand: {
      brand: '#2e7d4f',
      'brand-dark': '#215c3a',
      'brand-soft': '#e9f5ee',
      accent: '#e0a83d',
      surface: '#f6f8f4',
      card: '#ffffff',
      ink: '#22301f',
      muted: '#63705f',
      line: '#d9e2d4',
    },
    footer: 'Riverside Secondary School is a fictional institution. Sandbox data only.',
  },
  civicworks: {
    id: 'civicworks',
    name: 'CivicWorks Careers',
    organisation: 'CivicWorks AB',
    tagline: 'Apply with the qualifications in your wallet',
    logo: assetPath('/portals/civicworks/logo.svg'),
    role: 'employer_verifier',
    loginPath: '/civicworks',
    homePath: '/civicworks',
    brand: {
      brand: '#0e7c7b',
      'brand-dark': '#0a5958',
      'brand-soft': '#e6f4f4',
      accent: '#ff6b4a',
      surface: '#fafbfc',
      card: '#ffffff',
      ink: '#17252a',
      muted: '#5f7078',
      line: '#dde5e8',
    },
    footer: 'CivicWorks AB is a fictional employer. Verification results come from the OWS sandbox.',
  },
};

export function portalByRole(role: string): PortalConfig | undefined {
  return Object.values(PORTALS).find((p) => p.role === role);
}

/** The portal palette as CSS custom properties for an inline style attribute. */
export function brandVars(portal: PortalConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(portal.brand)) {
    vars[`--${key}`] = value;
  }
  return vars;
}

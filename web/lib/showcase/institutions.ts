/**
 * The fictional institutions of the showcase, with their sandbox Education
 * Service Registry references. Static data: the old per-deployment SQLite
 * seed became this module when the demo state moved into the browser.
 */

export type Institution = {
  id: string;
  name: string;
  kind: "school" | "ministry" | "employer";
  esrRef: string;
};

export const INSTITUTIONS: Institution[] = [
  {
    id: "ins-riverside",
    name: "Riverside Secondary School",
    kind: "school",
    esrRef: "ESR-SCH-0042",
  },
  { id: "ins-moe", name: "Ministry of Education", kind: "ministry", esrRef: "ESR-MOE-0001" },
  { id: "ins-civicworks", name: "CivicWorks AB", kind: "employer", esrRef: "ESR-EMP-0117" },
];

export function getInstitutions(kind?: Institution["kind"]): Institution[] {
  return kind ? INSTITUTIONS.filter((i) => i.kind === kind) : INSTITUTIONS;
}

export function getInstitution(id: string): Institution | undefined {
  return INSTITUTIONS.find((i) => i.id === id);
}

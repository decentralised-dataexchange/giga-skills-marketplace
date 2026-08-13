/**
 * The CivicWorks job board: fictional postings. Applying to a posting means
 * proving your qualification from your wallet; the diploma requirement is
 * what the OpenID4VP request checks.
 */

export type Job = {
  slug: string;
  title: string;
  team: string;
  location: string;
  type: string;
  salary: string;
  tags: string[];
  blurb: string;
  requirement: string;
};

export const JOBS: Job[] = [
  {
    slug: 'junior-analyst',
    title: 'Junior Analyst, Public Services',
    team: 'Analytics',
    location: 'Stockholm',
    type: 'Full time',
    salary: 'SEK 34 000–39 000/month',
    tags: ['SQL', 'Dashboards', 'Public sector'],
    blurb:
      'Turn public service data into decisions. You will build reports and dashboards for city programmes.',
    requirement: 'Upper secondary diploma (verified from your wallet)',
  },
  {
    slug: 'service-designer',
    title: 'Service Designer',
    team: 'Design',
    location: 'Stockholm · Hybrid',
    type: 'Full time',
    salary: 'SEK 42 000–48 000/month',
    tags: ['Research', 'Prototyping', 'Accessibility'],
    blurb:
      'Design citizen services people actually understand. Field research, prototypes and accessible flows.',
    requirement: 'Upper secondary diploma (verified from your wallet)',
  },
  {
    slug: 'operations-coordinator',
    title: 'Operations Coordinator',
    team: 'Operations',
    location: 'Gothenburg',
    type: 'Full time',
    salary: 'SEK 31 000–35 000/month',
    tags: ['Scheduling', 'Logistics'],
    blurb:
      'Keep our field teams moving: schedules, suppliers and the thousand small things that make projects run.',
    requirement: 'Upper secondary diploma (verified from your wallet)',
  },
  {
    slug: 'data-engineer-intern',
    title: 'Data Engineering Intern',
    team: 'Analytics',
    location: 'Remote (Sweden)',
    type: 'Internship · 6 months',
    salary: 'SEK 22 000/month',
    tags: ['Python', 'Pipelines'],
    blurb:
      'Learn to build data pipelines alongside senior engineers on real municipal data.',
    requirement: 'Upper secondary diploma (verified from your wallet)',
  },
];

export function getJob(slug: string | undefined): Job {
  return JOBS.find((job) => job.slug === slug) ?? JOBS[0];
}

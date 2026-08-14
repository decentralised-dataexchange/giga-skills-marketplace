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
  about: string;
  responsibilities: string[];
  offer: string[];
};

export const JOBS: Job[] = [
  {
    slug: "junior-analyst",
    title: "Junior Analyst, Public Services",
    team: "Analytics",
    location: "Stockholm",
    type: "Full time",
    salary: "SEK 34 000-39 000/month",
    tags: ["SQL", "Dashboards", "Public sector"],
    blurb:
      "Turn public service data into decisions. You will build reports and dashboards for city programmes.",
    requirement: "Upper secondary diploma (verified from your wallet)",
    about:
      "You will join a small analytics team that helps cities understand how their services perform. Expect real data, real stakeholders and short feedback loops.",
    responsibilities: [
      "Build and maintain dashboards for city programmes",
      "Turn messy service data into clear weekly reports",
      "Work with programme leads to define useful metrics",
      "Present findings in plain language",
    ],
    offer: [
      "A senior mentor and a real analytics roadmap",
      "Hybrid work and flexible hours",
      "Six weeks of paid vacation",
      "Annual learning budget",
    ],
  },
  {
    slug: "service-designer",
    title: "Service Designer",
    team: "Design",
    location: "Stockholm · Hybrid",
    type: "Full time",
    salary: "SEK 42 000-48 000/month",
    tags: ["Research", "Prototyping", "Accessibility"],
    blurb:
      "Design citizen services people actually understand. Field research, prototypes and accessible flows.",
    requirement: "Upper secondary diploma (verified from your wallet)",
    about:
      "You will design citizen services end to end: from field research with residents to prototypes the delivery teams can build. Accessibility is a requirement, not an afterthought.",
    responsibilities: [
      "Plan and run research with residents and case workers",
      "Turn findings into journeys, prototypes and specifications",
      "Run usability and accessibility testing",
      "Coach delivery teams on service patterns",
    ],
    offer: [
      "A design team that ships, not just presents",
      "Hybrid work and flexible hours",
      "Conference budget and community time",
      "Six weeks of paid vacation",
    ],
  },
  {
    slug: "operations-coordinator",
    title: "Operations Coordinator",
    team: "Operations",
    location: "Gothenburg",
    type: "Full time",
    salary: "SEK 31 000-35 000/month",
    tags: ["Scheduling", "Logistics"],
    blurb:
      "Keep our field teams moving: schedules, suppliers and the thousand small things that make projects run.",
    requirement: "Upper secondary diploma (verified from your wallet)",
    about:
      "You will keep our field teams moving: schedules, suppliers, equipment and the thousand small things that make projects run on time.",
    responsibilities: [
      "Plan field team schedules and site visits",
      "Manage supplier orders and deliveries",
      "Keep project trackers and budgets current",
      "Spot problems before they become delays",
    ],
    offer: [
      "A tight-knit operations team",
      "Overtime always compensated",
      "Wellness allowance",
      "Six weeks of paid vacation",
    ],
  },
  {
    slug: "data-engineer-intern",
    title: "Data Engineering Intern",
    team: "Analytics",
    location: "Remote (Sweden)",
    type: "Internship · 6 months",
    salary: "SEK 22 000/month",
    tags: ["Python", "Pipelines"],
    blurb: "Learn to build data pipelines alongside senior engineers on real municipal data.",
    requirement: "Upper secondary diploma (verified from your wallet)",
    about:
      "You will learn to build data pipelines alongside senior engineers, on real municipal data, with code review on everything you write.",
    responsibilities: [
      "Build and test data pipelines in Python",
      "Write documentation other people can follow",
      "Join code reviews and architecture discussions",
      "Ship one real pipeline to production",
    ],
    offer: [
      "A named mentor and a real project",
      "Remote-first with quarterly meetups",
      "Paid at SEK 22 000/month",
      "A conversion path to a full-time role",
    ],
  },
];

export function getJob(slug: string | undefined): Job {
  return JOBS.find((job) => job.slug === slug) ?? JOBS[0];
}

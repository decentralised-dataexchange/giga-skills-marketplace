import Link from "next/link";

import { CivicworksShell } from "@/components/showcase/civicworks-shell";
import { ApplicationForm } from "@/components/showcase/application-form";
import { getJob } from "@/lib/showcase/jobs";

/**
 * The job detail and application page, candidate perspective: a full role
 * description next to the application card. The candidate fills the form
 * manually with a PDF, or with one wallet presentation (PID + diploma),
 * reviews it, and submits when satisfied.
 */
export default async function CivicworksApply({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job: jobSlug } = await searchParams;
  const job = getJob(jobSlug);

  return (
    <CivicworksShell>
      <p className="cw-crumb">
        <Link href="/showcase/civicworks">← All openings</Link>
      </p>
      <h1>{job.title}</h1>
      <p className="cw-job-meta">
        {job.team} · {job.location} · {job.type} · {job.salary}
      </p>
      <div className="cw-job-tags" style={{ marginTop: "0.6rem" }}>
        {job.tags.map((tag) => (
          <span key={tag} className="cw-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="cw-apply-grid">
        <div className="cw-detail">
          <section>
            <h2>About the role</h2>
            <p>{job.about}</p>
          </section>
          <section>
            <h2>What you will do</h2>
            <ul>
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>What we offer</h2>
            <ul>
              {job.offer.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Requirements</h2>
            <p>{job.requirement}.</p>
          </section>
        </div>

        <ApplicationForm job={job} />
      </div>
    </CivicworksShell>
  );
}

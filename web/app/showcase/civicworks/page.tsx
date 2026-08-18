import Link from "next/link";

import { CivicworksShell } from "@/components/showcase/civicworks-shell";
import { JOBS } from "@/lib/showcase/jobs";

/**
 * The CivicWorks job board, candidate perspective: open roles, and applying
 * means proving your qualification straight from your wallet.
 */
export default function CivicworksCareers() {
  return (
    <CivicworksShell>
      <section className="cw-hero">
        <h1>Find your next role at CivicWorks</h1>
        <p className="cw-lede">
          {JOBS.length} open positions. We hire on verified qualifications, not photocopies: apply
          with the diploma in your own wallet, share five fields only, and keep everything else
          private.
        </p>
      </section>

      <div className="cw-jobs">
        {JOBS.map((job, index) => (
          <article key={job.slug} className="cw-job">
            <div className="cw-job-main">
              <h2>{job.title}</h2>
              <p className="cw-job-meta">
                {job.team} · {job.location} · {job.type} · {job.salary}
              </p>
              <p className="cw-job-blurb">{job.blurb}</p>
              <p className="cw-job-req">Requires: {job.requirement}</p>
              <div className="cw-job-tags">
                {job.tags.map((tag) => (
                  <span key={tag} className="cw-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="cw-job-apply">
              <Link
                className={index === 0 ? "cw-pill hint-pulse" : "cw-pill"}
                href={`/showcase/civicworks/verify?job=${job.slug}`}
              >
                Apply now
              </Link>
            </div>
          </article>
        ))}
      </div>
    </CivicworksShell>
  );
}

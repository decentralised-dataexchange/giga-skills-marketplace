"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { auditTimeline, verifyAuditChain } from "@/lib/showcase/audit";
import { useShowcaseStore } from "@/lib/showcase/use-store";

import "./audit.css";

/**
 * The registry audit trail, shown as part of the showcase rather than
 * inside a portal: the registry operates without a staff console, so this
 * page is the demonstration's window into the automatic processing. The
 * trail records this browser's own demo run.
 */

function DetailList({ payload }: { payload: string }) {
  let entries: [string, unknown][] = [];
  try {
    entries = Object.entries(JSON.parse(payload) as Record<string, unknown>);
  } catch {
    entries = [];
  }
  if (entries.length === 0) return <span className="adt-detail-empty">-</span>;
  return (
    <dl className="adt-detail">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditTrail() {
  const state = useShowcaseStore();
  const events = auditTimeline(state.audit, 100);
  const [broken, setBroken] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyAuditChain(state.audit).then((result) => {
      if (!cancelled) setBroken(result);
    });
    return () => {
      cancelled = true;
    };
  }, [state.audit]);

  return (
    <main className="adt">
      <Link className="adt-back" href="/showcase">
        ← Back to the showcase
      </Link>
      <p className="adt-kicker">National Learner Registry</p>
      <h1>Registry audit trail</h1>
      <p className="adt-intro">
        The append-only record of every consequential action in this browser&apos;s demo run:
        registrations, document validations, the automatic enrolment and issuance processing,
        payments, verifications and revocations. Rows are chained with SHA-256 hashes; the chain is{" "}
        {broken === null ? (
          <strong style={{ color: "var(--ok)" }}>intact</strong>
        ) : (
          <strong style={{ color: "var(--bad)" }}>broken at #{broken}</strong>
        )}
        .
      </p>
      <div className="adt-panel">
        {events.length === 0 ? (
          <p className="adt-empty">No audit events yet.</p>
        ) : (
          <table className="adt-table">
            <thead>
              <tr>
                <th className="adt-num">#</th>
                <th>Time (UTC)</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const [date, time] = event.createdAt.slice(0, 19).split("T");
                return (
                  <tr key={event.seq}>
                    <td className="adt-num">{event.seq}</td>
                    <td className="adt-time">
                      <span>{date}</span>
                      <small>{time}</small>
                    </td>
                    <td>
                      <span className="adt-role-chip">{event.actorRole.replace(/_/g, " ")}</span>
                    </td>
                    <td className="adt-action">{event.action}</td>
                    <td className="adt-subject">
                      <small>{event.subjectType}</small>
                      <code>{event.subjectId}</code>
                    </td>
                    <td>
                      <DetailList payload={event.payload} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

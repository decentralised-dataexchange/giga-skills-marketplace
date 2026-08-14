'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, FileText, Wallet } from 'lucide-react';

import { Drawer } from '@/components/Drawer';
import { assetPath } from '@/lib/base-path';
import { WalletInvite } from '@/components/WalletInvite';
import { useExchangeStatus } from '@/components/useExchangeStatus';
import {
  readApplicationData,
  startApplicationRequest,
  submitJobApplication,
} from '@/app/civicworks/verify/actions';
import type { VerificationResult } from '@/lib/verification';
import type { Job } from '@/lib/jobs';

const CLAIM_LABELS: Record<string, string> = {
  learnerName: 'Name on diploma',
  qualificationName: 'Qualification',
  qualificationCode: 'Qualification code',
  awardingInstitution: 'Awarding institution',
  awardDate: 'Award date',
};

type Evidence =
  | { kind: 'wallet'; result: VerificationResult }
  | { kind: 'pdf'; name: string; url: string };

/**
 * The application card: the candidate fills the form manually and uploads a
 * PDF, or fills it with one EUDI Wallet presentation (PID for the personal
 * fields, diploma as the evidence). Nothing submits automatically: the
 * filled form is the review, the evidence opens in a wide drawer, and the
 * candidate submits when satisfied. The success screen is generic.
 */
export function ApplicationForm({ job }: { job: Job }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [walletRequest, setWalletRequest] = useState<{
    exchangeId: string;
    qrUri: string;
  } | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletFilled, setWalletFilled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const beginWalletFill = useCallback(async () => {
    setWalletBusy(true);
    setError(null);
    try {
      setWalletRequest(await startApplicationRequest());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setWalletBusy(false);
    }
  }, []);

  const onWalletEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      const topic = typeof payload.topic === 'string' ? payload.topic : '';
      if (
        topic !== 'digitalwallet.presentation.verified' &&
        topic !== 'openid.presentation.presentation_acked.v3'
      ) {
        return;
      }
      const exchangeId = walletRequest?.exchangeId;
      if (!exchangeId) return;
      const result = await readApplicationData(exchangeId);
      setWalletRequest(null);
      if (!result || !result.verified) {
        setError(
          'The credentials could not be verified. You can try again, or fill the form yourself and upload evidence.'
        );
        return;
      }
      const fullName =
        [result.pid.givenName, result.pid.familyName].filter(Boolean).join(' ') ||
        result.claims.learnerName ||
        '';
      setName(fullName);
      if (result.pid.email) setEmail(result.pid.email);
      setEvidence({ kind: 'wallet', result });
      setWalletFilled(true);
    },
    [walletRequest]
  );

  useExchangeStatus(walletRequest?.exchangeId ?? null, onWalletEvent);

  function onPdfPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEvidence({ kind: 'pdf', name: file.name, url: URL.createObjectURL(file) });
  }

  async function submit() {
    if (!name || !email) {
      setError('Please give at least your name and email.');
      return;
    }
    if (!evidence) {
      setError('Please attach evidence: fill with your wallet or upload a PDF.');
      return;
    }
    setError(null);
    await submitJobApplication({
      jobSlug: job.slug,
      evidence: evidence.kind,
      exchangeId: evidence.kind === 'wallet' ? evidence.result.exchangeId : undefined,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <aside className="cw-apply-card cw-apply-success">
        <CheckCircle2 size={40} color="var(--ok)" />
        <h2>Application submitted</h2>
        <p className="cw-apply-note">
          Thank you for applying for {job.title}. We have received your
          application and our team will be in touch.
        </p>
      </aside>
    );
  }

  return (
    <aside className="cw-apply-card">
      <h2>Your application</h2>

      {walletRequest ? (
        <div style={{ marginTop: '1rem' }}>
          <WalletInvite
            uri={walletRequest.qrUri}
            logo="/portals/civicworks/logo.svg"
            hint="Scan with the EUDI Wallet on your phone and share your PID and diploma. The PID fills your details; the diploma is your evidence."
            onRefresh={beginWalletFill}
          />
          <button
            type="button"
            className="cw-linklike"
            onClick={() => setWalletRequest(null)}
          >
            Cancel and fill the form myself
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="cw-pill cw-wallet-fill"
            onClick={beginWalletFill}
            disabled={walletBusy}
          >
            <Wallet size={15} />
            {walletBusy ? 'Preparing…' : 'Fill with your EUDI Wallet'}
          </button>
          <p className="cw-apply-note" style={{ marginTop: '0.5rem' }}>
            Your PID fills the details below; your diploma is attached as
            evidence. Or fill the form yourself and upload a PDF.
          </p>

          <form onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              <span>Phone (optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span>Message (optional)</span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
          </form>

          <div className="cw-apply-divider" />
          <h3>Evidence of qualification</h3>
          {evidence ? (
            <button
              type="button"
              className="cw-evidence"
              onClick={() => setDrawerOpen(true)}
            >
              <FileText size={16} />
              <span className="cw-evidence-text">
                <strong>
                  {evidence.kind === 'wallet'
                    ? 'Diploma attestation from your wallet'
                    : evidence.name}
                </strong>
                <small>
                  {evidence.kind === 'wallet'
                    ? walletFilled
                      ? 'Verified: trusted issuer, valid signature, not revoked. Click to preview.'
                      : 'Click to preview.'
                    : 'Uploaded PDF. Click to preview.'}
                </small>
              </span>
            </button>
          ) : (
            <>
              <p className="cw-apply-note">
                {job.requirement}. Attach it from your wallet with the button
                above, or upload a PDF.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                onChange={onPdfPicked}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="cw-pill"
                data-variant="ghost"
                onClick={() => fileInput.current?.click()}
              >
                Upload evidence PDF
              </button>
            </>
          )}

          {error ? <p className="login-error">{error}</p> : null}

          <button type="button" className="cw-pill cw-submit" onClick={submit}>
            Submit application
          </button>
        </>
      )}

      {drawerOpen && evidence ? (
        <Drawer
          title="Evidence of qualification"
          width={680}
          onClose={() => setDrawerOpen(false)}
          footer={
            <button type="button" onClick={() => setDrawerOpen(false)}>
              Close
            </button>
          }
        >
          {evidence.kind === 'pdf' ? (
            <embed
              src={evidence.url}
              type="application/pdf"
              style={{ width: '100%', height: '75vh', borderRadius: 8 }}
            />
          ) : (
            <div className="cw-attestation">
              <div className="cw-attestation-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetPath('/portals/moe/logo.svg')} alt="" />
                <div>
                  <strong>National Diploma</strong>
                  <small>Issued by the Ministry of Education</small>
                </div>
                <span className="integration-badge real">Verified</span>
              </div>
              <table>
                <tbody>
                  {Object.entries(CLAIM_LABELS).map(([key, label]) =>
                    evidence.result.claims[key] ? (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{evidence.result.claims[key]}</td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
              <ul>
                {evidence.result.checks.map((check) => (
                  <li
                    key={check.name}
                    style={{ color: check.passed ? 'var(--ok)' : 'var(--bad)' }}
                  >
                    {check.passed ? '✓' : '✗'} {check.name}
                    {check.detail ? `: ${check.detail}` : ''}
                  </li>
                ))}
              </ul>
              <p>
                Shared from the candidate&apos;s wallet with selective
                disclosure; only the fields above were disclosed.
              </p>
            </div>
          )}
        </Drawer>
      ) : null}
    </aside>
  );
}

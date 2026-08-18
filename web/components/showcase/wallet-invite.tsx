"use client";

import { RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useSameDevice } from "@/components/showcase/use-same-device";

/**
 * Hand a deep link to the learner's or candidate's Wallet.
 *
 * On a phone the wallet is on this device, so the link opens it directly and
 * a QR code would be useless. On a desktop the wallet is on another device,
 * so the QR code is the way across. One component covers both, styled by the
 * surrounding portal through the shared qr-wrap / qr-frame / wallet-link
 * classes and the portal's brand variables. (The demonstrators' pattern.)
 */
export function WalletInvite({
  uri,
  logo,
  hint,
  onRefresh,
}: {
  uri: string;
  /** The requesting portal's logo, embedded in the QR centre. */
  logo?: string;
  hint?: string;
  onRefresh?: () => void;
}) {
  const sameDevice = useSameDevice();

  return (
    <div className="qr-wrap">
      {sameDevice ? (
        <>
          <a href={uri} className="wallet-link">
            <Smartphone size={17} />
            Open in your Wallet
          </a>
          <p className="qr-hint">
            {hint ?? "Your wallet opens on this device. Come back here when it is done."}
          </p>
        </>
      ) : (
        <>
          <div className="qr-frame">
            <QRCodeSVG
              value={uri}
              size={232}
              level="H"
              imageSettings={
                logo ? { src: logo, height: 44, width: 44, excavate: true } : undefined
              }
            />
          </div>
          <p className="qr-hint">{hint ?? "Scan this with the Wallet on your phone."}</p>
        </>
      )}

      {onRefresh ? (
        <button type="button" className="qr-refresh" onClick={onRefresh}>
          <RefreshCw size={13} />
          Start again
        </button>
      ) : null}
    </div>
  );
}

import { ExternalReaderProvider, PluginContext, ProviderMethodArgs } from "@liquio/plugin-sdk";

import { OwsClient } from "./ows/client";
import { SettingsResolver } from "./ows/settings";
import {
  IgrantPluginOptions,
  ISSUANCE_DONE_STATUSES,
  OwsCredentialHistory,
  OwsVerificationHistory,
  VERIFICATION_DONE_STATUS,
} from "./ows/types";

/**
 * One presentation can carry several credentials (e.g. a PID plus a
 * certificate in a single DCQL query); their disclosed claims arrive as one
 * `presentation[]` entry per credential. Merge them into a single flat
 * object so form fillers can read every claim from one place.
 */
export function mergePresentationClaims(presentation: unknown): Record<string, unknown> | null {
  if (!Array.isArray(presentation)) {
    return null;
  }
  const objects = presentation.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === "object" && !Array.isArray(entry),
  );
  if (!objects.length) {
    return null;
  }
  return Object.assign({}, ...objects);
}

/**
 * iGrant.io OWS exchange-status reader for `components/external-reader`.
 *
 * Exposes two methods the cabinet polls through the platform's existing
 * `POST /documents/:id/external-reader/check` path (the `igrant.credential`
 * form control does this every few seconds while the citizen's wallet works):
 *
 * - `checkCredentialStatus`   — OpenID4VCI issuance exchange
 * - `checkPresentationStatus` — OpenID4VP verification exchange
 *
 * Both take the exchange id from `extraParams.exchangeId` (fallback:
 * `nonUserFilter.exchangeId`).
 */
export class IgrantReaderProvider extends ExternalReaderProvider<IgrantPluginOptions> {
  private settingsResolver: SettingsResolver;

  constructor(context: PluginContext, options: IgrantPluginOptions) {
    super(context, options);
    this.settingsResolver = new SettingsResolver(this.options, this.context.log);

    // The task service's external-reader client extracts `.data` from the
    // provider response (components/task/src/controllers/external_reader.ts),
    // so every method returns an { data: <payload> } envelope.
    this.registerMethod("checkCredentialStatus", async (args) => ({
      data: await this.checkCredentialStatus(args),
    }));
    this.registerMethod("checkPresentationStatus", async (args) => ({
      data: await this.checkPresentationStatus(args),
    }));
  }

  private async checkCredentialStatus(args: ProviderMethodArgs): Promise<Record<string, unknown>> {
    const exchangeId = this.extractExchangeId(args);
    const client = await this.getClient(this.extractSettingsName(args));

    const raw = await client.getCredentialHistory(exchangeId);
    const history: OwsCredentialHistory = raw.credentialHistory || {};
    const status = history.status || "";
    const done = ISSUANCE_DONE_STATUSES.includes(status);

    this.context.log.save("igrant-reader|credential-status", {
      exchangeId,
      status,
      done,
    });

    return {
      flow: "issue",
      exchangeId,
      status,
      credentialStatus: history.credentialStatus || "",
      done,
      accepted: done,
      holder: history.holder?.name,
    };
  }

  private async checkPresentationStatus(
    args: ProviderMethodArgs,
  ): Promise<Record<string, unknown>> {
    const exchangeId = this.extractExchangeId(args);
    const client = await this.getClient(this.extractSettingsName(args));

    const raw = await client.getVerificationHistory(exchangeId);
    const history: OwsVerificationHistory = raw.verificationHistory || {};
    const status = history.status || "";
    const done = (history.vpTokenResponse?.length ?? 0) > 0 || status === VERIFICATION_DONE_STATUS;

    this.context.log.save("igrant-reader|presentation-status", {
      exchangeId,
      status,
      done,
      verified: history.verified === true,
    });

    return {
      flow: "verify",
      exchangeId,
      status,
      done,
      verified: history.verified === true,
      claims: mergePresentationClaims(history.presentation),
      holder: history.holder?.name,
      walletUnitAttestationVerified: history.walletUnitAttestationVerified,
    };
  }

  private extractSettingsName(args: ProviderMethodArgs): string | undefined {
    const extra = (args?.extraParams || {}) as Record<string, unknown>;
    const filter = (args?.nonUserFilter || {}) as Record<string, unknown>;
    const name = String(extra.settingsName || filter.settingsName || "");
    return name || undefined;
  }

  private extractExchangeId(args: ProviderMethodArgs): string {
    const extra = (args?.extraParams || {}) as Record<string, unknown>;
    const filter = (args?.nonUserFilter || {}) as Record<string, unknown>;
    const exchangeId = String(extra.exchangeId || filter.exchangeId || "");
    if (!exchangeId) {
      throw new Error("iGrant.io reader. extraParams.exchangeId is required to check an exchange.");
    }
    return exchangeId;
  }

  private async getClient(settingsName?: string): Promise<OwsClient> {
    const settings = await this.settingsResolver.resolve(settingsName);
    return new OwsClient(settings, this.options.timeout ?? 20000);
  }
}

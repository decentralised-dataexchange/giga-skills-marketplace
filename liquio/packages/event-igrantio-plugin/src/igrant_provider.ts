import {
  EventExternalServiceProvider,
  ExternalServiceSendResult,
  ExternalServiceSendContext,
  PluginContext,
} from "@liquio/plugin-sdk";

import { OwsClient } from "./ows/client";
import { SettingsResolver } from "./ows/settings";
import {
  IgrantPluginOptions,
  ISSUANCE_DONE_STATUSES,
  OwsCredentialHistory,
  OwsVerificationHistory,
  REVOCATION_STATUSES,
  VERIFICATION_DONE_STATUS,
} from "./ows/types";

/**
 * One presentation can carry several credentials (e.g. a PID plus a
 * certificate in a single DCQL query); their disclosed claims arrive as one
 * `presentation[]` entry per credential. Merge them into a single flat
 * object so gateway conditions and form fillers read every claim from one
 * place.
 */
export function mergePresentationClaims(
  presentation: unknown,
): Record<string, unknown> | undefined {
  if (!Array.isArray(presentation)) {
    return undefined;
  }
  const objects = presentation.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === "object" && !Array.isArray(entry),
  );
  if (!objects.length) {
    return undefined;
  }
  return Object.assign({}, ...objects);
}

/**
 * Shape of the `data` argument produced by `DecoratorStandard`
 * (`components/event/src/services/event/requester/external_service/decorators/decorator_standard.js`).
 * The analyst's request payload arrives in `body.data`: it is the object built
 * from the event node's `sendToExternalService.options.<key>` functions.
 */
interface IgrantSendData {
  body?: {
    workflowId?: string;
    documentId?: string;
    eventId?: string;
    data?: Record<string, unknown>;
  };
  destination?: { service?: string };
  workflowId?: string;
  documentId?: string;
}

/** `ExternalServiceSendResult` plus the optional external-id stamping contract
 * understood by `ExternalServiceRequester.setExternalIdIfNeedIt`. */
export interface IgrantSendResult extends ExternalServiceSendResult {
  externalIdToSave?: { documentId: string; externalId: string };
}

/**
 * iGrant.io Organisation Wallet Suite provider for Liquio `event` nodes.
 *
 * Operations (select with provider dot-syntax in the event node JSON):
 * - `"providerName": "igrant.issue"`       — OpenID4VCI credential issuance
 * - `"providerName": "igrant.verify"`      — OpenID4VP verification request
 * - `"providerName": "igrant.checkStatus"` — poll an exchange (BPMN wait loops)
 * - `"providerName": "igrant"`             — dispatch on `options.operation`
 *
 * The analyst's payload comes from `sendToExternalService.options.<key>`
 * functions; see the package README for copy-paste event JSON snippets.
 */
export class IgrantProvider extends EventExternalServiceProvider<IgrantPluginOptions> {
  private settingsResolver: SettingsResolver;

  constructor(context: PluginContext, options: IgrantPluginOptions) {
    super(context, options);
    this.settingsResolver = new SettingsResolver(this.options, this.context.log);
  }

  /** Generic entry point: dispatches on `options.operation`. */
  async send(
    data: unknown,
    isTest?: boolean,
    ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const optionsData = this.extractOptionsData(data);
    const operation = String(optionsData.operation || "");
    switch (operation) {
      case "issue":
        return this.issue(data, isTest, ctx);
      case "verify":
        return this.verify(data, isTest, ctx);
      case "checkStatus":
        return this.checkStatus(data, isTest, ctx);
      case "revoke":
        return this.revoke(data, isTest, ctx);
      case "supplyClaims":
        return this.supplyClaims(data, isTest, ctx);
      default:
        throw new Error(
          'iGrant.io provider. Unknown operation. Use providerName "igrant.issue", ' +
            '"igrant.verify", "igrant.checkStatus", "igrant.revoke", ' +
            '"igrant.supplyClaims", or set options.operation.',
        );
    }
  }

  /** OpenID4VCI issuance: create a credential offer. */
  async issue(
    data: unknown,
    _isTest?: boolean,
    _ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const { optionsData, workflowId, documentId } = this.unpack(data);

    const payload = this.buildIssuePayload(optionsData);
    this.context.log.save("igrant|issue|request", {
      workflowId,
      documentId,
      credentialDefinitionId: payload.credentialDefinitionId,
      issuanceMode: payload.issuanceMode,
      payload: this.options.debug ? payload : undefined,
    });

    const client = await this.getClient(
      optionsData.settingsName ? String(optionsData.settingsName) : undefined,
    );
    const raw = await client.issue(payload);
    const rawHistory = raw.credentialHistory;
    const history: OwsCredentialHistory =
      (Array.isArray(rawHistory) ? rawHistory[0] : rawHistory) || {};
    const exchangeId =
      history.credentialExchangeId || history.CredentialExchangeId || "";

    const response = {
      operation: "issue",
      exchangeId,
      offerUri: history.credentialOffer || "",
      status: history.status || "",
      credentialStatus: history.credentialStatus || "",
      credentialId: history.credential?.id,
      presentationExchangeId: history.presentationExchangeId,
      raw: this.options.debug ? raw : undefined,
    };

    this.context.log.save("igrant|issue|response", {
      workflowId,
      exchangeId,
      status: response.status,
    });

    return {
      request: this.options.debug ? payload : undefined,
      response,
      isDone: true,
      ...(documentId && exchangeId
        ? { externalIdToSave: { documentId, externalId: exchangeId } }
        : {}),
    };
  }

  /** OpenID4VP verification: send an authorization request. */
  async verify(
    data: unknown,
    _isTest?: boolean,
    _ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const { optionsData, workflowId, documentId } = this.unpack(data);

    const payload = this.buildVerifyPayload(optionsData);
    this.context.log.save("igrant|verify|request", {
      workflowId,
      documentId,
      presentationDefinitionId: payload.presentationDefinitionId,
      payload: this.options.debug ? payload : undefined,
    });

    const client = await this.getClient(
      optionsData.settingsName ? String(optionsData.settingsName) : undefined,
    );
    const raw = await client.sendVerification(payload);
    const history: OwsVerificationHistory = raw.verificationHistory || {};
    const exchangeId = history.presentationExchangeId || "";

    const response = {
      operation: "verify",
      exchangeId,
      qrUri: history.vpTokenQrCode || "",
      status: history.status || "",
      dcApiRequest: history.dcApiRequest,
      dcApiProtocol: history.dcApiProtocol,
      raw: this.options.debug ? raw : undefined,
    };

    this.context.log.save("igrant|verify|response", {
      workflowId,
      exchangeId,
      status: response.status,
    });

    return {
      request: this.options.debug ? payload : undefined,
      response,
      isDone: true,
      ...(documentId && exchangeId
        ? { externalIdToSave: { documentId, externalId: exchangeId } }
        : {}),
    };
  }

  /**
   * Poll one exchange. Options: `exchangeId` (required), `flow`:
   * `"issue"` | `"verify"` (required). Used in BPMN wait loops
   * (checkStatus -> gateway -> delay -> checkStatus) and by server-side gating.
   */
  async checkStatus(
    data: unknown,
    _isTest?: boolean,
    _ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const { optionsData, workflowId } = this.unpack(data);
    const exchangeId = String(optionsData.exchangeId || "");
    const flow = String(optionsData.flow || "");

    if (!exchangeId) {
      throw new Error("iGrant.io provider. checkStatus needs options.exchangeId.");
    }
    if (flow !== "issue" && flow !== "verify") {
      throw new Error(
        'iGrant.io provider. checkStatus needs options.flow: "issue" or "verify".',
      );
    }

    const client = await this.getClient(
      optionsData.settingsName ? String(optionsData.settingsName) : undefined,
    );
    let response: Record<string, unknown>;
    let done: boolean;

    if (flow === "issue") {
      const raw = await client.getCredentialHistory(exchangeId);
      const history: OwsCredentialHistory = raw.credentialHistory || {};
      const status = history.status || "";
      done = ISSUANCE_DONE_STATUSES.includes(status);
      response = {
        operation: "checkStatus",
        flow,
        exchangeId,
        status,
        credentialStatus: history.credentialStatus || "",
        done,
        accepted: done,
        holder: history.holder?.name,
        raw: this.options.debug ? raw : undefined,
      };
    } else {
      const raw = await client.getVerificationHistory(exchangeId);
      const history: OwsVerificationHistory = raw.verificationHistory || {};
      const status = history.status || "";
      const responded =
        (history.vpTokenResponse?.length ?? 0) > 0 ||
        status === VERIFICATION_DONE_STATUS;
      done = responded;
      response = {
        operation: "checkStatus",
        flow,
        exchangeId,
        status,
        done,
        verified: history.verified === true,
        claims: mergePresentationClaims(history.presentation),
        holder: history.holder?.name,
        walletUnitAttestationVerified: history.walletUnitAttestationVerified,
        raw: this.options.debug ? raw : undefined,
      };
    }

    this.context.log.save("igrant|check-status|response", {
      workflowId,
      exchangeId,
      flow,
      status: response.status,
      done,
    });

    return { request: undefined, response, isDone: done };
  }

  /**
   * Revoke, suspend, or reactivate an issued credential. Options:
   * `exchangeId` (required), `revocationStatus`:
   * `"Revoked"` (default) | `"Suspended"` | `"Operational"`.
   * The credential definition must set `supportRevocation: true`.
   */
  async revoke(
    data: unknown,
    _isTest?: boolean,
    _ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const { optionsData, workflowId } = this.unpack(data);
    const exchangeId = String(optionsData.exchangeId || "");
    const revocationStatus = String(optionsData.revocationStatus || "Revoked");

    if (!exchangeId) {
      throw new Error("iGrant.io provider. revoke needs options.exchangeId.");
    }
    if (!REVOCATION_STATUSES.includes(revocationStatus)) {
      throw new Error(
        `iGrant.io provider. revoke needs options.revocationStatus in: ${REVOCATION_STATUSES.join(", ")}.`,
      );
    }

    const client = await this.getClient(
      optionsData.settingsName ? String(optionsData.settingsName) : undefined,
    );
    const raw = await client.updateRevocationStatus(exchangeId, revocationStatus);

    this.context.log.save("igrant|revoke|response", {
      workflowId,
      exchangeId,
      revocationStatus,
    });

    return {
      request: undefined,
      response: {
        operation: "revoke",
        exchangeId,
        revocationStatus,
        raw: this.options.debug ? raw : undefined,
      },
      isDone: true,
    };
  }

  /**
   * Supply the claims of a Deferred issuance. Options: `exchangeId` (required),
   * `claims` (the claims object) and optionally `credentialId` (the credential
   * definition entry id from the offer response), or a full `credential` object.
   */
  async supplyClaims(
    data: unknown,
    _isTest?: boolean,
    _ctx?: ExternalServiceSendContext,
  ): Promise<IgrantSendResult> {
    const { optionsData, workflowId } = this.unpack(data);
    const exchangeId = String(optionsData.exchangeId || "");

    if (!exchangeId) {
      throw new Error(
        "iGrant.io provider. supplyClaims needs options.exchangeId.",
      );
    }

    let credential = optionsData.credential as Record<string, unknown>;
    if (!credential) {
      if (!optionsData.claims) {
        throw new Error(
          "iGrant.io provider. supplyClaims needs options.claims or options.credential.",
        );
      }
      credential = { claims: optionsData.claims };
      if (optionsData.credentialId) {
        credential.id = optionsData.credentialId;
      }
    }

    const client = await this.getClient(
      optionsData.settingsName ? String(optionsData.settingsName) : undefined,
    );
    const raw = await client.supplyDeferredClaims(exchangeId, { credential });

    this.context.log.save("igrant|supply-claims|response", {
      workflowId,
      exchangeId,
    });

    return {
      request: undefined,
      response: {
        operation: "supplyClaims",
        exchangeId,
        success: raw?.success !== false,
        raw: this.options.debug ? raw : undefined,
      },
      isDone: true,
    };
  }

  private buildIssuePayload(
    optionsData: Record<string, unknown>,
  ): Record<string, unknown> {
    // Full payload passthrough for advanced cases.
    if (optionsData.payload && typeof optionsData.payload === "object") {
      return optionsData.payload as Record<string, unknown>;
    }

    const credentialDefinitionId = optionsData.credentialDefinitionId;
    if (!credentialDefinitionId) {
      throw new Error(
        "iGrant.io provider. issue needs options.credentialDefinitionId.",
      );
    }

    const payload: Record<string, unknown> = {
      issuanceMode: optionsData.issuanceMode || "InTime",
      credentialDefinitionId,
    };
    if (optionsData.claims) {
      payload.credential = { claims: optionsData.claims };
    } else if (optionsData.credential) {
      payload.credential = optionsData.credential;
    }
    for (const key of [
      "credentials",
      "userPin",
      "individualId",
      "presentationDefinitionId",
      "urlScheme",
      "transactionData",
    ]) {
      if (typeof optionsData[key] !== "undefined") {
        payload[key] = optionsData[key];
      }
    }
    return payload;
  }

  private buildVerifyPayload(
    optionsData: Record<string, unknown>,
  ): Record<string, unknown> {
    if (optionsData.payload && typeof optionsData.payload === "object") {
      return optionsData.payload as Record<string, unknown>;
    }

    const presentationDefinitionId = optionsData.presentationDefinitionId;
    if (!presentationDefinitionId) {
      throw new Error(
        "iGrant.io provider. verify needs options.presentationDefinitionId.",
      );
    }

    const payload: Record<string, unknown> = {
      presentationDefinitionId,
      requestByReference:
        typeof optionsData.requestByReference === "boolean"
          ? optionsData.requestByReference
          : true,
    };
    for (const key of [
      "transactionData",
      "individualId",
      "mapperId",
      "signatureStamp",
      "signatureCoordinate",
    ]) {
      if (typeof optionsData[key] !== "undefined") {
        payload[key] = optionsData[key];
      }
    }
    return payload;
  }

  private async getClient(settingsName?: string): Promise<OwsClient> {
    const settings = await this.settingsResolver.resolve(settingsName);
    return new OwsClient(settings, this.options.timeout ?? 20000);
  }

  private unpack(data: unknown): {
    optionsData: Record<string, unknown>;
    workflowId?: string;
    documentId?: string;
  } {
    const sendData = (data || {}) as IgrantSendData;
    return {
      optionsData: this.extractOptionsData(data),
      workflowId: sendData.body?.workflowId || sendData.workflowId,
      documentId: sendData.body?.documentId || sendData.documentId,
    };
  }

  private extractOptionsData(data: unknown): Record<string, unknown> {
    const sendData = (data || {}) as IgrantSendData;
    const optionsData = sendData.body?.data;
    return optionsData && typeof optionsData === "object" ? optionsData : {};
  }
}

import axios, { AxiosRequestConfig } from "axios";

import { OwsIssueResponse, OwsSettings, OwsVerifyResponse } from "./types";

const ISSUE_PATH = "/v2/config/digital-wallet/openid/sdjwt/credential/issue";
const CREDENTIAL_HISTORY_PATH = "/v2/config/digital-wallet/openid/sdjwt/credential/history";
const VERIFICATION_SEND_PATH = "/v3/config/digital-wallet/openid/sdjwt/verification/send";
const VERIFICATION_HISTORY_PATH = "/v3/config/digital-wallet/openid/sdjwt/verification/history";

/**
 * Thin HTTP client for the OWS OpenID4VC endpoints used by the Liquio plugins.
 * Auth is `Authorization: ApiKey <key>`; the key never leaves the server side.
 */
export class OwsClient {
  private readonly settings: OwsSettings;
  private readonly timeout: number;

  constructor(settings: OwsSettings, timeout = 20000) {
    if (!settings?.baseUrl) {
      throw new Error("iGrant.io provider. OWS base URL is not configured.");
    }
    if (!settings?.apiKey) {
      throw new Error("iGrant.io provider. OWS API key is not configured.");
    }
    this.settings = settings;
    this.timeout = timeout;
  }

  /** `POST …/credential/issue` (OpenID4VCI). */
  async issue(payload: Record<string, unknown>): Promise<OwsIssueResponse> {
    return this.request<OwsIssueResponse>({
      method: "POST",
      url: `${this.base()}${ISSUE_PATH}`,
      data: payload,
    });
  }

  /** `GET …/credential/history/{exchangeId}`. */
  async getCredentialHistory(exchangeId: string): Promise<OwsIssueResponse> {
    return this.request<OwsIssueResponse>({
      method: "GET",
      url: `${this.base()}${CREDENTIAL_HISTORY_PATH}/${encodeURIComponent(exchangeId)}`,
    });
  }

  /** `PUT …/credential/history/{exchangeId}` — deferred issuance claims. */
  async supplyDeferredClaims(
    exchangeId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "PUT",
      url: `${this.base()}${CREDENTIAL_HISTORY_PATH}/${encodeURIComponent(exchangeId)}`,
      data: payload,
    });
  }

  /** `PUT …/credential/history/{exchangeId}/revocation-status`. */
  async updateRevocationStatus(
    exchangeId: string,
    revocationStatus: string,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "PUT",
      url: `${this.base()}${CREDENTIAL_HISTORY_PATH}/${encodeURIComponent(exchangeId)}/revocation-status`,
      data: { revocationStatus },
    });
  }

  /** `POST …/verification/send` (OpenID4VP, v3). */
  async sendVerification(payload: Record<string, unknown>): Promise<OwsVerifyResponse> {
    return this.request<OwsVerifyResponse>({
      method: "POST",
      url: `${this.base()}${VERIFICATION_SEND_PATH}`,
      data: payload,
    });
  }

  /** `GET …/verification/history/{exchangeId}` (v3). */
  async getVerificationHistory(exchangeId: string): Promise<OwsVerifyResponse> {
    return this.request<OwsVerifyResponse>({
      method: "GET",
      url: `${this.base()}${VERIFICATION_HISTORY_PATH}/${encodeURIComponent(exchangeId)}`,
    });
  }

  private base(): string {
    return this.settings.baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const { data } = await axios({
        ...config,
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.settings.apiKey}`,
        },
        timeout: this.timeout,
      });
      return data as T;
    } catch (error) {
      const status = error?.response?.status;
      const detail =
        error?.response?.data?.detail || error?.response?.data?.message || error?.message;
      const wrapped: Error & { details?: unknown } = new Error(
        `iGrant.io OWS request failed${status ? ` (HTTP ${status})` : ""}: ${detail}`,
      );
      wrapped.details = {
        method: config.method,
        url: config.url,
        status,
        detail,
      };
      throw wrapped;
    }
  }
}

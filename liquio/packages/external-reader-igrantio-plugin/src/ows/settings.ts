import axios from "axios";

import { IgrantPluginOptions, OwsSettings } from "./types";

/** Minimal logger contract, satisfied by `PluginContext.log`. */
export interface SettingsLogger {
  save(type: string, data?: unknown, level?: string): unknown;
}

const DEFAULT_CACHE_TTL_MS = 60000;

/**
 * Resolves `{ baseUrl, apiKey }` for the OWS calls.
 *
 * Order:
 * 1. `options.baseUrl` / `options.apiKey` — hard overrides (env / secret file).
 * 2. The settings register record — a Liquio register the organisation admin
 *    edits in the admin panel (Registers page). The record `data` must carry
 *    `{ "baseUrl": "…", "apiKey": "…" }`.
 *
 * Register reads use the same HTTP API the event service itself uses
 * (`GET {url}/records?register_id=…&key_id=…` with a `token` header). Results
 * are cached for `cacheTtlMs` (default 60 s) so admin edits apply within a
 * minute without a restart.
 */
export class SettingsResolver {
  private readonly options: IgrantPluginOptions;
  private readonly log: SettingsLogger;
  private readonly cache = new Map<string, { settings: OwsSettings; at: number }>();

  constructor(options: IgrantPluginOptions, log: SettingsLogger) {
    this.options = options || {};
    this.log = log;
  }

  /**
   * Resolve the settings, optionally for a NAMED record (`settingsName` on
   * the operation): each name selects the register record whose `data.name`
   * matches, so one plugin instance serves several tenants (main organisation
   * and sandbox organisations). The `options.baseUrl` / `options.apiKey`
   * overrides apply only to the default (unnamed) settings.
   */
  async resolve(settingsName?: string): Promise<OwsSettings> {
    const { baseUrl, apiKey, settingsRegister } = this.options;

    // Full override — no register read needed (default tenant only).
    if (!settingsName && baseUrl && apiKey) {
      return { baseUrl, apiKey };
    }

    if (!settingsRegister) {
      throw new Error(
        "iGrant.io provider. No OWS settings: set options.baseUrl + options.apiKey, " +
          "or options.settingsRegister {url, token, registerId, keyId}.",
      );
    }

    const recordName = settingsName || settingsRegister.recordName;
    const cacheKey = recordName || "";
    const ttl = settingsRegister.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < ttl) {
      return settingsName ? hit.settings : this.applyOverrides(hit.settings);
    }

    const fromRegister = await this.fetchFromRegister(recordName);
    this.cache.set(cacheKey, { settings: fromRegister, at: Date.now() });
    return settingsName ? fromRegister : this.applyOverrides(fromRegister);
  }

  /** Drop the cache (used by tests). */
  invalidate(): void {
    this.cache.clear();
  }

  private applyOverrides(settings: OwsSettings): OwsSettings {
    return {
      baseUrl: this.options.baseUrl || settings.baseUrl,
      apiKey: this.options.apiKey || settings.apiKey,
    };
  }

  private async fetchFromRegister(recordName?: string): Promise<OwsSettings> {
    const { url, token, registerId, keyId } = this.options.settingsRegister;

    let query =
      `?register_id=${registerId}&key_id=${keyId}` +
      "&allow_see_all_records=true&sort=null&limit=10";
    if (recordName) {
      query += `&data[name]=${encodeURIComponent(recordName)}`;
    }

    let records: Array<{ data?: Record<string, unknown> }>;
    try {
      const { data: response } = await axios({
        url: `${url.replace(/\/+$/, "")}/records${query}`,
        method: "GET",
        headers: { "Content-Type": "application/json", token: `${token}` },
        timeout: 10000,
      });
      records = response?.data || response || [];
    } catch (error) {
      this.log.save(
        "igrant|settings-register|request-error",
        { error: error?.message, registerId, keyId },
        "error",
      );
      throw new Error(`iGrant.io provider. Can not read the settings register: ${error?.message}`);
    }

    const rows = Array.isArray(records) ? records : [];
    const record = recordName
      ? rows.find((row) => row?.data?.name === recordName) || rows[0]
      : rows[0];
    const data = record?.data || {};
    const settings: OwsSettings = {
      baseUrl: String(data.baseUrl || ""),
      apiKey: String(data.apiKey || ""),
    };

    if (!settings.baseUrl || !settings.apiKey) {
      this.log.save(
        "igrant|settings-register|record-incomplete",
        {
          registerId,
          keyId,
          recordName,
          hasBaseUrl: !!settings.baseUrl,
          hasApiKey: !!settings.apiKey,
        },
        "error",
      );
      throw new Error(
        `iGrant.io provider. The settings register record${recordName ? ` "${recordName}"` : ""} must carry data.baseUrl and data.apiKey.`,
      );
    }

    this.log.save("igrant|settings-register|loaded", {
      registerId,
      keyId,
      recordName,
      baseUrl: settings.baseUrl,
    });
    return settings;
  }
}

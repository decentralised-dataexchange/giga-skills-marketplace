import axios from "axios";

import { IgrantReaderProvider } from "./igrant_reader_provider";
import { IgrantPluginOptions } from "./ows/types";

jest.mock("axios");
const mockedAxios = axios as unknown as jest.Mock;

const context = { log: { save: jest.fn() }, pluginConfig: {} };

const options: IgrantPluginOptions = {
  baseUrl: "https://demo-api.igrant.io",
  apiKey: "test-api-key",
};

describe("IgrantReaderProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers its two methods", () => {
    const provider = new IgrantReaderProvider(context as never, options);
    expect(provider.listMethods().sort()).toEqual([
      "checkCredentialStatus",
      "checkPresentationStatus",
    ]);
  });

  it("checkCredentialStatus reports a pending issuance", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { credentialHistory: { status: "offer_sent" } },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    const method = provider.getMethod("checkCredentialStatus");
    const envelope = (await method({
      extraParams: { exchangeId: "cred-ex-1" },
    })) as { data: Record<string, unknown> };
    const result = envelope.data;

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://demo-api.igrant.io/v2/config/digital-wallet/openid/sdjwt/credential/history/cred-ex-1",
        headers: expect.objectContaining({
          Authorization: "ApiKey test-api-key",
        }),
      }),
    );
    expect(result).toMatchObject({
      flow: "issue",
      status: "offer_sent",
      done: false,
      accepted: false,
    });
  });

  it("checkCredentialStatus reports an accepted issuance as done", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { credentialHistory: { status: "credential_accepted" } },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    const result = (
      (await provider.getMethod("checkCredentialStatus")({
        extraParams: { exchangeId: "cred-ex-1" },
      })) as { data: Record<string, unknown> }
    ).data;

    expect(result).toMatchObject({ done: true, accepted: true });
  });

  it("checkPresentationStatus returns claims when the wallet responded", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        verificationHistory: {
          status: "presentation_acked",
          verified: true,
          vpTokenResponse: ["token"],
          presentation: [{ given_name: "Demo" }],
          holder: { name: "Demo Liquio" },
        },
      },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    const result = (
      (await provider.getMethod("checkPresentationStatus")({
        extraParams: { exchangeId: "pres-ex-1" },
      })) as { data: Record<string, unknown> }
    ).data;

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://demo-api.igrant.io/v3/config/digital-wallet/openid/sdjwt/verification/history/pres-ex-1",
      }),
    );
    expect(result).toMatchObject({
      flow: "verify",
      done: true,
      verified: true,
      claims: { given_name: "Demo" },
      holder: "Demo Liquio",
    });
  });

  it("checkPresentationStatus merges the claims of every presented credential", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        verificationHistory: {
          status: "presentation_acked",
          verified: true,
          vpTokenResponse: ["token"],
          presentation: [
            { given_name: "Demo", family_name: "Holder", email: "demo@example.com" },
            { institution: "Kyiv Polytechnic Institute", ulid: "1234567890" },
          ],
        },
      },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    const result = (
      (await provider.getMethod("checkPresentationStatus")({
        extraParams: { exchangeId: "pres-ex-2" },
      })) as { data: Record<string, unknown> }
    ).data;

    expect(result).toMatchObject({
      done: true,
      verified: true,
      claims: {
        given_name: "Demo",
        family_name: "Holder",
        email: "demo@example.com",
        institution: "Kyiv Polytechnic Institute",
        ulid: "1234567890",
      },
    });
  });

  it("checkPresentationStatus reports a pending verification", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { verificationHistory: { status: "request_sent" } },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    const result = (
      (await provider.getMethod("checkPresentationStatus")({
        extraParams: { exchangeId: "pres-ex-1" },
      })) as { data: Record<string, unknown> }
    ).data;

    expect(result).toMatchObject({ done: false, verified: false, claims: null });
  });

  it("accepts the exchange id from nonUserFilter as a fallback", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { verificationHistory: { status: "request_sent" } },
    });
    const provider = new IgrantReaderProvider(context as never, options);

    await provider.getMethod("checkPresentationStatus")({
      nonUserFilter: { exchangeId: "pres-ex-2" },
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("/verification/history/pres-ex-2"),
      }),
    );
  });

  it("throws without an exchange id", async () => {
    const provider = new IgrantReaderProvider(context as never, options);
    await expect(provider.getMethod("checkPresentationStatus")({})).rejects.toThrow("exchangeId");
    expect(mockedAxios).not.toHaveBeenCalled();
  });
});

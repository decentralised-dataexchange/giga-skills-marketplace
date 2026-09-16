import axios from "axios";

import { IgrantProvider } from "./igrant_provider";
import { IgrantPluginOptions } from "./ows/types";

jest.mock("axios");
const mockedAxios = axios as unknown as jest.Mock;

const context = { log: { save: jest.fn() }, pluginConfig: {} };

const directOptions: IgrantPluginOptions = {
  baseUrl: "https://demo-api.igrant.io",
  apiKey: "test-api-key",
};

/** Wrap analyst options the way DecoratorStandard delivers them. */
const sendData = (options: Record<string, unknown>) => ({
  body: { workflowId: "wf-1", documentId: "doc-1", data: options },
  destination: { service: "igrant" },
});

describe("IgrantProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("issue", () => {
    const issueResponse = {
      data: {
        credentialHistory: {
          CredentialExchangeId: "cred-ex-1",
          credentialOffer: "openid-credential-offer://…",
          credentialStatus: "ready",
          status: "offer_sent",
          credential: { id: "cred-id-1" },
        },
      },
    };

    it("posts the issue payload and normalizes the response", async () => {
      mockedAxios.mockResolvedValueOnce(issueResponse);
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.issue(
        sendData({
          credentialDefinitionId: "def-1",
          claims: { given_name: "Demo" },
        }),
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          url: "https://demo-api.igrant.io/v2/config/digital-wallet/openid/sdjwt/credential/issue",
          data: {
            issuanceMode: "InTime",
            credentialDefinitionId: "def-1",
            credential: { claims: { given_name: "Demo" } },
          },
          headers: expect.objectContaining({
            Authorization: "ApiKey test-api-key",
          }),
        }),
      );
      expect(result.isDone).toBe(true);
      expect(result.response).toMatchObject({
        operation: "issue",
        exchangeId: "cred-ex-1",
        offerUri: "openid-credential-offer://…",
        status: "offer_sent",
        credentialId: "cred-id-1",
      });
      expect(result.externalIdToSave).toEqual({
        documentId: "doc-1",
        externalId: "cred-ex-1",
      });
      // No debug: the raw payload must not be echoed.
      expect(result.request).toBeUndefined();
      expect((result.response as Record<string, unknown>).raw).toBeUndefined();
    });

    it("throws without credentialDefinitionId", async () => {
      const provider = new IgrantProvider(context as never, directOptions);
      await expect(provider.issue(sendData({}))).rejects.toThrow("credentialDefinitionId");
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it("passes a full payload through unchanged", async () => {
      mockedAxios.mockResolvedValueOnce(issueResponse);
      const provider = new IgrantProvider(context as never, directOptions);
      const payload = {
        issuanceMode: "Deferred",
        credentialDefinitionId: "def-2",
        userPin: "1234",
      };

      await provider.issue(sendData({ payload }));

      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({ data: payload }));
    });
  });

  describe("verify", () => {
    const verifyResponse = {
      data: {
        verificationHistory: {
          presentationExchangeId: "pres-ex-1",
          vpTokenQrCode: "openid4vp://…",
          status: "request_sent",
        },
      },
    };

    it("posts the verification payload and normalizes the response", async () => {
      mockedAxios.mockResolvedValueOnce(verifyResponse);
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.verify(sendData({ presentationDefinitionId: "pd-1" }));

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          url: "https://demo-api.igrant.io/v3/config/digital-wallet/openid/sdjwt/verification/send",
          data: { presentationDefinitionId: "pd-1", requestByReference: true },
        }),
      );
      expect(result.response).toMatchObject({
        operation: "verify",
        exchangeId: "pres-ex-1",
        qrUri: "openid4vp://…",
        status: "request_sent",
      });
      expect(result.externalIdToSave).toEqual({
        documentId: "doc-1",
        externalId: "pres-ex-1",
      });
    });

    it("throws without presentationDefinitionId", async () => {
      const provider = new IgrantProvider(context as never, directOptions);
      await expect(provider.verify(sendData({}))).rejects.toThrow("presentationDefinitionId");
    });
  });

  describe("checkStatus", () => {
    it("reports a completed verification with claims", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: {
          verificationHistory: {
            presentationExchangeId: "pres-ex-1",
            status: "presentation_acked",
            verified: true,
            vpTokenResponse: ["token"],
            presentation: [{ given_name: "Demo" }],
            holder: { name: "Demo Liquio" },
          },
        },
      });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.checkStatus(
        sendData({ exchangeId: "pres-ex-1", flow: "verify" }),
      );

      expect(result.isDone).toBe(true);
      expect(result.response).toMatchObject({
        operation: "checkStatus",
        flow: "verify",
        done: true,
        verified: true,
        claims: { given_name: "Demo" },
        holder: "Demo Liquio",
      });
    });

    it("merges the claims of every presented credential", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: {
          verificationHistory: {
            presentationExchangeId: "pres-ex-2",
            status: "presentation_acked",
            verified: true,
            vpTokenResponse: ["token"],
            presentation: [
              { given_name: "Demo", family_name: "Holder" },
              { institution: "Kyiv Polytechnic Institute", ulid: "1234567890" },
            ],
          },
        },
      });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.checkStatus(
        sendData({ exchangeId: "pres-ex-2", flow: "verify" }),
      );

      expect(result.response).toMatchObject({
        claims: {
          given_name: "Demo",
          family_name: "Holder",
          institution: "Kyiv Polytechnic Institute",
          ulid: "1234567890",
        },
      });
    });

    it("reports a pending issuance as not done", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { credentialHistory: { status: "offer_sent" } },
      });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.checkStatus(
        sendData({ exchangeId: "cred-ex-1", flow: "issue" }),
      );

      expect(result.isDone).toBe(false);
      expect(result.response).toMatchObject({ done: false, accepted: false });
    });

    it("reports an accepted issuance as done", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { credentialHistory: { status: "credential_accepted" } },
      });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.checkStatus(
        sendData({ exchangeId: "cred-ex-1", flow: "issue" }),
      );

      expect(result.isDone).toBe(true);
    });

    it("validates its arguments", async () => {
      const provider = new IgrantProvider(context as never, directOptions);
      await expect(provider.checkStatus(sendData({ flow: "issue" }))).rejects.toThrow("exchangeId");
      await expect(
        provider.checkStatus(sendData({ exchangeId: "x", flow: "bad" })),
      ).rejects.toThrow("flow");
    });
  });

  describe("revoke", () => {
    it("puts the revocation status", async () => {
      mockedAxios.mockResolvedValueOnce({ data: { success: true } });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.revoke(
        sendData({ exchangeId: "cred-ex-1", revocationStatus: "Suspended" }),
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "PUT",
          url: "https://demo-api.igrant.io/v2/config/digital-wallet/openid/sdjwt/credential/history/cred-ex-1/revocation-status",
          data: { revocationStatus: "Suspended" },
        }),
      );
      expect(result.response).toMatchObject({
        operation: "revoke",
        exchangeId: "cred-ex-1",
        revocationStatus: "Suspended",
      });
    });

    it("defaults to Revoked and validates the status", async () => {
      mockedAxios.mockResolvedValueOnce({ data: { success: true } });
      const provider = new IgrantProvider(context as never, directOptions);

      await provider.revoke(sendData({ exchangeId: "cred-ex-1" }));
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revocationStatus: "Revoked" } }),
      );

      await expect(
        provider.revoke(sendData({ exchangeId: "cred-ex-1", revocationStatus: "Bad" })),
      ).rejects.toThrow("revocationStatus");
      await expect(provider.revoke(sendData({}))).rejects.toThrow("exchangeId");
    });
  });

  describe("supplyClaims", () => {
    it("puts deferred claims with the credential entry id", async () => {
      mockedAxios.mockResolvedValueOnce({ data: { success: true } });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.supplyClaims(
        sendData({
          exchangeId: "cred-ex-2",
          claims: { given_name: "Demo" },
          credentialId: "entry-1",
        }),
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "PUT",
          url: "https://demo-api.igrant.io/v2/config/digital-wallet/openid/sdjwt/credential/history/cred-ex-2",
          data: {
            credential: { claims: { given_name: "Demo" }, id: "entry-1" },
          },
        }),
      );
      expect(result.response).toMatchObject({
        operation: "supplyClaims",
        success: true,
      });
    });

    it("validates its arguments", async () => {
      const provider = new IgrantProvider(context as never, directOptions);
      await expect(provider.supplyClaims(sendData({ claims: {} }))).rejects.toThrow("exchangeId");
      await expect(provider.supplyClaims(sendData({ exchangeId: "x" }))).rejects.toThrow("claims");
    });
  });

  describe("send dispatch", () => {
    it("routes on options.operation", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { credentialHistory: { CredentialExchangeId: "cred-ex-9" } },
      });
      const provider = new IgrantProvider(context as never, directOptions);

      const result = await provider.send(
        sendData({
          operation: "issue",
          credentialDefinitionId: "def-1",
          claims: {},
        }),
      );

      expect((result.response as Record<string, unknown>).exchangeId).toBe("cred-ex-9");
    });

    it("throws on unknown operation", async () => {
      const provider = new IgrantProvider(context as never, directOptions);
      await expect(provider.send(sendData({}))).rejects.toThrow("Unknown operation");
    });
  });

  describe("settings register", () => {
    const registerOptions: IgrantPluginOptions = {
      settingsRegister: {
        url: "http://register:3350",
        token: "reg-token",
        registerId: 200,
        keyId: 200,
      },
    };

    it("reads baseUrl and apiKey from the register and caches them", async () => {
      // First call: register read, then the OWS call.
      mockedAxios
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                data: {
                  name: "default",
                  baseUrl: "https://demo-api.igrant.io",
                  apiKey: "register-key",
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: { verificationHistory: { presentationExchangeId: "p-1" } },
        })
        // Second call: OWS call only (settings cached).
        .mockResolvedValueOnce({
          data: { verificationHistory: { presentationExchangeId: "p-2" } },
        });

      const provider = new IgrantProvider(context as never, registerOptions);

      await provider.verify(sendData({ presentationDefinitionId: "pd-1" }));
      await provider.verify(sendData({ presentationDefinitionId: "pd-1" }));

      const registerCalls = mockedAxios.mock.calls.filter(([config]) =>
        String(config.url).startsWith("http://register:3350/records"),
      );
      expect(registerCalls).toHaveLength(1);
      expect(registerCalls[0][0].headers).toMatchObject({ token: "reg-token" });

      const owsCalls = mockedAxios.mock.calls.filter(([config]) =>
        String(config.url).includes("verification/send"),
      );
      expect(owsCalls).toHaveLength(2);
      expect(owsCalls[0][0].headers).toMatchObject({
        Authorization: "ApiKey register-key",
      });
    });

    it("fails clearly when the record is incomplete", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { data: [{ data: { baseUrl: "https://demo-api.igrant.io" } }] },
      });
      const provider = new IgrantProvider(context as never, registerOptions);

      await expect(provider.verify(sendData({ presentationDefinitionId: "pd-1" }))).rejects.toThrow(
        "data.baseUrl and data.apiKey",
      );
    });

    it("fails clearly when nothing is configured", async () => {
      const provider = new IgrantProvider(context as never, {});
      await expect(provider.verify(sendData({ presentationDefinitionId: "pd-1" }))).rejects.toThrow(
        "No OWS settings",
      );
    });
  });
});

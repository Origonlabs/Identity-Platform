import { describe } from "vitest";
import { it, NiceResponse } from "../../../../helpers";
import { InternalProjectKeys, niceBackendFetch } from "../../../backend-helpers";

const oauthConnectionsServiceUrl = process.env.OAUTH_CONNECTIONS_SERVICE_URL;
const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_JWT_SECRET;
const describeIf = oauthConnectionsServiceUrl && internalServiceToken ? describe : describe.skip;

function normalizeConnectionBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const tokenSet = body.token_set
    ? {
        ...body.token_set,
        issued_at: "<timestamp>",
      }
    : undefined;
  return {
    ...body,
    id: "<id>",
    created_at: "<timestamp>",
    updated_at: "<timestamp>",
    token_set: tokenSet,
  };
}

describeIf("oauth-connections microservice proxy", () => {
  it("links a connection via gateway", async ({ expect }) => {
    const response = await niceBackendFetch("/api/latest/oauth-connections", {
      method: "POST",
      accessType: "server",
      body: {
        provider_id: "google",
        project_id: InternalProjectKeys.projectId,
        user_id: "user-123",
        scope: ["email"],
        token_set: {
          access_token: "access-token",
          issued_at: new Date().toISOString(),
        },
      },
    });

    const normalized = new NiceResponse(response.status, response.headers, normalizeConnectionBody(response.body));
    expect(normalized).toMatchInlineSnapshot(`
      NiceResponse {
        "status": 200,
        "body": {
          "created_at": "<timestamp>",
          "expires_at": undefined,
          "id": "<id>",
          "project_id": "${InternalProjectKeys.projectId}",
          "provider_id": "google",
          "scope": [
            "email",
          ],
          "status": "active",
          "token_set": {
            "access_token": "access-token",
            "expires_at": undefined,
            "expires_in": undefined,
            "issued_at": "<timestamp>",
            "refresh_token": undefined,
            "token_type": undefined,
            "id_token": undefined,
          },
          "updated_at": "<timestamp>",
          "user_id": "user-123",
        },
        "headers": Headers { <some fields may have been hidden> },
      }
    `);
  });

  it("lists connections via gateway", async ({ expect }) => {
    const response = await niceBackendFetch("/api/latest/oauth-connections", {
      method: "GET",
      accessType: "server",
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

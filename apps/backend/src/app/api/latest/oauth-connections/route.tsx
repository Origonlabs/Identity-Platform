import { toApiOAuthConnectionResponse, toServiceOAuthConnection } from "@/lib/microservice-mappers";
import { fetchServiceJson } from "@/lib/microservices";
import { createSmartRouteHandler } from "@/route-handlers/smart-route-handler";
import { OAuthConnection, TokenSet } from "@opendex/contracts";
import { adaptSchema, serverOrHigherAuthTypeSchema, yupArray, yupNumber, yupObject, yupString } from "@opendex/stack-shared/dist/schema-fields";

const requestSchema = yupObject({
  id: yupString().optional(),
  provider_id: yupString().defined(),
  project_id: yupString().defined(),
  tenant_id: yupString().optional(),
  user_id: yupString().defined(),
  scope: yupArray(yupString().defined()).defined(),
  expires_at: yupString().optional(),
  created_at: yupString().optional(),
  updated_at: yupString().optional(),
  token_set: yupObject({
    access_token: yupString().defined(),
    refresh_token: yupString().optional(),
    expires_in: yupNumber().optional(),
    token_type: yupString().optional(),
    issued_at: yupString().defined(),
    expires_at: yupString().optional(),
    id_token: yupString().optional(),
  }).defined(),
});

export const POST = createSmartRouteHandler({
  metadata: {
    summary: "Link OAuth connection",
    description: "Proxy to oauth-connections microservice.",
    tags: ["OAuth Connections"],
  },
  request: yupObject({
    auth: yupObject({
      type: serverOrHigherAuthTypeSchema,
      tenancy: adaptSchema.defined(),
    }).defined(),
    method: yupString().oneOf(["POST"]).defined(),
    body: requestSchema.defined(),
  }),
  response: yupObject({
    statusCode: yupNumber().oneOf([200]).defined(),
    bodyType: yupString().oneOf(["json"]).defined(),
    body: yupMixed().defined(),
  }),
  handler: async ({ body }) => {
    const response = await fetchServiceJson<OAuthConnection & { tokenSet: TokenSet }>("oauth-connections", "/connections", {
      method: "POST",
      body: toServiceOAuthConnection(body),
    });
    return {
      statusCode: 200,
      bodyType: "json",
      body: toApiOAuthConnectionResponse(response),
    };
  },
});

export const GET = createSmartRouteHandler({
  metadata: {
    summary: "List OAuth connections",
    description: "Proxy to oauth-connections microservice.",
    tags: ["OAuth Connections"],
  },
  request: yupObject({
    auth: yupObject({
      type: serverOrHigherAuthTypeSchema,
      tenancy: adaptSchema.defined(),
    }).defined(),
    method: yupString().oneOf(["GET"]).defined(),
  }),
  response: yupObject({
    statusCode: yupNumber().oneOf([200]).defined(),
    bodyType: yupString().oneOf(["json"]).defined(),
    body: yupMixed().defined(),
  }),
  handler: async () => {
    const response = await fetchServiceJson<Array<OAuthConnection & { tokenSet?: TokenSet }>>(
      "oauth-connections",
      "/connections",
      {
        method: "GET",
      }
    );
    return {
      statusCode: 200,
      bodyType: "json",
      body: response.map((item) => toApiOAuthConnectionResponse(item)),
    };
  },
});

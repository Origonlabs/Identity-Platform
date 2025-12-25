import { toApiNotificationEnvelope, toServiceNotificationRequest } from "@/lib/microservice-mappers";
import { fetchServiceJson } from "@/lib/microservices";
import { createSmartRouteHandler } from "@/route-handlers/smart-route-handler";
import { NotificationEnvelope } from "@opendex/contracts";
import { adaptSchema, serverOrHigherAuthTypeSchema, yupArray, yupBoolean, yupMixed, yupNumber, yupObject, yupString } from "@opendex/stack-shared/dist/schema-fields";

const requestSchema = yupObject({
  request: yupObject({
    channel: yupString().oneOf(["email", "sms", "webhook"]).defined(),
    project_id: yupString().defined(),
    tenant_id: yupString().optional(),
    locale: yupString().optional(),
    deduplication_key: yupString().optional(),
    expires_at: yupString().optional(),
    metadata: yupObject().optional(),
    to: yupString().optional(),
    template_id: yupString().optional(),
    variables: yupObject().optional(),
    cc: yupArray(yupString().defined()).optional(),
    bcc: yupArray(yupString().defined()).optional(),
    reply_to: yupString().optional(),
    url: yupString().optional(),
    signature_version: yupString().optional(),
    body: yupMixed().optional(),
  }).defined(),
  dry_run: yupBoolean().optional(),
});

export const POST = createSmartRouteHandler({
  metadata: {
    summary: "Create notification",
    description: "Proxy to notifications microservice.",
    tags: ["Notifications"],
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
    const response = await fetchServiceJson<NotificationEnvelope>("notifications", "/notifications", {
      method: "POST",
      body: {
        request: toServiceNotificationRequest(body.request),
        dryRun: body.dry_run,
      },
    });
    return {
      statusCode: 200,
      bodyType: "json",
      body: toApiNotificationEnvelope(response),
    };
  },
});

export const GET = createSmartRouteHandler({
  metadata: {
    summary: "List notifications",
    description: "Proxy to notifications microservice.",
    tags: ["Notifications"],
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
    const response = await fetchServiceJson<NotificationEnvelope[]>("notifications", "/notifications", {
      method: "GET",
    });
    return {
      statusCode: 200,
      bodyType: "json",
      body: response.map((item) => toApiNotificationEnvelope(item)),
    };
  },
});

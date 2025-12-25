import { describe } from "vitest";
import { it, NiceResponse } from "../../../../helpers";
import { InternalProjectKeys, niceBackendFetch } from "../../../backend-helpers";

const notificationsServiceUrl = process.env.NOTIFICATIONS_SERVICE_URL;
const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_JWT_SECRET;
const describeIf = notificationsServiceUrl && internalServiceToken ? describe : describe.skip;

function normalizeNotificationBody(body: any) {
  if (!body || typeof body !== "object") return body;
  return {
    ...body,
    id: "<id>",
    created_at: "<timestamp>",
    updated_at: "<timestamp>",
  };
}

describeIf("notifications microservice proxy", () => {
  it("creates a notification via gateway", async ({ expect }) => {
    const response = await niceBackendFetch("/api/latest/notifications", {
      method: "POST",
      accessType: "server",
      body: {
        request: {
          channel: "email",
          project_id: InternalProjectKeys.projectId,
          to: "user@example.com",
          template_id: "welcome-template",
          variables: {
            first_name: "Ada",
          },
        },
        dry_run: true,
      },
    });

    const normalized = new NiceResponse(response.status, response.headers, normalizeNotificationBody(response.body));
    expect(normalized).toMatchInlineSnapshot(`
      NiceResponse {
        "status": 200,
        "body": {
          "created_at": "<timestamp>",
          "id": "<id>",
          "request": {
            "channel": "email",
            "project_id": "${InternalProjectKeys.projectId}",
            "template_id": "welcome-template",
            "to": "user@example.com",
            "variables": {
              "first_name": "Ada",
            },
          },
          "status": "cancelled",
          "updated_at": "<timestamp>",
        },
        "headers": Headers { <some fields may have been hidden> },
      }
    `);
  });

  it("lists notifications via gateway", async ({ expect }) => {
    const response = await niceBackendFetch("/api/latest/notifications", {
      method: "GET",
      accessType: "server",
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

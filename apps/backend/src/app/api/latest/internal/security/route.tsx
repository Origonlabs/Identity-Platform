import { createSmartRouteHandler } from "@/route-handlers/smart-route-handler";
import { adaptSchema, serverOrHigherAuthTypeSchema, yupBoolean, yupNumber, yupObject, yupString } from "@opendex/stack-shared/dist/schema-fields";
import { getEnvVariable } from "@opendex/stack-shared/dist/utils/env";

function getBooleanEnv(name: string) {
  const raw = getEnvVariable(name, "");
  if (!raw) return undefined;
  return raw !== "false";
}

export const GET = createSmartRouteHandler({
  metadata: {
    summary: "Internal security config status",
    description: "Reports presence of internal auth/mTLS configuration for service-to-service calls.",
    tags: ["Internal"],
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
    body: yupObject({
      auth: yupObject({
        static_token: yupBoolean().defined(),
        jwt_single_secret: yupBoolean().defined(),
        jwt_secrets_count: yupNumber().defined(),
      }).defined(),
      mtls: yupObject({
        enabled: yupBoolean().defined(),
        ca: yupBoolean().defined(),
        cert: yupBoolean().defined(),
        key: yupBoolean().defined(),
        reject_unauthorized: yupBoolean().defined(),
      }).defined(),
    }).defined(),
  }),
  handler: async () => {
    const staticToken = Boolean(getEnvVariable("INTERNAL_SERVICE_TOKEN", ""));
    const jwtSingle = Boolean(getEnvVariable("INTERNAL_SERVICE_JWT_SECRET", ""));
    const jwtSecretsRaw = getEnvVariable("INTERNAL_SERVICE_JWT_SECRETS", "");
    const jwtSecretsCount = jwtSecretsRaw
      ? jwtSecretsRaw.split(",").map((s) => s.trim()).filter(Boolean).length
      : 0;

    const ca = Boolean(getEnvVariable("INTERNAL_MTLS_CA_FILE", ""));
    const cert = Boolean(getEnvVariable("INTERNAL_MTLS_CERT_FILE", ""));
    const key = Boolean(getEnvVariable("INTERNAL_MTLS_KEY_FILE", ""));
    const mtlsEnabled = ca || cert || key;
    const rejectUnauthorized = getBooleanEnv("INTERNAL_MTLS_REJECT_UNAUTHORIZED");

    return {
      statusCode: 200,
      bodyType: "json",
      body: {
        auth: {
          static_token: staticToken,
          jwt_single_secret: jwtSingle,
          jwt_secrets_count: jwtSecretsCount,
        },
        mtls: {
          enabled: mtlsEnabled,
          ca,
          cert,
          key,
          reject_unauthorized: rejectUnauthorized ?? true,
        },
      },
    };
  },
});

import { PrismaInstrumentation } from "@prisma/instrumentation";
import * as Sentry from "@sentry/nextjs";
import { getEnvVariable, getNodeEnvironment } from "@opendex/stack-shared/dist/utils/env";
import { sentryBaseConfig } from "@opendex/stack-shared/dist/utils/sentry";
import { nicify } from "@opendex/stack-shared/dist/utils/strings";
import { registerOTel } from "@vercel/otel";
import "./polyfills.node";

// This is a hack for making prisma instrumentation work.
// Somehow prisma instrumentation accesses `global` and it makes edge instrumentation complain.
(globalThis as any).global = globalThis;

export function registerNode() {
  registerOTel({
    serviceName: "stack-backend",
    instrumentations: [new PrismaInstrumentation()],
  });

  process.title = "stack-backend (node/nextjs)";

  Sentry.init({
    ...sentryBaseConfig,
    dsn: getEnvVariable("NEXT_PUBLIC_SENTRY_DSN", ""),
    enabled: getNodeEnvironment() !== "development" && !getEnvVariable("CI", ""),
    beforeSend(event, hint) {
      const error = hint.originalException;
      let nicified;
      try {
        nicified = nicify(error, { maxDepth: 8 });
      } catch (e) {
        nicified = `Error occurred during nicification: ${e}`;
      }
      if (error instanceof Error) {
        event.extra = {
          ...event.extra,
          cause: error.cause,
          errorProps: {
            ...error,
          },
          nicifiedError: nicified,
        };
      }
      return event;
    },
  });
}

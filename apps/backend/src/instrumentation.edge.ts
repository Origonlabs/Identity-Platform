import * as Sentry from "@sentry/nextjs";
import { getEnvVariable, getNodeEnvironment } from "@opendex/stack-shared/dist/utils/env";
import { sentryBaseConfig } from "@opendex/stack-shared/dist/utils/sentry";
import { nicify } from "@opendex/stack-shared/dist/utils/strings";

// Edge runtime version of instrumentation must avoid Node-only APIs (process, util, fs, etc.)
export const runtime = "edge";

export function registerEdge() {
  Sentry.init({
    ...sentryBaseConfig,

    dsn: getEnvVariable("NEXT_PUBLIC_SENTRY_DSN", ""),

    enabled: getNodeEnvironment() !== "development" && !getEnvVariable("CI", ""),

    // Add exception metadata to the event
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

import { captureError, registerErrorSink } from "@opendex/stack-shared/dist/utils/errors";

export function ensurePolyfilledEdge(
  sink?: (location: string, error: unknown) => void,
) {
  if (sink) {
    registerErrorSink(sink);
  }

  if ("addEventListener" in globalThis) {
    globalThis.addEventListener("unhandledrejection", (event) => {
      captureError("unhandled-browser-promise-rejection", event.reason);
      console.error("Unhandled promise rejection", event.reason);
    });
  }
}


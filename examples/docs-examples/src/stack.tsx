import "server-only";

import { StackServerApp } from "@opendex/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
  }
});

import { StackClientApp } from "@opendex/stack";

export const stackClientApp = new StackClientApp({
  baseUrl: "http://localhost:8102",
  tokenStore: "nextjs-cookie",
});

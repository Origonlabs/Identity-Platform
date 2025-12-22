require("server-only");

const { StackServerApp } = require("@opendex/stack");

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

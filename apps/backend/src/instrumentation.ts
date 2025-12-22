export async function register() {
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NEXT_RUNTIME === "edge") {
    const { registerEdge } = await import("./instrumentation.edge");
    return registerEdge();
  }

  const { registerNode } = await import("./instrumentation.node");
  return registerNode();
}

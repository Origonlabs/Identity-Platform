import { StackServerApp } from '@opendex/stack';
import "server-only";

function envAtlasOrStack(name: string) {
  return process.env[name.replace('STACK_', 'ATLAS_')] ?? process.env[name];
}

// Explicitly configure Atlas Identity Platform for docs app
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  projectId: envAtlasOrStack('NEXT_PUBLIC_STACK_PROJECT_ID'),
  publishableClientKey: envAtlasOrStack('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY'),
  secretServerKey: envAtlasOrStack('STACK_SECRET_SERVER_KEY'),
  baseUrl: envAtlasOrStack('NEXT_PUBLIC_STACK_API_URL'),
});

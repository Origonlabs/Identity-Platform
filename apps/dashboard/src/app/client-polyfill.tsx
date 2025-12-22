"use client";

import * as Sentry from "@sentry/nextjs";
import { useUser } from "@opendex/stack";
import { Suspense, useEffect } from "react";

// ensure that the polyfills are loaded even on the client
import "../polyfills.edge";

export function ClientPolyfill() {
  return <Suspense fallback={null}><InnerClientPolyfill /></Suspense>;
}

function InnerClientPolyfill() {
  const user = useUser();

  useEffect(() => {
    Sentry.setUser(user ? {
      id: user.id,
      username: user.displayName ?? user.primaryEmail ?? user.id,
      email: user.primaryEmail ?? undefined,
    } : null);

    return () => {};
  }, [user]);


  return null;
}

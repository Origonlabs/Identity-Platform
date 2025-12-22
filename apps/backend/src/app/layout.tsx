import type { Metadata } from 'next';
import React from 'react';
import '../polyfills.node';

export const metadata: Metadata = {
  title: 'Atlas Identity Platform API',
  description: 'API endpoint of Atlas Identity Platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

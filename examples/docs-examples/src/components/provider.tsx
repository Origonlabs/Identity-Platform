'use client';
import { StackTheme } from "@opendex/stack";

export default function Provider({ children }) {
  return (
    <StackTheme>
      {children}
    </StackTheme>
  );
}

"use client";

import * as confetti from "canvas-confetti";
import { useEffect } from "react";
import { runAsynchronously } from "@opendex/stack-shared/dist/utils/promises";
import { throwErr } from "@opendex/stack-shared/dist/utils/errors";


export function Confetti() {
  useEffect(() => {
    runAsynchronously(confetti.default() ?? throwErr("Confetti failed to load"));
  }, []);

  return (<></>);
}

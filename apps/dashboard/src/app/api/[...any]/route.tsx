import { nicify } from "@opendex/stack-shared/dist/utils/strings";
import { NextRequest, NextResponse } from "next/server";
import "../../../polyfills.node";

const handler = async (req: NextRequest) => {
  const msg = "You attempted to access /api on the Atlas Identity Platform dashboard URL, instead of the API URL.\n\nFor more guidance, please contact support: support@opendex.com";
  console.warn(`${req.headers.has('x-stack-project-id') ? `Project ${req.headers.get('x-stack-project-id')}` : "A user"} attempted to access the old dashboard API.`, nicify(req));
  return NextResponse.json({
    error: msg,
  }, {
    status: 400,
  });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;

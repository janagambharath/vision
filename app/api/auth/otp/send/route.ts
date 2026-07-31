import { NextResponse } from "next/server";

/** Phone-number sign-in was retired in favour of Google customer accounts. */
export function POST() {
  return NextResponse.json({ error: "Phone-number sign-in is no longer available. Continue with Google." }, { status: 410 });
}

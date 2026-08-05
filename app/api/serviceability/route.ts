import { NextResponse } from "next/server";
import { getLocalServiceability } from "@/lib/local-service";

export function GET(request: Request) {
  const pincode = new URL(request.url).searchParams.get("pincode")?.trim() ?? "";
  const serviceability = getLocalServiceability(pincode);
  return NextResponse.json(serviceability, { status: serviceability.serviceable ? 200 : 400 });
}

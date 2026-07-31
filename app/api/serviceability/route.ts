import { NextResponse } from "next/server";

export function GET(request: Request) {
  const pincode = new URL(request.url).searchParams.get("pincode")?.trim() ?? "";
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ serviceable: false, message: "Enter a valid 6-digit pincode." }, { status: 400 });
  }

  return NextResponse.json({
    serviceable: true,
    message: "Delivery is available for this pincode. Your COD order will be confirmed before dispatch."
  });
}

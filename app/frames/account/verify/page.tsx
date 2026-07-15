import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setCustomerSession } from "@/lib/customer-auth";
import Link from "next/link";

export const metadata = {
  title: "Verify Security Code | Vision Vistara",
  robots: { index: false, follow: false }
};

interface VerifyPageProps {
  searchParams: Promise<{ phone?: string; dev_otp?: string; error?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const query = await searchParams;
  const phone = query.phone ?? "";
  const devOtp = query.dev_otp ?? "";

  if (!phone) {
    redirect("/frames/account/login");
  }

  async function verifyOtpAction(formData: FormData) {
    "use server";

    const phoneValue = String(formData.get("phone") ?? "");
    const codeValue = String(formData.get("code") ?? "").trim();

    if (!codeValue) {
      redirect(`/frames/account/verify?phone=${phoneValue}&error=empty`);
    }

    // Find the latest unexpired, unused code for this phone number
    const codeRecord = await prisma.otpCode.findFirst({
      where: {
        phone: phoneValue,
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!codeRecord || codeRecord.code !== codeValue) {
      // Increment attempt counter if a record was found
      if (codeRecord) {
        await prisma.otpCode.update({
          where: { id: codeRecord.id },
          data: { attempts: { increment: 1 } }
        });
      }
      redirect(`/frames/account/verify?phone=${phoneValue}&error=invalid`);
    }

    // Mark the OTP code as used
    await prisma.otpCode.update({
      where: { id: codeRecord.id },
      data: { used: true }
    });

    // Resolve or provision the customer User account
    let user = await prisma.user.findFirst({
      where: { phone: phoneValue }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: phoneValue,
          name: "Valued Customer"
        }
      });
    }

    // Write HMAC signed secure cookie session
    await setCustomerSession(user.id, user.phone ?? phoneValue);

    redirect("/frames/account");
  }

  return (
    <main className="vv-section bg-paper min-h-[70vh] flex items-center justify-center">
      <div className="vv-container max-w-md">
        <div className="vv-card p-8 bg-white border border-slate-100 shadow-soft">
          <p className="vv-kicker text-retail">Security Code Verification</p>
          <h1 className="text-3xl font-extrabold text-slate-900 font-sans">Verify Phone</h1>
          <p className="mt-2 text-slate-500 text-sm">
            We sent a code to <span className="font-bold text-slate-800">+{phone}</span>. Enter it below to secure your access.
          </p>

          {devOtp && (
            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs font-bold text-teal-800">
              ⚡ Development Mode Helper: Your OTP is <span className="font-mono text-sm underline">{devOtp}</span>.
            </div>
          )}

          {query.error === "invalid" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
              The OTP code you entered is invalid or has expired. Please try again.
            </div>
          )}

          <form action={verifyOtpAction} className="mt-6 space-y-4">
            <input type="hidden" name="phone" value={phone} />

            <div className="grid gap-1">
              <label htmlFor="code" className="text-xs font-bold text-slate-500 uppercase">6-Digit Code</label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                pattern="\d{6}"
                placeholder="000000"
                required
                autoFocus
                className="store-input tracking-[0.25em] text-center font-mono text-lg font-bold"
              />
            </div>

            <button type="submit" className="vv-button-retail w-full py-3 font-bold justify-center">
              Verify Code & Continue
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            Did not receive a code? <Link href="/frames/account/login" className="text-teal-600 font-bold hover:underline">Resend request</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

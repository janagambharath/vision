import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

export const metadata = {
  title: "Customer Login | Vision Vistara",
  robots: { index: false, follow: false }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;

  async function sendOtpAction(formData: FormData) {
    "use server";

    const phoneInput = String(formData.get("phone") ?? "").replace(/\D/g, "");
    if (phoneInput.length < 10) {
      redirect("/frames/account/login?error=invalid-phone");
    }

    // Standardize format: e.g. 10 digits to 91XXXXXXXXXX
    const cleanPhone = phoneInput.length === 10 ? `91${phoneInput}` : phoneInput;

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save to DB
    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code: otpCode,
        expiresAt
      }
    });

    let sent = false;
    try {
      if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
        // Send actual WhatsApp Template
        await sendWhatsAppTemplate(cleanPhone, "customer_otp", [otpCode]);
        sent = true;
      }
    } catch (err) {
      console.warn("⚠️ Failed to send real WhatsApp OTP:", err);
    }

    // For dev ease, write to console
    console.info(`[LOGIN OTP] Code for ${cleanPhone} is ${otpCode}`);

    // If WhatsApp isn't fully configured or fails in local dev, pass it in URL
    // only in development to bypass lockouts
    const isDev = process.env.NODE_ENV !== "production";
    const devParam = (!sent && isDev) ? `&dev_otp=${otpCode}` : "";

    redirect(`/frames/account/verify?phone=${cleanPhone}${devParam}`);
  }

  return (
    <main className="vv-section bg-paper min-h-[70vh] flex items-center justify-center">
      <div className="vv-container max-w-md">
        <div className="vv-card p-8 bg-white border border-slate-100 shadow-soft">
          <p className="vv-kicker text-retail">Secure Access</p>
          <h1 className="text-3xl font-extrabold text-slate-900 font-sans">Customer Login</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Enter your mobile number registered during your checkout or appointment. We will send you a secure OTP code.
          </p>

          {query.error === "invalid-phone" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
              Please enter a valid 10-digit mobile number.
            </div>
          )}

          <form action={sendOtpAction} className="mt-6 space-y-4">
            <div className="grid gap-1">
              <label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="9876543210"
                required
                className="store-input"
              />
            </div>

            <button type="submit" className="vv-button-retail w-full py-3 font-bold justify-center">
              Send OTP via WhatsApp
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            Secure OTP authentication. No password required.
          </div>
        </div>
      </div>
    </main>
  );
}

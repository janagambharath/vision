"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, RefreshCw, Key, ArrowRight, CheckCircle2 } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send verification code.");
      
      setInfo("Verification code sent to your phone number on WhatsApp.");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid verification code.");
      
      // Success redirect
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="vv-section bg-paper min-h-[70vh] flex items-center justify-center">
      <div className="vv-container max-w-md">
        <div className="vv-card p-8 bg-white border border-slate-200 grid gap-6 shadow-sm">
          
          <div className="text-center">
            <p className="vv-kicker text-retail">Customer Area</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1 font-sans">
              {step === "phone" ? "Sign In / Register" : "Verify Phone"}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {step === "phone"
                ? "Enter your mobile number to receive a secure 6-digit verification code on WhatsApp."
                : `Enter the 6-digit code sent to ${phone}.`}
            </p>
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 text-red-800 text-xs font-bold p-3">
              {error}
            </div>
          )}

          {info && (
            <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold p-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{info}</span>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={sendOtp} className="grid gap-4">
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Mobile Number
                <div className="relative">
                  <input
                    className="store-input pl-9"
                    type="tel"
                    placeholder="e.g. 7842938316"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="vv-button-retail py-3 justify-center w-full font-bold flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Request Verification Code"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="grid gap-4">
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Verification Code (6-digit)
                <div className="relative">
                  <input
                    className="store-input pl-9 text-center tracking-widest font-extrabold text-lg"
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    disabled={loading}
                  />
                  <Key className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="vv-button-retail py-3 justify-center w-full font-bold flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify and Login"}
              </button>

              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-bold mt-2"
                disabled={loading}
              >
                Change phone number
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}

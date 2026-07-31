"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";

export default function CustomerLoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/providers")
      .then(async (response) => response.ok ? response.json() : {})
      .then((providers) => setGoogleAvailable(Boolean(providers.google)))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const getCallbackUrl = () => {
    const requestedCallback = new URLSearchParams(window.location.search).get("callbackUrl");
    return requestedCallback?.startsWith("/") && !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/account";
  };

  const signInWithGoogle = () => {
    setError(null);
    setLoading(true);
    void signIn("google", { callbackUrl: getCallbackUrl() }).catch(() => {
      setLoading(false);
      setError("Google sign-in could not be started. Please try again.");
    });
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-paper vv-section">
      <div className="vv-container max-w-md">
        <div className="vv-card grid gap-6 border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></span>
            <p className="vv-kicker mt-4 text-retail">Customer Account</p>
            <h1 className="mt-1 font-sans text-3xl font-extrabold text-slate-900">Continue with Google</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Use your Google account to securely view orders, home-trial requests, prescriptions, and saved frames.</p>
          </div>

          {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{error}</div> : null}

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading || googleAvailable !== true}
            className="flex w-full items-center justify-center gap-3 rounded-vv border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading || googleAvailable === null ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-blue-600 via-red-500 to-amber-400 text-xs font-black text-white">G</span>}
            {loading ? "Opening Google…" : googleAvailable === null ? "Checking Google sign-in…" : "Continue with Google"}
            {!loading && googleAvailable === true ? <ArrowRight className="h-4 w-4" /> : null}
          </button>

          {googleAvailable === false ? <p className="rounded border border-amber-200 bg-amber-50 p-3 text-center text-xs font-bold text-amber-800">Google sign-in is not configured right now. Please contact Vision Vistara for help.</p> : null}
          <p className="text-center text-[11px] leading-relaxed text-slate-400">Phone-number sign-in has been retired. Your delivery phone number is collected only during checkout.</p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Glasses, Menu, PhoneCall, X } from "lucide-react";
import { CLINIC_PHONE } from "@/lib/constants";

const clinicLinks = [
  ["About", "/#about"],
  ["Services", "/#services"],
  ["Diagnostics", "/#diagnostics"],
  ["Contact", "/#contact"],
  ["Appointment", "/#appointment"],
];

const storeLinks = [
  ["Shop", "/frames"],
  ["Search", "/frames/search"],
  ["Try-On", "/frames/try-on"],
  ["Try at Home", "/frames/try-at-home"],
  ["Cart", "/frames/cart"],
  ["Clinic", "/"],
];

export function SiteHeader({ mode = "clinic" }: { mode?: "clinic" | "store" }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const storeMode = mode === "store";
  const links = storeMode ? storeLinks : clinicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 text-white backdrop-blur-lg">
      <div className="vv-container flex h-20 items-center justify-between gap-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          aria-label="Vision Vistara home"
        >
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white shrink-0">
            <Image
              src="/assets/vision-vistara-eye-logo.png"
              width={56}
              height={56}
              alt=""
              className="scale-125"
            />
          </span>
          <span className="grid min-w-0 leading-tight">
            <strong className="text-sm font-extrabold uppercase">
              Vision Vistara
            </strong>
            <span className="text-xs font-bold text-slate-300">
              Optics &amp; Lasers Eye Care
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-5 text-sm font-bold text-slate-300 lg:flex"
          aria-label="Primary navigation"
        >
          {storeMode ? (
            <>
              <Link href="/frames" className="hover:text-white transition">Shop</Link>
              <Link href="/frames/search" className="hover:text-white transition">Search</Link>
              <Link href="/frames/try-on" className="hover:text-white transition">Try-On</Link>
              <Link href="/frames/try-at-home" className="hover:text-white transition">Try at Home</Link>
              <Link href="/frames/cart" className="hover:text-white transition">Cart</Link>
              <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition">
                Clinic
              </Link>
            </>
          ) : (
            <>
              {clinicLinks.map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-white transition">
                  {label}
                </Link>
              ))}
              <Link
                href="/frames"
                className="rounded-full bg-white px-4 py-2 text-ink font-extrabold hover:bg-slate-100 transition"
              >
                Frames Store
              </Link>
            </>
          )}
        </nav>

        {/* Desktop CTA + Phone */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            className="inline-flex items-center gap-2 text-sm font-extrabold hover:text-cyan-300 transition"
            href={`tel:+91${CLINIC_PHONE}`}
          >
            <PhoneCall className="h-4 w-4 text-cyan-300" />
            {CLINIC_PHONE}
          </a>
          <Link
            className={storeMode ? "vv-button-retail" : "vv-button-primary"}
            href={storeMode ? "/frames/cart" : "/#appointment"}
          >
            {storeMode ? (
              <Glasses className="h-4 w-4" />
            ) : (
              <CalendarCheck className="h-4 w-4" />
            )}
            {storeMode ? "Cart" : "Book Appointment"}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-ink/98 backdrop-blur-lg animate-[accordion-open_0.2s_ease-out]">
          <nav className="vv-container py-4 grid gap-1" aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-white/10 mt-2 pt-3 grid gap-2">
              <a
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-cyan-300"
                href={`tel:+91${CLINIC_PHONE}`}
              >
                <PhoneCall className="h-4 w-4" />
                {CLINIC_PHONE}
              </a>
              <Link
                className={`${storeMode ? "vv-button-retail" : "vv-button-primary"} justify-center`}
                href={storeMode ? "/frames/cart" : "/#appointment"}
                onClick={() => setMobileOpen(false)}
              >
                {storeMode ? (
                  <Glasses className="h-4 w-4" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                {storeMode ? "Cart" : "Book Appointment"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

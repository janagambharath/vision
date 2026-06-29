import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Glasses, PhoneCall } from "lucide-react";
import { CLINIC_PHONE } from "@/lib/constants";

const clinicLinks = [
  ["About", "/about"],
  ["Services", "/services"],
  ["Diagnostics", "/diagnostics"],
  ["Contact", "/contact"],
  ["Appointments", "/appointments"]
];

export function SiteHeader({ mode = "clinic" }: { mode?: "clinic" | "store" }) {
  const storeMode = mode === "store";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
      <div className="vv-container flex h-20 items-center justify-between gap-5">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Vision Vistara home">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white">
            <Image src="/assets/vision-vistara-eye-logo.png" width={56} height={56} alt="" className="scale-125" />
          </span>
          <span className="grid min-w-0 leading-tight">
            <strong className="text-sm font-extrabold uppercase">Vision Vistara</strong>
            <span className="text-xs font-bold text-slate-300">Optics &amp; Lasers Eye Care</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-bold text-slate-300 lg:flex" aria-label="Primary navigation">
          {storeMode ? (
            <>
              <Link href="/frames">Shop</Link>
              <Link href="/frames/search">Search</Link>
              <Link href="/frames/try-at-home">Try at Home</Link>
              <Link href="/frames/cart">Cart</Link>
              <Link href="/contact">Clinic</Link>
            </>
          ) : (
            <>
              {clinicLinks.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
              <Link href="/frames" className="rounded-full bg-white px-4 py-2 text-ink">
                Frames Store
              </Link>
            </>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a className="inline-flex items-center gap-2 text-sm font-extrabold" href={`tel:+91${CLINIC_PHONE}`}>
            <PhoneCall className="h-4 w-4 text-cyan-300" />
            {CLINIC_PHONE}
          </a>
          <Link className={storeMode ? "vv-button-retail" : "vv-button-primary"} href={storeMode ? "/frames/cart" : "/appointments"}>
            {storeMode ? <Glasses className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
            {storeMode ? "Cart" : "Book Appointment"}
          </Link>
        </div>
      </div>
    </header>
  );
}

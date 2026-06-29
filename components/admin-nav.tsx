import Link from "next/link";

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Orders", "/admin/orders"],
  ["Leads", "/admin/leads"],
  ["Inventory", "/admin/inventory"]
];

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-5 py-3" aria-label="Admin navigation">
      {adminLinks.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700">
          {label}
        </Link>
      ))}
    </nav>
  );
}

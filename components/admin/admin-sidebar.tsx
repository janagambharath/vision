"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gem,
  Home,
  Layers,
  LogOut,
  Menu,
  ShoppingBag,
  Sparkles,
  Star,
  ShieldCheck,
  Ticket,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";

const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Layers },
  { href: "/admin/brands", label: "Brands", icon: Gem },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/admin/previews", label: "AI monitoring", icon: Sparkles },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/privacy-requests", label: "Privacy requests", icon: ShieldCheck },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/try-at-home", label: "Try At Home", icon: Truck },
  { href: "/admin/promotions", label: "Promotions", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobilePrimaryItems = adminMenuItems.filter((item) => ["/admin", "/admin/products", "/admin/orders"].includes(item.href));
  const mobileMoreItems = adminMenuItems.filter((item) => !mobilePrimaryItems.includes(item));
  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const hasActiveMoreItem = mobileMoreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Mobile top bar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:thin]">
          <Link href="/admin" className="mr-1 shrink-0 text-sm font-extrabold text-slate-900" aria-label="Admin dashboard">
            VV <span className="text-teal-600">Admin</span>
          </Link>
          {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
                isActive(item.href)
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-menu"
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              mobileMenuOpen || hasActiveMoreItem
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700"
            }`}
          >
            <Menu className="h-4 w-4" />
            More
          </button>
        </div>
        {mobileMenuOpen ? (
          <div id="admin-mobile-menu" className="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-3 sm:grid-cols-3">
            {mobileMoreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    isActive(item.href)
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
            <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
              <LogOut className="h-4 w-4 shrink-0" />
              Back to site
            </Link>
          </div>
        ) : null}
      </nav>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          {!collapsed && (
            <Link href="/admin" className="text-lg font-extrabold text-slate-900 truncate">
              VV <span className="text-teal-600">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="grid gap-0.5">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    isActive(item.href)
                      ? "bg-teal-50 text-teal-700 font-bold shadow-sm shadow-teal-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive(item.href) ? "text-teal-600" : "text-slate-400"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 p-2">
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title="Back to site"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}

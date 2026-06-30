import { MessageCircle, Search, Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type { Prisma, LeadStatus } from "@prisma/client";

export const metadata = { title: "Admin Leads" };

export default async function AdminLeadsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};

  const where: Prisma.LeadWhereInput = {};

  if (params.status) {
    where.status = params.status as LeadStatus;
  }

  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } }
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80
  }).catch(() => []);

  async function updateLeadStatus(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "") as LeadStatus;

    if (id && status) {
      await prisma.lead.update({
        where: { id },
        data: { status }
      });
    }


    redirect("/admin/leads");
  }

  return (
    <main className="vv-section">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold">Leads &amp; Follow-up</h1>
          <p className="mt-2 text-slate-600">Review patient eye-test appointments, frames try-at-home requests, and conversion pipelines.</p>
        </div>

        {/* Filter bar */}
        <div className="vv-card mb-6 p-4">
          <form className="grid gap-3 md:grid-cols-3" method="get" action="/admin/leads">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Search Leads
              <div className="relative">
                <input className="store-input pl-9" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, Phone, Email..." />
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Status Filter
              <select className="store-input" name="status" defaultValue={params.status ?? ""}>
                <option value="">All Leads</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="HOME_TRIAL_BOOKED">Home Trial Booked</option>
                <option value="TRY_ON_DONE">Try On Done</option>
                <option value="FRAME_SELECTED">Frame Selected</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </label>

            <button className="vv-button-retail self-end" type="submit">
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </form>
        </div>

        {/* Leads List */}
        <div className="grid gap-4">
          {leads.length ? (
            leads.map((lead) => {
              const payload = lead.payload as Record<string, unknown> | null;
              const dateVal = payload?.preferredDate || payload?.date;
              const slotVal = payload?.preferredSlot || payload?.time;

              return (
                <article key={lead.id} className="vv-card p-5 hover:shadow-strong transition grid gap-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold">{lead.name}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        lead.status === "CONVERTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : lead.status === "NEW"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Phone: <strong className="text-slate-800">{lead.phone}</strong> · 
                      Source: <strong className="text-slate-800">{lead.source.replace(/_/g, " ")}</strong> · 
                      Created: {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                    </p>

                    {/* Meta info / payloads */}
                    {payload ? (
                      <div className="mt-3 bg-slate-50 rounded-vv p-3 text-xs text-slate-600 grid gap-1">
                        {dateVal ? <p>Preferred Date: <strong>{new Date(String(dateVal)).toLocaleDateString()}</strong></p> : null}
                        {slotVal ? <p>Preferred Slot: <strong>{String(slotVal)}</strong></p> : null}
                        {payload.intent ? <p>Intent: <strong>{String(payload.intent)}</strong></p> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center md:self-center">
                    <form action={updateLeadStatus} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={lead.id} />
                      <select name="status" className="store-input py-1 text-xs min-h-9" defaultValue={lead.status}>
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="HOME_TRIAL_BOOKED">Home Trial</option>
                        <option value="CONVERTED">Converted</option>
                      </select>
                      <button className="vv-button-retail text-xs py-2 min-h-9 px-3" type="submit">
                        Update
                      </button>
                    </form>

                    <a className="vv-button bg-emerald-400 text-ink text-xs py-2 min-h-9 px-3 inline-flex items-center gap-1" href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(lead.name)}%2C%20this%20is%20Vision%20Vistara%20following%20up%20on%20your%20request.`} target="_blank" rel="noopener">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="vv-card p-12 text-center text-slate-500">
              No leads found matching filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

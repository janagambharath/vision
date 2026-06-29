import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export default async function AdminLeadsPage() {
  await requireAdmin();
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 80 }).catch(() => []);

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Leads</p>
        <h1 className="text-4xl font-extrabold">WhatsApp and appointment follow-up</h1>
        <div className="mt-8 grid gap-3">
          {leads.length ? leads.map((lead) => (
            <article key={lead.id} className="vv-card p-5">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">{lead.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{lead.phone} · {lead.source} · {lead.status.replace(/_/g, " ")}</p>
                </div>
                <a className="vv-button-light" href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">Follow up</a>
              </div>
            </article>
          )) : <p className="vv-card p-6 text-slate-600">No leads yet.</p>}
        </div>
      </div>
    </main>
  );
}

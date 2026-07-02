import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminCustomersPage() {
  await requireAdmin();

  const [users, guestOrders, leads] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { orders: true, wishlistItems: true }
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      where: { userId: null }
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 80
    })
  ]);

  const guestCustomers = new Map<string, { name: string; phone: string; orders: number; spend: number }>();
  for (const order of guestOrders) {
    const key = order.phone;
    const existing = guestCustomers.get(key) ?? { name: order.customerName, phone: order.phone, orders: 0, spend: 0 };
    existing.orders += 1;
    existing.spend += order.grandTotalPaise;
    guestCustomers.set(key, existing);
  }

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Customers</p>
        <h1 className="text-4xl font-extrabold">Customers and repeat-purchase signals</h1>
        <p className="mt-2 text-slate-600">Registered customers, guest checkout buyers, and lead records are stored in PostgreSQL for follow-up and reorder workflows.</p>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <Metric label="Registered customers" value={users.length} />
          <Metric label="Guest buyers" value={guestCustomers.size} />
          <Metric label="Lead contacts" value={leads.length} />
        </section>

        <section className="mt-8 grid gap-3">
          {[...guestCustomers.values()].map((customer) => (
            <article key={customer.phone} className="vv-card grid gap-3 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-xl font-extrabold">{customer.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{customer.phone} | {customer.orders} order(s)</p>
              </div>
              <strong className="text-retail">{formatMoney(customer.spend)}</strong>
            </article>
          ))}
          {!guestCustomers.size ? <p className="vv-card p-6 text-slate-600">No checkout customers yet.</p> : null}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="vv-card p-5">
      <strong className="block text-3xl font-extrabold">{value}</strong>
      <span className="text-sm font-bold text-slate-500">{label}</span>
    </article>
  );
}

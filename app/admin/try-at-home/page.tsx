import Link from "next/link";
import { revalidatePath } from "next/cache";
import { MessageCircle, Phone, Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import { requireAdmin, requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import type { OrderStatus } from "@prisma/client";

export const metadata = { title: "Try-at-Home Scheduling | Admin" };

export default async function AdminTryAtHomePage() {
  await requireAdmin();

  // Fetch all requests sorted by preferredDate ASC
  const requests = await prisma.tryAtHomeRequest.findMany({
    orderBy: { preferredDate: "asc" }
  });

  async function updateRequestStatus(formData: FormData) {
    "use server";
    await requireManager();

    const id = String(formData.get("id") ?? "");
    const newStatus = String(formData.get("status") ?? "") as OrderStatus;

    if (!id || !newStatus) return;

    const req = await prisma.tryAtHomeRequest.update({
      where: { id },
      data: { status: newStatus }
    });

    await prisma.activityLog.create({
      data: {
        action: "TRY_AT_HOME_STATUS_UPDATED",
        entityType: "try_at_home",
        entityId: id,
        metadata: { status: newStatus }
      }
    });

    // Notify customer if status matches CONFIRMED or COMPLETED
    if (newStatus === "CONFIRMED" && req.phone) {
      await sendWhatsAppTemplate(req.phone, "home_trial_confirmed", [
        req.name,
        new Date(req.preferredDate).toLocaleDateString(),
        req.preferredSlot
      ]);
    }

    revalidatePath("/admin/try-at-home");
  }

  // Helper to group requests by date
  const todayStr = new Date().toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  const categories = {
    Today: [] as typeof requests,
    Tomorrow: [] as typeof requests,
    "Upcoming (This week & later)": [] as typeof requests,
    Past: [] as typeof requests
  };

  requests.forEach((r) => {
    const reqDate = new Date(r.preferredDate);
    const reqDateStr = reqDate.toDateString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (reqDate < now) {
      categories.Past.push(r);
    } else if (reqDateStr === todayStr) {
      categories.Today.push(r);
    } else if (reqDateStr === tomorrowStr) {
      categories.Tomorrow.push(r);
    } else {
      categories["Upcoming (This week & later)"].push(r);
    }
  });

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8">
          <p className="vv-kicker text-retail">Operations</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Try-at-Home Visits</h1>
          <p className="mt-2 text-slate-600">Track, schedule, and confirm frame trial bookings.</p>
        </div>

        {/* Group lists */}
        <div className="grid gap-8">
          {Object.entries(categories).map(([title, list]) => {
            if (list.length === 0) return null;
            return (
              <section key={title} className="grid gap-4">
                <h2 className="text-xl font-extrabold text-slate-700 border-b border-slate-100 pb-2">{title} ({list.length})</h2>
                <div className="grid gap-4">
                  {list.map((req) => (
                    <article
                      key={req.id}
                      className="vv-card p-6 grid gap-4 md:grid-cols-[1fr_240px] items-start hover:shadow-md transition"
                    >
                      {/* Left Info */}
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-extrabold text-slate-900">{req.name}</h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            req.status === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : req.status === "CANCELLED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>Preferred Date: <strong>{new Date(req.preferredDate).toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>Slot preference: <strong>{req.preferredSlot}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>Address: <strong className="text-slate-800">{req.address}</strong></span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold">
                          Items to trials: {req.frameCount} frames ({req.productIds.join(", ")})
                        </p>

                        {req.notes ? (
                          <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-xs text-slate-600">
                            <strong>Note:</strong> {req.notes}
                          </div>
                        ) : null}
                      </div>

                      {/* Right Panel */}
                      <div className="grid gap-3 justify-stretch border-t border-slate-100 md:border-t-0 md:border-l md:border-slate-100 pt-4 md:pt-0 md:pl-6 self-center">
                        <div className="flex gap-2">
                          <a href={`tel:${req.phone}`} className="vv-button-light py-2 px-3 flex-1 justify-center text-xs font-bold flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${req.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vv-button bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 py-2 px-3 flex-1 justify-center text-xs font-bold flex items-center gap-1"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </div>

                        <form action={updateRequestStatus} className="grid gap-2">
                          <input type="hidden" name="id" value={req.id} />
                          <label className="text-xs font-bold text-slate-500 flex flex-col">
                            Update trial status
                            <select className="store-input mt-1 py-1 px-2 text-xs" name="status" defaultValue={req.status}>
                              <option value="TRY_AT_HOME_BOOKED">Booked</option>
                              <option value="CONFIRMED">Confirm Visit</option>
                              <option value="PACKED">Items Packed</option>
                              <option value="SHIPPED">Out for Visit</option>
                              <option value="DELIVERED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </label>
                          <button className="vv-button bg-slate-900 hover:bg-black text-white text-xs font-bold py-1.5 justify-center flex items-center gap-1" type="submit">
                            <RefreshCw className="h-3 w-3" />
                            Update Status
                          </button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

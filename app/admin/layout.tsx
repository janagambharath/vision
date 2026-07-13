import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <AdminSidebar />
      {/* Content area offset for sidebar on desktop */}
      <div className="lg:ml-[240px]">
        {children}
      </div>
    </div>
  );
}

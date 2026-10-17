import { requireAdminPage } from "@/lib/auth/session";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPage();
  return <AdminDashboard />;
}

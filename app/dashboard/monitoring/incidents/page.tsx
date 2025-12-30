import { auth } from "@/lib/auth";
import { getIncidents, autoExpireCheck } from "@/lib/actions/monitoring";
import { IncidentTable } from "@/components/monitoring/incident-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "异常处理",
};

export default async function IncidentsPage() {
  const session = await auth();
  if (!session?.user) return <div>未登录</div>;

  // 惰性检查: 自动超时处理
  await autoExpireCheck();

  const incidents = await getIncidents();
  const canManage =
    session.user.role === "ADMIN" ||
    session.user.role === "TEACHER" ||
    session.user.role === "HEAD";

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">异常记录</h2>
      </div>
      <div className="py-4">
        <IncidentTable data={incidents} canManage={canManage} />
      </div>
    </div>
  );
}

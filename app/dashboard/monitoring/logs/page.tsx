import { auth } from "@/lib/auth";
import { getCheckInLogs } from "@/lib/actions/monitoring";
import { CheckInLogTable } from "@/components/monitoring/check-in-log-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "使用日志",
};

export default async function LogsPage() {
  const session = await auth();
  if (!session?.user) return <div>未登录</div>;

  const logs = await getCheckInLogs();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">实验使用日志</h2>
      </div>
      <div className="py-4">
        <CheckInLogTable data={logs} />
      </div>
    </div>
  );
}

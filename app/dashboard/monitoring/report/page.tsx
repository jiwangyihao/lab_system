import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IncidentForm } from "@/components/monitoring/incident-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "异常上报",
};

export default async function ReportPage() {
  const session = await auth();
  if (!session?.user) return <div>未登录</div>;

  // 获取设备列表用于下拉选择
  // 可以优化为只获取当前用户有预约的设备，或者全部设备
  // 这里获取所有设备，按名称排序
  const equipmentList = await prisma.equipment.findMany({
    select: { id: true, name: true, model: true },
    orderBy: { name: "asc" },
  });

  const formattedEquipment = equipmentList.map((e) => ({
    id: e.id,
    name: `${e.name} (${e.model})`,
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">异常上报</h2>
      </div>
      <div className="py-4">
        <IncidentForm equipmentList={formattedEquipment} />
      </div>
    </div>
  );
}

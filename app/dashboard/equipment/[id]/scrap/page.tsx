import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role, EquipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ScrapRequestForm } from "@/components/business/scrap-request-form";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "设备报废申请 - 实验室设备管理系统",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScrapRequestPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  // 1. 权限校验 (仅 ADMIN, HEAD)
  const userRole = session?.user?.role as string;
  if (userRole !== "ADMIN" && userRole !== "HEAD") {
    redirect("/dashboard");
  }

  // 2. 获取设备信息
  const equipment = await prisma.equipment.findUnique({
    where: { id },
  });

  if (!equipment) {
    return <div>设备不存在</div>;
  }

  if (equipment.status === EquipmentStatus.SCRAPPED) {
    return <div>该设备已报废</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-destructive">设备报废申请</h3>
        <p className="text-sm text-muted-foreground">
          发起设备报废流程，需经过实验室负责人审批。
        </p>
      </div>
      <Separator />

      <div className="p-6 bg-card rounded-lg border shadow-sm max-w-2xl mx-auto">
        <ScrapRequestForm
          equipment={equipment as any} // Cast to any to avoid strict type matching issues for now, or fetch full details if needed
        />
      </div>
    </div>
  );
}

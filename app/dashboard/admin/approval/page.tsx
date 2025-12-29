import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getPurchaseRequestsAction } from "@/lib/actions/purchase";
import { getScrapRequestsAction } from "@/lib/actions/scrap";
import { Separator } from "@/components/ui/separator";
import ApprovalClient from "./approval-client";

export const metadata: Metadata = {
  title: "审批中心 - 实验室设备管理系统",
};

export default async function ApprovalPage() {
  const session = await auth();

  // 1. 权限校验 (ADMIN, TEACHER, HEAD)
  const userRole = session?.user?.role as string;
  const allowedRoles = ["ADMIN", "TEACHER", "HEAD"];
  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }

  // 2. 并行获取数据
  const [purchaseResponse, scrapResponse] = await Promise.all([
    getPurchaseRequestsAction(),
    getScrapRequestsAction(),
  ]);

  if (purchaseResponse.error || scrapResponse.error) {
    return <div>加载数据失败，请重试</div>;
  }

  const purchaseRequests = purchaseResponse.data || [];
  const scrapRequests = scrapResponse.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">审批中心</h3>
        <p className="text-sm text-muted-foreground">
          统一管理设备采购与报废审批申请。
        </p>
      </div>
      <Separator />

      <Suspense fallback={<div>加载中...</div>}>
        <ApprovalClient
          purchaseRequests={purchaseRequests as any}
          scrapRequests={scrapRequests as any}
          userRole={userRole as Role}
        />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getPurchaseRequestsAction } from "@/lib/actions/purchase";
import { getScrapRequestsAction } from "@/lib/actions/scrap";
import { getPendingReservations } from "@/lib/actions/reservation";
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

  // Teachers only see reservation approvals, not purchase/scrap
  const isTeacher = userRole === "TEACHER";

  let purchaseRequests: any[] = [];
  let scrapRequests: any[] = [];
  let reservationRequests: any[] = [];

  if (isTeacher) {
    // Teachers only need reservation data
    const reservationResponse = await getPendingReservations();
    reservationRequests = reservationResponse.data || [];
  } else {
    // ADMIN and HEAD get all data
    const [purchaseResponse, scrapResponse, reservationResponse] =
      await Promise.all([
        getPurchaseRequestsAction(),
        getScrapRequestsAction(),
        getPendingReservations(),
      ]);

    if (purchaseResponse.error || scrapResponse.error) {
      return <div>加载数据失败，请重试</div>;
    }

    purchaseRequests = purchaseResponse.data || [];
    scrapRequests = scrapResponse.data || [];
    reservationRequests = reservationResponse.data || [];
  }

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
          reservationRequests={reservationRequests as any}
          userRole={userRole as Role}
          userId={session?.user?.id as string}
        />
      </Suspense>
    </div>
  );
}

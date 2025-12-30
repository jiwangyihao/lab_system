import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { PurchaseRequestForm } from "@/components/business/purchase-request-form";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "新增采购申请 - 实验室设备管理系统",
};

export default async function NewPurchaseRequestPage() {
  const session = await auth();

  // 1. 权限校验 (仅 ADMIN, TEACHER, HEAD 可用)
  const userRole = session?.user?.role as string;
  const allowedRoles = ["ADMIN", "TEACHER", "HEAD"];
  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">新增采购申请</h3>
        <p className="text-sm text-muted-foreground">
          填写并提交新的实验室设备采购申请。
        </p>
      </div>
      <Separator />

      <div className="p-6 bg-card rounded-lg border shadow-sm max-w-2xl mx-auto">
        <PurchaseRequestForm userRole={userRole} />
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getStaffsAction } from "@/lib/actions/staff";
import StaffClient from "./staff-client";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "员工管理 - 实验室设备管理系统",
};

export default async function StaffPage() {
  const session = await auth();

  // 1. 权限校验 (仅 HEAD 可见)
  const userRole = session?.user?.role as string;
  if (userRole !== "HEAD") {
    redirect("/dashboard");
  }

  // 2. 获取数据
  const { data: staffs, error } = await getStaffsAction();

  if (error || !staffs) {
    return <div>加载失败，请重试</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">员工管理</h3>
        <p className="text-sm text-muted-foreground">
          管理实验室管理员、教师及负责人的账号权限。
        </p>
      </div>
      <Separator />

      <Suspense fallback={<div>Loading...</div>}>
        <StaffClient initialData={staffs} />
      </Suspense>
    </div>
  );
}

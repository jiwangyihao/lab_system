"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EquipmentForm,
  type EquipmentFormData,
} from "@/components/business/equipment-form";
import { createEquipmentAction } from "@/lib/actions/equipment";

// ========== 新增设备页 ==========

interface PageProps {
  admins: { id: string; name: string | null; username: string | null }[];
}

export default function NewEquipmentPage({ admins }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (data: EquipmentFormData) => {
    setIsLoading(true);
    try {
      const result = await createEquipmentAction(data);
      if (result.success) {
        toast.success(result.message);
        router.push("/dashboard/equipment");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("创建设备失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <IconArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新增设备</h1>
          <p className="text-muted-foreground">添加新的实验室设备</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>设备信息</CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={isLoading}
            admins={admins}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EquipmentForm,
  type EquipmentFormData,
} from "@/components/business/equipment-form";
import {
  getEquipmentByIdAction,
  updateEquipmentAction,
  type EquipmentDetail,
} from "@/lib/actions/equipment";

// ========== 编辑设备页 ==========

interface PageProps {
  userRole: string;
}

export default function EditEquipmentPage({ userRole }: PageProps) {
  const router = useRouter();
  const params = useParams();
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = React.useState<EquipmentDetail | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // 加载设备详情
  React.useEffect(() => {
    const loadEquipment = async () => {
      setIsLoading(true);
      try {
        const result = await getEquipmentByIdAction(equipmentId);
        if (result.success && result.data) {
          setEquipment(result.data);
        } else {
          toast.error(result.message || "加载设备详情失败");
          router.push("/dashboard/equipment");
        }
      } catch {
        toast.error("加载设备详情失败");
        router.push("/dashboard/equipment");
      } finally {
        setIsLoading(false);
      }
    };

    loadEquipment();
  }, [equipmentId, router]);

  const handleSubmit = async (data: EquipmentFormData) => {
    setIsSaving(true);
    try {
      const result = await updateEquipmentAction({
        ...data,
        id: equipmentId,
      });

      if (result.success) {
        toast.success(result.message);
        router.push(`/dashboard/equipment/${equipmentId}`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("更新设备失败");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !equipment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <IconArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">编辑设备</h1>
          <p className="text-muted-foreground">{equipment.name}</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>设备信息</CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentForm
            mode="edit"
            defaultValues={{
              id: equipment.id,
              name: equipment.name,
              model: equipment.model,
              manufacturer: equipment.manufacturer,
              purchaseDate: new Date(equipment.purchaseDate),
              status: equipment.status,
              rentalPrice: equipment.rentalPrice,
              maintenanceCycle: equipment.maintenanceCycle,
            }}
            onSubmit={handleSubmit}
            isLoading={isSaving}
            userRole={userRole}
          />
        </CardContent>
      </Card>
    </div>
  );
}

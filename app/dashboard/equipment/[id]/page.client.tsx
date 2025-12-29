"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  IconArrowLeft,
  IconEdit,
  IconSettings,
  IconHistory,
  IconInfoCircle,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  TimeSlotEditor,
  type TimeSlotConfig,
} from "@/components/business/timeslot-editor";
import { MaintenanceLogList } from "@/components/business/maintenance-log-list";
import {
  getEquipmentByIdAction,
  changeEquipmentStatusAction,
  type EquipmentDetail,
} from "@/lib/actions/equipment";
import {
  batchCreateTimeSlotsAction,
  createTimeSlotAction,
  deleteTimeSlotAction,
} from "@/lib/actions/timeslot";
import {
  createMaintenanceLogAction,
  deleteMaintenanceLogAction,
} from "@/lib/actions/maintenance";
import type {
  EquipmentStatus,
  MaintenanceLogData,
} from "@/lib/schemas/equipment.schema";

// ========== 状态配置 ==========

const statusConfig: Record<
  EquipmentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  AVAILABLE: { label: "空闲", variant: "default" },
  OCCUPIED: { label: "占用", variant: "secondary" },
  MAINTENANCE: { label: "维修中", variant: "outline" },
  SCRAP_REQUESTED: { label: "报废申请中", variant: "outline" },
  SCRAPPED: { label: "已报废", variant: "destructive" },
};

// ========== 设备详情页 ==========

interface EquipmentDetailPageProps {
  userRole?: string;
}

export default function EquipmentDetailPage({
  userRole = "STUDENT",
}: EquipmentDetailPageProps) {
  const router = useRouter();
  const params = useParams();
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = React.useState<EquipmentDetail | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlotConfig[]>([]);
  const [isSavingSlots, setIsSavingSlots] = React.useState(false);
  const [isAddingLog, setIsAddingLog] = React.useState(false);

  // 加载设备详情
  const loadEquipment = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEquipmentByIdAction(equipmentId);
      if (result.success && result.data) {
        setEquipment(result.data);
        // 转换时段数据
        setTimeSlots(
          result.data.timeSlots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            specificDate: slot.specificDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
          }))
        );
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
  }, [equipmentId, router]);

  React.useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // 保存时段配置
  const handleSaveTimeSlots = async () => {
    setIsSavingSlots(true);
    try {
      // 提取周期时段
      const weeklySlots = timeSlots
        .filter((s) => s.dayOfWeek !== null)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek!,
          startTime: s.startTime,
          endTime: s.endTime,
        }));

      // 批量创建周期时段
      if (weeklySlots.length > 0) {
        const result = await batchCreateTimeSlotsAction({
          equipmentId,
          slots: weeklySlots,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
      }

      // 处理特殊日期时段（逐个创建新的）
      const specialSlots = timeSlots.filter(
        (s) => s.specificDate !== null && !s.id
      );
      for (const slot of specialSlots) {
        await createTimeSlotAction({
          equipmentId,
          dayOfWeek: null,
          specificDate: slot.specificDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
        });
      }

      toast.success("时段配置保存成功");
      loadEquipment();
    } catch {
      toast.error("保存时段配置失败");
    } finally {
      setIsSavingSlots(false);
    }
  };

  // 添加维护日志
  const handleAddLog = async (data: MaintenanceLogData) => {
    setIsAddingLog(true);
    try {
      const result = await createMaintenanceLogAction(data);
      if (result.success) {
        toast.success(result.message);
        loadEquipment();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("添加日志失败");
    } finally {
      setIsAddingLog(false);
    }
  };

  // 删除维护日志
  const handleDeleteLog = async (id: string) => {
    const result = await deleteMaintenanceLogAction(id);
    if (result.success) {
      toast.success(result.message);
      loadEquipment();
    } else {
      toast.error(result.message);
    }
  };

  if (isLoading || !equipment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const statusInfo = statusConfig[equipment.status];
  const isAdminOrHead = userRole === "ADMIN" || userRole === "HEAD";

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <IconArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{equipment.name}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              {equipment.model} · {equipment.manufacturer}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Scrap Request Button for ADMIN */}
          {userRole === "ADMIN" && equipment.status !== "SCRAPPED" && (
            <Button
              variant="destructive"
              onClick={() =>
                router.push(`/dashboard/equipment/${equipmentId}/scrap`)
              }
            >
              <IconTrash className="mr-2 h-4 w-4" />
              申请报废
            </Button>
          )}

          {/* Edit Button */}
          {isAdminOrHead && (
            <Button
              onClick={() =>
                router.push(`/dashboard/equipment/${equipmentId}/edit`)
              }
            >
              <IconEdit className="mr-2 h-4 w-4" />
              编辑设备
            </Button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <IconInfoCircle className="h-4 w-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="timeslots" className="flex items-center gap-2">
            <IconSettings className="h-4 w-4" />
            可用时段
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <IconHistory className="h-4 w-4" />
            维护日志
          </TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>设备信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InfoItem label="设备型号" value={equipment.model} />
                <InfoItem label="制造商" value={equipment.manufacturer} />
                <InfoItem
                  label="购买日期"
                  value={format(
                    new Date(equipment.purchaseDate),
                    "yyyy-MM-dd",
                    {
                      locale: zhCN,
                    }
                  )}
                />
                <InfoItem
                  label="租用价格"
                  value={`¥${equipment.rentalPrice.toFixed(2)}/小时`}
                />
                <InfoItem
                  label="检修周期"
                  value={
                    equipment.maintenanceCycle
                      ? `${equipment.maintenanceCycle} 天`
                      : "未设置"
                  }
                />
                <InfoItem
                  label="预约次数"
                  value={`${equipment._count.reservations} 次`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 可用时段 */}
        <TabsContent value="timeslots">
          <Card>
            <CardHeader>
              <CardTitle>可用时段配置</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSlotEditor
                slots={timeSlots}
                onChange={setTimeSlots}
                onSave={handleSaveTimeSlots}
                isLoading={isSavingSlots}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 维护日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>维护日志</CardTitle>
            </CardHeader>
            <CardContent>
              <MaintenanceLogList
                logs={equipment.maintenanceLogs}
                equipmentId={equipmentId}
                onAddLog={handleAddLog}
                onDeleteLog={handleDeleteLog}
                canAdd={true}
                canDelete={true}
                isLoading={isAddingLog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== 信息项组件 ==========

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  IconX,
  IconEdit,
  IconSettings,
  IconHistory,
  IconInfoCircle,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { EquipmentDetail } from "@/lib/actions/equipment";
import type { EquipmentStatus } from "@/lib/schemas/equipment.schema";

// ========== 类型定义 ==========

interface EquipmentDetailDialogProps {
  equipment: EquipmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
  onManageTimeSlots?: (id: string) => void;
}

// ========== 状态标签配置 ==========

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

// ========== 星期映射 ==========

const dayOfWeekLabels = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
];

// ========== 设备详情弹窗组件 ==========

export function EquipmentDetailDialog({
  equipment,
  open,
  onOpenChange,
  onEdit,
  onManageTimeSlots,
}: EquipmentDetailDialogProps) {
  if (!equipment) return null;

  const statusInfo = statusConfig[equipment.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl">{equipment.name}</DialogTitle>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
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

          {/* 基本信息 Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="设备型号" value={equipment.model} />
              <InfoItem label="制造商" value={equipment.manufacturer} />
              <InfoItem
                label="购买日期"
                value={format(new Date(equipment.purchaseDate), "yyyy-MM-dd", {
                  locale: zhCN,
                })}
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

            {onEdit && (
              <div className="pt-4">
                <Button onClick={() => onEdit(equipment.id)}>
                  <IconEdit className="mr-2 h-4 w-4" />
                  编辑设备
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 可用时段 Tab */}
          <TabsContent value="timeslots" className="space-y-4 mt-4">
            {equipment.timeSlots.length > 0 ? (
              <div className="space-y-2">
                {/* 周期时段 */}
                {equipment.timeSlots
                  .filter((slot) => slot.dayOfWeek !== null)
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {dayOfWeekLabels[slot.dayOfWeek!]}
                        </Badge>
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <Badge
                        variant={slot.isAvailable ? "default" : "secondary"}
                      >
                        {slot.isAvailable ? "可用" : "不可用"}
                      </Badge>
                    </div>
                  ))}

                {/* 特殊日期时段 */}
                {equipment.timeSlots
                  .filter((slot) => slot.specificDate !== null)
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {format(new Date(slot.specificDate!), "MM-dd")}
                        </Badge>
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <Badge
                        variant={slot.isAvailable ? "default" : "secondary"}
                      >
                        {slot.isAvailable ? "可用" : "不可用"}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂未配置可用时段
              </div>
            )}

            {onManageTimeSlots && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => onManageTimeSlots(equipment.id)}
                >
                  <IconSettings className="mr-2 h-4 w-4" />
                  管理时段
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 维护日志 Tab */}
          <TabsContent value="logs" className="space-y-4 mt-4">
            {equipment.maintenanceLogs.length > 0 ? (
              <div className="space-y-4">
                {equipment.maintenanceLogs.map((log, index) => (
                  <div key={log.id}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {index < equipment.maintenanceLogs.length - 1 && (
                          <div className="w-px h-full bg-border flex-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {log.operator}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.logDate), "yyyy-MM-dd HH:mm", {
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无维护日志
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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

"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { IconCalendar } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EquipmentStatus } from "@/lib/schemas/equipment.schema";

// ========== 类型定义 ==========

export interface EquipmentFormData {
  id?: string;
  name: string;
  model: string;
  manufacturer: string;
  purchaseDate: Date;
  status: EquipmentStatus;
  rentalPrice: number;
  maintenanceCycle: number | null;
}

// 状态选项
const statusOptions: { value: EquipmentStatus; label: string }[] = [
  { value: "AVAILABLE", label: "空闲" },
  { value: "OCCUPIED", label: "占用" },
  { value: "MAINTENANCE", label: "维修中" },
  { value: "SCRAP_REQUESTED", label: "报废申请中" },
  { value: "SCRAPPED", label: "已报废" },
];

interface EquipmentFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<EquipmentFormData>;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  isLoading?: boolean;
  userRole?: string;
}

export function EquipmentForm({
  mode,
  defaultValues,
  onSubmit,
  isLoading = false,
  userRole,
}: EquipmentFormProps) {
  // 表单状态
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formData, setFormData] = React.useState<EquipmentFormData>({
    id: defaultValues?.id,
    name: defaultValues?.name ?? "",
    model: defaultValues?.model ?? "",
    manufacturer: defaultValues?.manufacturer ?? "",
    purchaseDate: defaultValues?.purchaseDate ?? new Date(),
    status: defaultValues?.status ?? "AVAILABLE",
    rentalPrice: defaultValues?.rentalPrice ?? 0,
    maintenanceCycle: defaultValues?.maintenanceCycle ?? null,
  });

  // Determine if status is editable (only HEAD can edit status)
  const isStatusEditable = userRole === "HEAD";

  const updateField = <K extends keyof EquipmentFormData>(
    field: K,
    value: EquipmentFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "设备名称至少 2 个字符";
    }
    if (!formData.model) {
      newErrors.model = "设备型号不能为空";
    }
    if (!formData.manufacturer || formData.manufacturer.length < 2) {
      newErrors.manufacturer = "制造商名称至少 2 个字符";
    }
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = "请选择购买日期";
    }
    if (formData.rentalPrice < 0) {
      newErrors.rentalPrice = "租用价格不能为负数";
    }
    if (formData.maintenanceCycle !== null && formData.maintenanceCycle < 1) {
      newErrors.maintenanceCycle = "检修周期至少 1 天";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">基本信息</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 设备名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">设备名称 *</Label>
            <Input
              id="name"
              placeholder="请输入设备名称"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* 设备型号 */}
          <div className="space-y-2">
            <Label htmlFor="model">设备型号 *</Label>
            <Input
              id="model"
              placeholder="请输入设备型号"
              value={formData.model}
              onChange={(e) => updateField("model", e.target.value)}
            />
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model}</p>
            )}
          </div>

          {/* 制造商 */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer">制造商 *</Label>
            <Input
              id="manufacturer"
              placeholder="请输入制造商名称"
              value={formData.manufacturer}
              onChange={(e) => updateField("manufacturer", e.target.value)}
            />
            {errors.manufacturer && (
              <p className="text-sm text-destructive">{errors.manufacturer}</p>
            )}
          </div>

          {/* 购买日期 */}
          <div className="space-y-2">
            <Label>购买日期 *</Label>
            <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setCalendarOpen(true)}
              >
                <IconCalendar className="mr-2 h-4 w-4" />
                {formData.purchaseDate
                  ? format(new Date(formData.purchaseDate), "yyyy-MM-dd", {
                      locale: zhCN,
                    })
                  : "选择日期"}
              </Button>
              <DialogContent className="w-auto p-0">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>选择购买日期</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={
                    formData.purchaseDate
                      ? new Date(formData.purchaseDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      updateField("purchaseDate", date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </DialogContent>
            </Dialog>
            {errors.purchaseDate && (
              <p className="text-sm text-destructive">{errors.purchaseDate}</p>
            )}
          </div>

          {/* 设备状态 */}
          <div className="space-y-2">
            <Label>设备状态</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                updateField("status", value as EquipmentStatus)
              }
              disabled={!isStatusEditable && mode === "edit"} // Disable if not HEAD and in edit mode
            >
              <SelectTrigger>
                <span>
                  {statusOptions.find((o) => o.value === formData.status)
                    ?.label ?? "选择状态"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
            {!isStatusEditable && mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                仅实验室负责人可修改设备状态
              </p>
            )}
          </div>

          {/* 租用价格 */}
          <div className="space-y-2">
            <Label htmlFor="rentalPrice">租用价格 (元/小时)</Label>
            <Input
              id="rentalPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.rentalPrice}
              onChange={(e) =>
                updateField("rentalPrice", parseFloat(e.target.value) || 0)
              }
            />
            {errors.rentalPrice && (
              <p className="text-sm text-destructive">{errors.rentalPrice}</p>
            )}
          </div>

          {/* 检修周期 */}
          <div className="space-y-2">
            <Label htmlFor="maintenanceCycle">检修周期 (天)</Label>
            <Input
              id="maintenanceCycle"
              type="number"
              min="1"
              placeholder="可选，如 30 天"
              value={formData.maintenanceCycle ?? ""}
              onChange={(e) =>
                updateField(
                  "maintenanceCycle",
                  e.target.value === "" ? null : parseInt(e.target.value)
                )
              }
            />
            {errors.maintenanceCycle && (
              <p className="text-sm text-destructive">
                {errors.maintenanceCycle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "提交中..."
            : mode === "create"
            ? "创建设备"
            : "保存修改"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { IconCalendar, IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";

import {
  createEquipmentSchema,
  updateEquipmentSchema,
  type CreateEquipmentData,
  type EquipmentStatus,
} from "@/lib/schemas/equipment.schema";

// ========== 类型定义 ==========

// 统一表单数据类型
export type EquipmentFormData = CreateEquipmentData & { id?: string };

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
  admins?: { id: string; name: string | null; username: string | null }[];
}

export function EquipmentForm({
  mode,
  defaultValues,
  onSubmit,
  isLoading = false,
  userRole,
  admins = [],
}: EquipmentFormProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  // Determine schema based on mode
  const schema =
    mode === "create" ? createEquipmentSchema : updateEquipmentSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: defaultValues?.name || "",
      model: defaultValues?.model || "",
      manufacturer: defaultValues?.manufacturer || "",
      purchaseDate: defaultValues?.purchaseDate || new Date(),
      status: defaultValues?.status || "AVAILABLE",
      rentalPrice: defaultValues?.rentalPrice || 0,
      maintenanceCycle: defaultValues?.maintenanceCycle || null,
      adminId: defaultValues?.adminId || null,
      ...(mode === "edit" ? { id: defaultValues?.id } : {}),
    },
  });

  // Watch fields for controlled components
  const purchaseDate = watch("purchaseDate");
  const adminId = watch("adminId");
  const status = watch("status");

  // Determine if status is editable (only HEAD can edit status)
  const isStatusEditable = userRole === "HEAD";

  const handleFormSubmit = async (data: EquipmentFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">基本信息</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 设备名称 */}
          <Field>
            <FieldLabel>设备名称 *</FieldLabel>
            <Input placeholder="请输入设备名称" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          {/* 设备型号 */}
          <Field>
            <FieldLabel>设备型号 *</FieldLabel>
            <Input placeholder="请输入设备型号" {...register("model")} />
            <FieldError>{errors.model?.message}</FieldError>
          </Field>

          {/* 制造商 */}
          <Field>
            <FieldLabel>制造商 *</FieldLabel>
            <Input
              placeholder="请输入制造商名称"
              {...register("manufacturer")}
            />
            <FieldError>{errors.manufacturer?.message}</FieldError>
          </Field>

          {/* 购买日期 */}
          <Field>
            <FieldLabel>购买日期 *</FieldLabel>
            <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    {purchaseDate
                      ? format(new Date(purchaseDate), "yyyy-MM-dd", {
                          locale: zhCN,
                        })
                      : "选择日期"}
                  </Button>
                }
              />
              <DialogContent className="w-auto p-0">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>选择购买日期</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={purchaseDate ? new Date(purchaseDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setValue("purchaseDate", date, { shouldValidate: true });
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </DialogContent>
            </Dialog>
            <FieldError>{errors.purchaseDate?.message}</FieldError>
          </Field>

          {/* 负责管理员 */}
          <Field>
            <FieldLabel>负责管理员</FieldLabel>
            <Select
              value={adminId || ""}
              onValueChange={(val) => setValue("adminId", val || null)}
            >
              <SelectTrigger>
                <SelectValue>
                  {admins.find((a) => a.id === adminId)?.name ||
                    admins.find((a) => a.id === adminId)?.username ||
                    "选择管理员"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name || admin.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.adminId?.message}</FieldError>
          </Field>

          {/* 设备状态 */}
          <Field>
            <FieldLabel>设备状态</FieldLabel>
            <Select
              value={status}
              onValueChange={(val) =>
                setValue("status", val as EquipmentStatus)
              }
              disabled={!isStatusEditable && mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.status?.message}</FieldError>
            {!isStatusEditable && mode === "edit" && (
              <FieldDescription>仅实验室负责人可修改设备状态</FieldDescription>
            )}
          </Field>

          {/* 租用价格 */}
          <Field>
            <FieldLabel>租用价格 (元/小时)</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("rentalPrice", { valueAsNumber: true })}
            />
            <FieldError>{errors.rentalPrice?.message}</FieldError>
          </Field>

          {/* 检修周期 */}
          <Field>
            <FieldLabel>检修周期 (天)</FieldLabel>
            <Input
              type="number"
              min="1"
              placeholder="可选，如 30 天"
              {...register("maintenanceCycle", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
              })}
            />
            <FieldError>{errors.maintenanceCycle?.message}</FieldError>
          </Field>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              提交中...
            </>
          ) : mode === "create" ? (
            "创建设备"
          ) : (
            "保存修改"
          )}
        </Button>
      </div>
    </form>
  );
}

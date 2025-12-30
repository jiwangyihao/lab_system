"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IncidentFormValues,
  incidentSchema,
} from "@/lib/schemas/monitoring.schema";
import { createIncident } from "@/lib/actions/monitoring";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

export function IncidentForm({
  equipmentList,
}: {
  equipmentList: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      severity: "LOW",
    },
  });

  const onSubmit = (data: IncidentFormValues) => {
    // If equipmentId is an empty string, convert it to undefined for Prisma
    const submissionData = {
      ...data,
      equipmentId: data.equipmentId || undefined,
    };

    startTransition(async () => {
      const result = await createIncident(submissionData);
      if (result.success) {
        toast.success("上报成功", { description: "我们会尽快处理您的反馈" });
        reset();
        router.push("/dashboard/monitoring/incidents");
      } else {
        toast.error("上报失败", { description: result.error });
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
          异常情况上报
        </CardTitle>
        <CardDescription>
          如果您在使用设备过程中遇到故障或异常情况，请填写此表单。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="简要描述问题 (如: 显微镜光源不亮)"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipmentId">关联设备 (可选)</Label>
            <Select
              onValueChange={(val) => setValue("equipmentId", val || undefined)}
              value={watch("equipmentId") || ""}
            >
              <SelectTrigger>
                <SelectValue>
                  {equipmentList.find((e) => e.id === watch("equipmentId"))
                    ?.name || "选择涉及的设备..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {equipmentList.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">严重程度</Label>
            <Select
              onValueChange={(val) =>
                setValue("severity", val as "LOW" | "MEDIUM" | "HIGH")
              }
              value={watch("severity")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">低 - 不影响基本使用</SelectItem>
                <SelectItem value="MEDIUM">中 - 部分功能受限</SelectItem>
                <SelectItem value="HIGH">高 - 设备完全不可用</SelectItem>
              </SelectContent>
            </Select>
            {errors.severity && (
              <p className="text-sm text-red-500">{errors.severity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">详细描述</Label>
            <Textarea
              id="description"
              placeholder="请详细描述故障现象、发生时间及操作步骤..."
              className="min-h-[120px]"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              提交报告
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

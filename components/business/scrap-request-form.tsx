"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  createScrapSchema,
  type CreateScrapInput,
} from "@/lib/schemas/scrap.schema";
import { createScrapRequestAction } from "@/lib/actions/scrap";
import { EquipmentDetail } from "@/lib/actions/equipment";

interface ScrapRequestFormProps {
  equipment: EquipmentDetail;
}

export function ScrapRequestForm({ equipment }: ScrapRequestFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateScrapInput>({
    resolver: zodResolver(createScrapSchema),
    defaultValues: {
      equipmentId: equipment.id,
      reason: "",
    },
  });

  const onSubmit = async (data: CreateScrapInput) => {
    setIsLoading(true);
    try {
      const result = await createScrapRequestAction(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("报废申请已提交");
        router.push("/dashboard/equipment"); // Return to list or detail? List seems safer.
        router.refresh();
      }
    } catch (error) {
      toast.error("提交失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium">设备信息</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>名称: {equipment.name}</div>
          <div>型号: {equipment.model}</div>
          <div>编号: {equipment.id}</div>
        </div>
      </div>

      <FieldGroup>
        <input type="hidden" {...register("equipmentId")} />

        <Field>
          <FieldLabel>报废原因 *</FieldLabel>
          <Textarea
            placeholder="请详细描述报废原因，如：设备老化、无法修复等..."
            className="min-h-[120px]"
            {...register("reason")}
          />
          <FieldError>{errors.reason?.message}</FieldError>
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={isLoading} variant="destructive">
          {isLoading ? "提交中..." : "确认提交报废申请"}
        </Button>
      </div>
    </form>
  );
}

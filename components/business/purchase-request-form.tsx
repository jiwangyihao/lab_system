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
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  createPurchaseSchema,
  type CreatePurchaseInput,
} from "@/lib/schemas/purchase.schema";
import { createPurchaseRequestAction } from "@/lib/actions/purchase";

export function PurchaseRequestForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      name: "",
      model: "",
      quantity: 1,
      budget: 0,
      reason: "",
    },
  });

  const onSubmit = async (data: CreatePurchaseInput) => {
    setIsLoading(true);
    try {
      const result = await createPurchaseRequestAction(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("采购申请已提交");
        router.push("/dashboard/admin/purchase");
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
      <FieldGroup>
        <Field>
          <FieldLabel>设备名称 *</FieldLabel>
          <Input placeholder="如：高性能显微镜" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel>规格型号 *</FieldLabel>
            <Input placeholder="如：XPS-13-9360" {...register("model")} />
            <FieldError>{errors.model?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>采购数量 *</FieldLabel>
            <Input
              type="number"
              min="1"
              placeholder="1"
              {...register("quantity", { valueAsNumber: true })}
            />
            <FieldError>{errors.quantity?.message}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel>预算单价 (元) *</FieldLabel>
          <Input
            type="number"
            min="0"
            placeholder="0.00"
            {...register("budget", { valueAsNumber: true })}
          />
          <FieldDescription>请输入预计的单台设备及配件总价。</FieldDescription>
          <FieldError>{errors.budget?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>申请理由 *</FieldLabel>
          <Textarea
            placeholder="请详细描述采购必要性、用途及预期效益..."
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "提交中..." : "提交申请"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateSystemConfig } from "@/lib/actions/system-config";
import { SYSTEM_CONFIG_KEYS } from "@/lib/constants/system-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  maintenanceCycle: z.coerce.number().min(0, "必须是非负数"),
  advanceDays: z.coerce.number().min(0, "必须是非负数"),
  disabledDates: z.string().optional(),
});

interface SystemConfigFormProps {
  initialData: Record<string, string>;
}

export function SystemConfigForm({ initialData }: SystemConfigFormProps) {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      maintenanceCycle: parseInt(
        initialData[SYSTEM_CONFIG_KEYS.MAINTENANCE_CYCLE_DEFAULT] || "30"
      ),
      advanceDays: parseInt(
        initialData[SYSTEM_CONFIG_KEYS.RESERVATION_ADVANCE_DAYS] || "7"
      ),
      disabledDates: initialData[SYSTEM_CONFIG_KEYS.DISABLED_DATES] || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(
      Promise.all([
        updateSystemConfig(
          SYSTEM_CONFIG_KEYS.MAINTENANCE_CYCLE_DEFAULT,
          values.maintenanceCycle.toString(),
          "默认设备检修周期(天)"
        ),
        updateSystemConfig(
          SYSTEM_CONFIG_KEYS.RESERVATION_ADVANCE_DAYS,
          values.advanceDays.toString(),
          "允许提前预约的天数"
        ),
        updateSystemConfig(
          SYSTEM_CONFIG_KEYS.DISABLED_DATES,
          values.disabledDates || "",
          "全局禁用日期(YYYY-MM-DD，逗号分隔)"
        ),
      ]).then((results) => {
        if (results.some((r) => !r.success))
          throw new Error("部分配置更新失败");
        router.refresh();
      }),
      {
        loading: "保存配置中...",
        success: "系统配置已更新",
        error: "更新失败",
      }
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基础规则配置</CardTitle>
          <CardDescription>设置系统运行的基础参数。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.maintenanceCycle}>
              <FieldLabel htmlFor="maintenanceCycle">
                默认检修周期 (天)
              </FieldLabel>
              <Input
                id="maintenanceCycle"
                type="number"
                {...form.register("maintenanceCycle")}
              />
              <FieldDescription>设备定期维护的默认间隔时间。</FieldDescription>
              <FieldError errors={[form.formState.errors.maintenanceCycle]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.advanceDays}>
              <FieldLabel htmlFor="advanceDays">预约提前期 (天)</FieldLabel>
              <Input
                id="advanceDays"
                type="number"
                {...form.register("advanceDays")}
              />
              <FieldDescription>允许用户提前多少天预约设备。</FieldDescription>
              <FieldError errors={[form.formState.errors.advanceDays]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.disabledDates}>
              <FieldLabel htmlFor="disabledDates">特定禁用日期</FieldLabel>
              <Textarea
                id="disabledDates"
                placeholder="2024-01-01, 2024-02-10"
                {...form.register("disabledDates")}
              />
              <FieldDescription>
                输入不开放预约的日期（如节假日），多个日期用逗号分隔。
              </FieldDescription>
              <FieldError errors={[form.formState.errors.disabledDates]} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t px-6 py-4">
          <Button type="submit">保存更改</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

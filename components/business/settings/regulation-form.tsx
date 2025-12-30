"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RegulationItem,
  createRegulation,
  updateRegulation,
} from "@/lib/actions/regulation";
import { RegulationEditor } from "./regulation-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const formSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  isActive: z.boolean(),
  content: z.array(z.any()),
});

interface RegulationFormProps {
  initialData?: {
    id: string;
    title: string;
    content: any;
    isActive: boolean;
  };
}

export function RegulationForm({ initialData }: RegulationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      isActive: initialData?.isActive ?? true,
      content: (initialData?.content as RegulationItem[]) || [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const content = values.content as RegulationItem[];

      let result;
      if (initialData) {
        result = await updateRegulation({
          id: initialData.id,
          title: values.title,
          content,
          isActive: values.isActive,
        });
      } else {
        result = await createRegulation({
          title: values.title,
          content,
          isActive: values.isActive,
        });
      }

      if (result.success) {
        toast.success(initialData ? "规章制度已更新" : "规章制度已创建");
        router.push("/dashboard/settings/rules/manage");
        router.refresh();
      } else {
        toast.error(result.error || "操作失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("发生未知错误");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.title}>
          <FieldLabel htmlFor="title">标题</FieldLabel>
          <Input
            id="title"
            placeholder="输入规章制度标题"
            {...form.register("title")}
          />
          <FieldError errors={[form.formState.errors.title]} />
        </Field>

        <Field
          orientation="horizontal"
          className="flex-row items-center justify-between rounded-lg border p-4"
        >
          <div className="space-y-0.5">
            <FieldLabel htmlFor="isActive">启用状态</FieldLabel>
            <FieldDescription>
              禁用后，普通用户将无法看到此规章制度。
            </FieldDescription>
          </div>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Switch
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field data-invalid={!!form.formState.errors.content}>
          <FieldLabel>条款内容</FieldLabel>
          <Controller
            control={form.control}
            name="content"
            render={({ field }) => (
              <RegulationEditor value={field.value} onChange={field.onChange} />
            )}
          />
          <FieldError errors={[form.formState.errors.content]} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

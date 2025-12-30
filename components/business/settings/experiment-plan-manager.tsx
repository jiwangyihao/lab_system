"use client";

import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  createExperimentPlan,
  deleteExperimentPlan,
} from "@/lib/actions/experiment-plan";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  IconTrash,
  IconCalendarPlus,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExperimentPlan {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  description: string | null;
  targetUsers: string | null;
}

const formSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  startDate: z.string().min(1, "开始日期不能为空"),
  endDate: z.string().min(1, "结束日期不能为空"),
  description: z.string().optional(),
});

export function ExperimentPlanManager({ plans }: { plans: ExperimentPlan[] }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await createExperimentPlan({
      title: values.title,
      startDate: new Date(values.startDate),
      endDate: new Date(values.endDate),
      description: values.description,
    });

    if (result.success) {
      toast.success("实验计划创建成功");
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个计划吗？")) return;
    const result = await deleteExperimentPlan(id);
    if (result.success) {
      toast.success("删除成功");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const activeDays = plans.map((p) => ({
    from: new Date(p.startDate),
    to: new Date(p.endDate),
  }));

  const selectedPlans = selectedDate
    ? plans.filter((p) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return selectedDate >= start && selectedDate <= end;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <IconCalendarEvent className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            共 {plans.length} 个计划
          </span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
            <IconCalendarPlus className="mr-2 h-4 w-4" />
            新建计划
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建实验计划</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.title}>
                  <FieldLabel htmlFor="title">计划名称</FieldLabel>
                  <Input
                    id="title"
                    placeholder="例：期末物理实验周"
                    {...form.register("title")}
                  />
                  <FieldError errors={[form.formState.errors.title]} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!form.formState.errors.startDate}>
                    <FieldLabel htmlFor="startDate">开始日期</FieldLabel>
                    <Input
                      id="startDate"
                      type="date"
                      {...form.register("startDate")}
                    />
                    <FieldError errors={[form.formState.errors.startDate]} />
                  </Field>
                  <Field data-invalid={!!form.formState.errors.endDate}>
                    <FieldLabel htmlFor="endDate">结束日期</FieldLabel>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register("endDate")}
                    />
                    <FieldError errors={[form.formState.errors.endDate]} />
                  </Field>
                </div>
                <Field data-invalid={!!form.formState.errors.description}>
                  <FieldLabel htmlFor="description">描述 (可选)</FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="备注信息..."
                    {...form.register("description")}
                  />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full">
                创建
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main content: Calendar + Plan list side by side */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Plan list table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate
                ? `${format(selectedDate, "yyyy年MM月dd日", {
                    locale: zhCN,
                  })} 的安排`
                : "所有计划"}
            </CardTitle>
            <CardDescription>点击日历日期查看当日计划</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPlans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>计划名称</TableHead>
                    <TableHead>日期范围</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {format(new Date(plan.startDate), "MM/dd")} -{" "}
                          {format(new Date(plan.endDate), "MM/dd")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {plan.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconCalendarEvent className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {selectedDate ? "该日无特定实验计划" : "请选择日期查看"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">日历视图</CardTitle>
            <CardDescription>高亮日期表示有计划安排</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={zhCN}
              className="rounded-md border w-full"
              modifiers={{
                booked: activeDays,
              }}
              modifiersClassNames={{
                booked: "bg-primary/20 font-bold text-primary",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

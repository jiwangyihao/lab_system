"use client";

import * as React from "react";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { IconCalendar, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createReservation,
  getAvailableSlots,
} from "@/lib/actions/reservation";
import { useRouter, useSearchParams } from "next/navigation";

const formSchema = z.object({
  equipmentId: z.string().min(1, "请选择设备"),
  date: z.date({
    required_error: "请选择日期",
  }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "格式如 08:00"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "格式如 10:00"),
  usageDesc: z.string().min(1, "请输入用途"),
});

interface AvailableSlot {
  start: string;
  end: string;
}

interface EquipmentOption {
  id: string;
  name: string;
  model: string;
}

export function ReservationForm({
  equipmentList,
}: {
  equipmentList: EquipmentOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEquipmentId = searchParams.get("equipmentId") || "";

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentId: initialEquipmentId,
      usageDesc: "",
      startTime: "",
      endTime: "",
    },
  });

  const selectedEquipment = watch("equipmentId");
  const selectedDate = watch("date");

  const checkAvailability = async () => {
    if (!selectedEquipment || !selectedDate) return;

    setCheckingSlots(true);
    try {
      const result = await getAvailableSlots(selectedEquipment, selectedDate);
      setAvailableSlots(result.openSlots);
      setOccupiedSlots(result.occupiedSlots);
    } catch (error) {
      console.error(error);
      toast.error("查询时段失败");
    } finally {
      setCheckingSlots(false);
    }
  };

  // Auto-fetch time slots when equipment or date changes
  useEffect(() => {
    if (selectedEquipment && selectedDate) {
      checkAvailability();
    }
  }, [selectedEquipment, selectedDate]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await createReservation(values);
      if (result.success) {
        toast.success("申请提交成功", { description: "请等待审批" });
        router.push("/dashboard/reservation");
      } else {
        toast.error("提交失败", { description: result.error });
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>选择设备 *</FieldLabel>
              <Select
                value={selectedEquipment}
                onValueChange={(val) => {
                  setValue("equipmentId", val as string);
                  if (selectedDate) setTimeout(checkAvailability, 100);
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedEquipment
                      ? equipmentList.find((eq) => eq.id === selectedEquipment)
                          ?.name
                      : "选择要借用的设备"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {equipmentList.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} ({eq.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.equipmentId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>借用日期 *</FieldLabel>
              <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
                <DialogTrigger
                  render={
                    <Button
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal justify-start",
                        !selectedDate && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <IconCalendar className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "yyyy-MM-dd")
                    : "选择日期"}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>选择借用日期</DialogTitle>
                  </DialogHeader>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setValue("date", date);
                        setCalendarOpen(false);
                        if (selectedEquipment)
                          setTimeout(checkAvailability, 100);
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                  />
                </DialogContent>
              </Dialog>
              <FieldError>{errors.date?.message}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>开始时间 *</FieldLabel>
                <Input type="time" {...register("startTime")} />
                <FieldError>{errors.startTime?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>结束时间 *</FieldLabel>
                <Input type="time" {...register("endTime")} />
                <FieldError>{errors.endTime?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>借用用途 *</FieldLabel>
              <Textarea
                placeholder="请描述实验内容或用途..."
                className="resize-none min-h-[100px]"
                {...register("usageDesc")}
              />
              <FieldError>{errors.usageDesc?.message}</FieldError>
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            提交申请
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={checkAvailability}
            className="w-full text-muted-foreground"
          >
            刷新时段状态
          </Button>
        </form>
      </div>

      {/* Info Panel */}
      <div className="space-y-6">
        <div className="rounded-lg border p-4 shadow-sm bg-muted/40">
          <h3 className="font-semibold mb-3 flex items-center">
            可用时段信息
            {checkingSlots && (
              <IconLoader2 className="ml-2 h-3 w-3 animate-spin" />
            )}
          </h3>

          {!selectedEquipment || !selectedDate ? (
            <p className="text-sm text-muted-foreground">请先选择设备和日期</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-green-600 mb-1">开放时段:</p>
                {availableSlots.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {availableSlots.map((slot, i) => (
                      <li key={i}>
                        {slot.start} - {slot.end}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    暂无开放配置 (或全天不可用)
                  </p>
                )}
              </div>

              {occupiedSlots.length > 0 && (
                <div>
                  <p className="font-medium text-red-600 mb-1">已被预约:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {occupiedSlots.map((slot, i) => (
                      <li key={i}>
                        {slot.start} - {slot.end}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4 shadow-sm bg-blue-50/50 text-blue-900">
          <h4 className="font-semibold text-sm mb-2">预约须知</h4>
          <ul className="list-disc pl-4 text-xs space-y-1 opacity-80">
            <li>请提前1-7天进行预约。</li>
            <li>校内人员免费使用，校外人员需缴纳租用费。</li>
            <li>撤销预约需提前24小时操作。</li>
            <li>请如实填写用途，否则可能被驳回。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

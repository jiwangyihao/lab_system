"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { IconPlus, IconTrash, IconCalendar } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ========== 类型定义 ==========

export type TimeSlotConfig = {
  id?: string;
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

interface TimeSlotEditorProps {
  slots: TimeSlotConfig[];
  onChange: (slots: TimeSlotConfig[]) => void;
  onSave?: () => Promise<void>;
  isLoading?: boolean;
}

// ========== 星期配置 ==========

const dayOfWeekOptions = [
  { value: 0, label: "周日" },
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
];

// ========== 时段编辑器组件 ==========

export function TimeSlotEditor({
  slots,
  onChange,
  onSave,
  isLoading = false,
}: TimeSlotEditorProps) {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "special">(
    "weekly"
  );

  // 按类型分组时段
  const weeklySlots = slots.filter((s) => s.dayOfWeek !== null);
  const specialSlots = slots.filter((s) => s.specificDate !== null);

  // 添加周期时段
  const addWeeklySlot = () => {
    const newSlot: TimeSlotConfig = {
      dayOfWeek: 1, // 默认周一
      specificDate: null,
      startTime: "08:00",
      endTime: "22:00",
      isAvailable: true,
    };
    onChange([...slots, newSlot]);
  };

  // 添加特殊日期时段
  const addSpecialSlot = () => {
    const newSlot: TimeSlotConfig = {
      dayOfWeek: null,
      specificDate: new Date(),
      startTime: "08:00",
      endTime: "22:00",
      isAvailable: true,
    };
    onChange([...slots, newSlot]);
  };

  // 更新时段
  const updateSlot = (index: number, updates: Partial<TimeSlotConfig>) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], ...updates };
    onChange(newSlots);
  };

  // 删除时段
  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  // 获取原始索引
  const getOriginalIndex = (type: "weekly" | "special", localIndex: number) => {
    let count = 0;
    for (let i = 0; i < slots.length; i++) {
      const isWeekly = slots[i].dayOfWeek !== null;
      if (
        (type === "weekly" && isWeekly) ||
        (type === "special" && !isWeekly)
      ) {
        if (count === localIndex) return i;
        count++;
      }
    }
    return -1;
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "weekly" | "special")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">周期时段</TabsTrigger>
          <TabsTrigger value="special">特殊日期</TabsTrigger>
        </TabsList>

        {/* 周期时段 */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          {weeklySlots.length > 0 ? (
            <div className="space-y-3">
              {weeklySlots.map((slot, localIndex) => {
                const originalIndex = getOriginalIndex("weekly", localIndex);
                return (
                  <WeeklySlotRow
                    key={originalIndex}
                    slot={slot}
                    onUpdate={(updates) => updateSlot(originalIndex, updates)}
                    onRemove={() => removeSlot(originalIndex)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              暂无周期时段配置
            </div>
          )}

          <Button variant="outline" onClick={addWeeklySlot} className="w-full">
            <IconPlus className="mr-2 h-4 w-4" />
            添加周期时段
          </Button>
        </TabsContent>

        {/* 特殊日期 */}
        <TabsContent value="special" className="space-y-4 mt-4">
          {specialSlots.length > 0 ? (
            <div className="space-y-3">
              {specialSlots.map((slot, localIndex) => {
                const originalIndex = getOriginalIndex("special", localIndex);
                return (
                  <SpecialSlotRow
                    key={originalIndex}
                    slot={slot}
                    onUpdate={(updates) => updateSlot(originalIndex, updates)}
                    onRemove={() => removeSlot(originalIndex)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              暂无特殊日期配置
            </div>
          )}

          <Button variant="outline" onClick={addSpecialSlot} className="w-full">
            <IconPlus className="mr-2 h-4 w-4" />
            添加特殊日期
          </Button>
        </TabsContent>
      </Tabs>

      {/* 保存按钮 */}
      {onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "保存中..." : "保存配置"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== 周期时段行组件 ==========

interface SlotRowProps {
  slot: TimeSlotConfig;
  onUpdate: (updates: Partial<TimeSlotConfig>) => void;
  onRemove: () => void;
}

function WeeklySlotRow({ slot, onUpdate, onRemove }: SlotRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {/* 星期选择 */}
      <Select
        value={String(slot.dayOfWeek)}
        onValueChange={(v) => onUpdate({ dayOfWeek: Number(v) })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dayOfWeekOptions.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 时间范围 */}
      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate({ startTime: e.target.value })}
          className="w-28"
        />
        <span className="text-muted-foreground">至</span>
        <Input
          type="time"
          value={slot.endTime}
          onChange={(e) => onUpdate({ endTime: e.target.value })}
          className="w-28"
        />
      </div>

      {/* 可用状态 */}
      <div className="flex items-center gap-2 ml-auto">
        <Switch
          checked={slot.isAvailable}
          onCheckedChange={(checked) => onUpdate({ isAvailable: checked })}
        />
        <span className="text-sm text-muted-foreground">
          {slot.isAvailable ? "可用" : "不可用"}
        </span>
      </div>

      {/* 删除按钮 */}
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <IconTrash className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// ========== 特殊日期行组件 ==========

function SpecialSlotRow({ slot, onUpdate, onRemove }: SlotRowProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {/* 日期选择 */}
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogTrigger className="flex w-28 items-center justify-start gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm hover:bg-accent">
          <IconCalendar className="h-4 w-4" />
          {slot.specificDate
            ? format(new Date(slot.specificDate), "MM-dd", { locale: zhCN })
            : "选择日期"}
        </DialogTrigger>
        <DialogContent className="w-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>选择日期</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={
              slot.specificDate ? new Date(slot.specificDate) : undefined
            }
            onSelect={(date) => {
              if (date) {
                onUpdate({ specificDate: date });
                setCalendarOpen(false);
              }
            }}
            initialFocus
          />
        </DialogContent>
      </Dialog>

      {/* 时间范围 */}
      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate({ startTime: e.target.value })}
          className="w-28"
        />
        <span className="text-muted-foreground">至</span>
        <Input
          type="time"
          value={slot.endTime}
          onChange={(e) => onUpdate({ endTime: e.target.value })}
          className="w-28"
        />
      </div>

      {/* 可用状态 */}
      <div className="flex items-center gap-2 ml-auto">
        <Switch
          checked={slot.isAvailable}
          onCheckedChange={(checked) => onUpdate({ isAvailable: checked })}
        />
        <span className="text-sm text-muted-foreground">
          {slot.isAvailable ? "可用" : "不可用"}
        </span>
      </div>

      {/* 删除按钮 */}
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <IconTrash className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

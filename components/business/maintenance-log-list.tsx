"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  maintenanceLogSchema,
  type MaintenanceLogData,
} from "@/lib/schemas/equipment.schema";

// ========== 类型定义 ==========

// 简化的日志项类型，不强制要求 equipmentId
export type LogItem = {
  id: string;
  content: string;
  logDate: Date;
  operator: string;
};

interface MaintenanceLogListProps {
  logs: LogItem[];
  equipmentId: string;
  onAddLog?: (data: MaintenanceLogData) => Promise<void>;
  onDeleteLog?: (id: string) => Promise<void>;
  canAdd?: boolean;
  canDelete?: boolean;
  isLoading?: boolean;
}

// ========== 维护日志列表组件 ==========

export function MaintenanceLogList({
  logs,
  equipmentId,
  onAddLog,
  onDeleteLog,
  canAdd = true,
  canDelete = false,
  isLoading = false,
}: MaintenanceLogListProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaintenanceLogData>({
    resolver: zodResolver(maintenanceLogSchema),
    defaultValues: {
      equipmentId,
      content: "",
      operator: "",
    },
  });

  const handleAddLog = async (data: MaintenanceLogData) => {
    if (!onAddLog) return;
    await onAddLog(data);
    reset();
    setAddDialogOpen(false);
  };

  const handleDeleteLog = async (id: string) => {
    if (!onDeleteLog) return;
    setDeletingId(id);
    await onDeleteLog(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* 添加按钮 */}
      {canAdd && onAddLog && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
            <IconPlus className="h-4 w-4" />
            添加维护记录
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加维护记录</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddLog)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="operator">操作人</Label>
                <Input
                  id="operator"
                  placeholder="请输入操作人姓名"
                  {...register("operator")}
                />
                {errors.operator && (
                  <p className="text-sm text-destructive">
                    {errors.operator.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">维护内容</Label>
                <Textarea
                  id="content"
                  placeholder="请描述维护内容..."
                  rows={4}
                  {...register("content")}
                />
                {errors.content && (
                  <p className="text-sm text-destructive">
                    {errors.content.message}
                  </p>
                )}
              </div>

              <input type="hidden" {...register("equipmentId")} />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "提交中..." : "添加"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 日志列表 */}
      {logs.length > 0 ? (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex items-start gap-3">
              {/* 时间线指示器 */}
              <div className="flex flex-col items-center pt-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                {index < logs.length - 1 && (
                  <div
                    className="w-px flex-1 bg-border mt-1"
                    style={{ minHeight: "40px" }}
                  />
                )}
              </div>

              {/* 日志内容 */}
              <div className="flex-1 rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{log.operator}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.logDate), "yyyy-MM-dd HH:mm", {
                        locale: zhCN,
                      })}
                    </span>
                    {canDelete && onDeleteLog && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteLog(log.id)}
                        disabled={deletingId === log.id}
                      >
                        <IconTrash className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {log.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground rounded-lg border border-dashed">
          暂无维护记录
        </div>
      )}
    </div>
  );
}

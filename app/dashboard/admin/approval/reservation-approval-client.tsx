"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { IconCheck, IconX, IconLoader2, IconUser } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { approveReservation } from "@/lib/actions/reservation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReservationApprovalClientProps {
  initialData: any[];
  userRole: string;
}

export function ReservationApprovalClient({
  initialData,
  userRole,
}: ReservationApprovalClientProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await approveReservation(id, "APPROVE");
        toast.success("审批通过", { description: "申请已流转至下一状态" });
      } catch (error: any) {
        toast.error("操作失败", { description: error.message });
      }
    });
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    startTransition(async () => {
      try {
        await approveReservation(rejectId, "REJECT", rejectReason);
        toast.success("已驳回申请");
        setRejectId(null);
        setRejectReason("");
      } catch (error: any) {
        toast.error("操作失败", { description: error.message });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申请人</TableHead>
              <TableHead>设备</TableHead>
              <TableHead>借用时间</TableHead>
              <TableHead>用途</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无待审批任务
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-1">
                        <IconUser className="w-3 h-3" />
                        {item.user.name || item.user.username}
                      </span>
                      {item.user.student && (
                        <span className="text-xs text-muted-foreground">
                          {item.user.student.major}{" "}
                          {item.user.student.className}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{item.equipment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.equipment.model}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {format(new Date(item.startTime), "yyyy-MM-dd")}
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(item.startTime), "HH:mm")} -{" "}
                        {format(new Date(item.endTime), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate"
                    title={item.usageDesc}
                  >
                    {item.usageDesc}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(item.id)}
                        disabled={isPending}
                        title="通过"
                      >
                        {isPending ? (
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconCheck className="h-4 w-4" />
                        )}
                      </Button>

                      <Dialog
                        open={rejectId === item.id}
                        onOpenChange={(open) => {
                          if (!open) setRejectId(null);
                          else setRejectId(item.id);
                        }}
                      >
                        <DialogTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="驳回"
                            />
                          }
                        >
                          <IconX className="h-4 w-4" />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>驳回申请</DialogTitle>
                            <DialogDescription>
                              请输入驳回理由，申请人将收到通知。
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="例如：时段冲突，或用途不合规..."
                          />
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setRejectId(null)}
                            >
                              取消
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleReject}
                              disabled={!rejectReason.trim() || isPending}
                            >
                              确认驳回
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

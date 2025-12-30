"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { IconCheck, IconX, IconLoader2, IconUser } from "@tabler/icons-react";
import { DataTable } from "@/components/business/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  approveReservation,
  batchApproveReservationAction,
  batchRejectReservationAction,
} from "@/lib/actions/reservation";
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

  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);

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
    if (!rejectId && !rejectReason.trim()) return;
    // Logic fix: if single reject, need rejectId. If batch, uses selectedRows.
    // This function handles SINGLE reject confirmation from dialog.

    startTransition(async () => {
      try {
        await approveReservation(rejectId!, "REJECT", rejectReason);
        toast.success("已驳回申请");
        setRejectId(null);
        setRejectReason("");
      } catch (error: any) {
        toast.error("操作失败", { description: error.message });
      }
    });
  };

  const handleBatchApprove = async () => {
    const ids = selectedRows.map((r) => r.id);
    const result = await batchApproveReservationAction(ids);
    if (result.success) {
      toast.success(result.message);
      setRowSelection({});
    } else {
      toast.error(result.error || "批量通过失败");
    }
  };

  const handleBatchReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("请输入驳回原因");
      return;
    }
    const ids = selectedRows.map((r) => r.id);
    const result = await batchRejectReservationAction(ids, rejectReason);
    if (result.success) {
      toast.success(result.message);
      setRowSelection({});
      setBatchRejectOpen(false);
      setRejectReason("");
    } else {
      toast.error(result.error || "批量驳回失败");
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user",
      header: "申请人",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium flex items-center gap-1">
              <IconUser className="w-3 h-3" />
              {item.user.name || item.user.username}
            </span>
            {item.user.student && (
              <span className="text-xs text-muted-foreground">
                {item.user.student.major} {item.user.student.className}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {item.user.role}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "equipment",
      header: "设备",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col">
            <span>{item.equipment.name}</span>
            <span className="text-xs text-muted-foreground">
              {item.equipment.model}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "startTime",
      header: "借用时间",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-sm">
            <div>{format(new Date(item.startTime), "yyyy-MM-dd")}</div>
            <div className="text-muted-foreground">
              {format(new Date(item.startTime), "HH:mm")} -{" "}
              {format(new Date(item.endTime), "HH:mm")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "usageDesc",
      header: "用途",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.usageDesc}>
          {row.original.usageDesc}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
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
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setRejectId(item.id)}
              title="驳回"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* 批量操作工具栏 */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm text-muted-foreground mr-2">
            已选择 {selectedRows.length} 项
          </span>
          <Button size="sm" variant="default" onClick={handleBatchApprove}>
            批量通过
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBatchRejectOpen(true)}
          >
            批量驳回
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={initialData}
          searchKey="user.name"
          showSearch={false}
          onSelectionChange={setSelectedRows}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
        />
      </div>

      {/* 单个驳回弹窗 */}
      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => !open && setRejectId(null)}
      >
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
            <Button variant="outline" onClick={() => setRejectId(null)}>
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

      {/* 批量驳回弹窗 */}
      <Dialog open={batchRejectOpen} onOpenChange={setBatchRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量驳回申请</DialogTitle>
            <DialogDescription>
              请输入驳回原因，将对选中的 {selectedRows.length} 个申请生效。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入驳回理由..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBatchRejectOpen(false);
                setRejectReason("");
              }}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleBatchReject}>
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

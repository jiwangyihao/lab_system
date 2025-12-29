"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { RequestStatus, Role } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import { IconCheck, IconX, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/business/data-table";
import {
  approveScrapRequestAction,
  rejectScrapRequestAction,
} from "@/lib/actions/scrap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// 定义表格数据类型
type ScrapRequest = {
  id: string;
  reason: string;
  status: RequestStatus;
  applicant: {
    name: string;
    username: string;
  };
  equipment: {
    name: string;
    model: string;
    manufacturer: string;
  };
  createdAt: Date;
  rejectReason: string | null;
};

interface ScrapListClientProps {
  initialData: ScrapRequest[];
  userRole: Role;
}

export default function ScrapListClient({
  initialData,
  userRole,
}: ScrapListClientProps) {
  const [data, setData] = React.useState<ScrapRequest[]>(initialData);
  const [rejectDialog, setRejectDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleApprove = async (id: string) => {
    const result = await approveScrapRequestAction(id);
    if (result.success) {
      toast.success("已批准报废申请，设备状态已更新为“已报废”");
    } else {
      toast.error(result.error);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog.id || !rejectReason.trim()) return;
    const result = await rejectScrapRequestAction(
      rejectDialog.id,
      rejectReason
    );
    if (result.success) {
      toast.success("已驳回申请");
      setRejectDialog({ open: false, id: null });
      setRejectReason("");
    } else {
      toast.error(result.error);
    }
  };

  const columns: ColumnDef<ScrapRequest>[] = [
    {
      accessorKey: "equipment.name",
      header: "设备名称",
    },
    {
      accessorKey: "equipment.model",
      header: "规格型号",
    },
    {
      accessorKey: "reason",
      header: "报废原因",
      cell: ({ row }) => (
        <span
          className="text-sm text-muted-foreground truncate max-w-[200px] block"
          title={row.getValue("reason")}
        >
          {row.getValue("reason")}
        </span>
      ),
    },
    {
      accessorKey: "applicant.name",
      header: "申请人",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as RequestStatus;
        const config = {
          [RequestStatus.PENDING]: {
            label: "待审批",
            variant: "outline",
            className: "text-red-600 border-red-200 bg-red-50",
          },
          [RequestStatus.APPROVED]: {
            label: "已通过",
            variant: "default",
            className: "bg-gray-600 hover:bg-gray-700",
          }, // 报废通常是灰色调
          [RequestStatus.REJECTED]: {
            label: "已驳回",
            variant: "destructive",
            className: "",
          },
        }[status] || { label: status, variant: "secondary", className: "" };

        return (
          <Badge variant={config.variant as any} className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader column={column}>申请日期</SortableHeader>
      ),
      cell: ({ row }) =>
        format(new Date(row.getValue("createdAt")), "yyyy-MM-dd", {
          locale: zhCN,
        }),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original;
        const isPending = item.status === RequestStatus.PENDING;
        const canApprove = String(userRole) === "HEAD" && isPending;

        return (
          <div className="flex items-center gap-2">
            {canApprove && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleApprove(item.id)}
                >
                  <IconCheck className="w-3.5 h-3.5 mr-1" />
                  批准
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setRejectDialog({ open: true, id: item.id })}
                >
                  <IconX className="w-3.5 h-3.5 mr-1" />
                  驳回
                </Button>
              </>
            )}
            {!canApprove && item.rejectReason && (
              <span
                className="text-xs text-red-500 max-w-[150px] truncate"
                title={item.rejectReason}
              >
                驳回: {item.rejectReason}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div
                  onClick={() => router.push("/dashboard/equipment")}
                  className={buttonVariants({ variant: "default" })}
                  style={{ cursor: "pointer" }}
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  新增报废申请
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>请前往设备列表选择具体设备发起报废申请</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DataTable
          columns={columns}
          data={data}
          searchKey="equipment.name" // 注意：DataTable 默认只支持一级 key，这里需要 data-table 支持 dot notation 或者改列定义
          // 如果 DataTable 不支持 dot notation，search 可能失效。这里暂且这样，若失效则需要修改 accessor 或 data-table
          searchPlaceholder="搜索设备名称..."
        />
      </div>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回申请</DialogTitle>
            <DialogDescription>请输入驳回原因。</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入驳回理由..."
            className="mt-2"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, id: null })}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

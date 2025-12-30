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
  batchApproveScrapAction,
  batchRejectScrapAction,
} from "@/lib/actions/scrap";
import { Checkbox } from "@/components/ui/checkbox";
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

  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedRows, setSelectedRows] = React.useState<ScrapRequest[]>([]);
  const [batchRejectOpen, setBatchRejectOpen] = React.useState(false);

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

  const handleBatchApprove = async () => {
    const ids = selectedRows.map((r) => r.id);
    const result = await batchApproveScrapAction(ids);
    if (result.success) {
      toast.success(result.message);
      setRowSelection({});
      setSelectedRows([]);
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
    const result = await batchRejectScrapAction(ids, rejectReason);
    if (result.success) {
      toast.success(result.message);
      setRowSelection({});
      setSelectedRows([]);
      setBatchRejectOpen(false);
      setRejectReason("");
    } else {
      toast.error(result.error || "批量驳回失败");
    }
  };

  const columns: ColumnDef<ScrapRequest>[] = [
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
      id: "equipmentName",
      accessorFn: (row) => row.equipment?.name,
      header: "设备名称",
    },
    {
      id: "equipmentModel",
      accessorFn: (row) => row.equipment?.model,
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
      id: "applicantName",
      accessorFn: (row) => row.applicant?.name,
      header: "申请人",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as RequestStatus;
        const statusConfig: Record<string, any> = {
          [RequestStatus.PENDING]: {
            label: "待审批",
            variant: "outline",
            className: "text-red-600 border-red-200 bg-red-50",
          },
          ["PENDING_HEAD"]: {
            label: "待负责人审批",
            variant: "outline",
            className: "text-blue-600 border-blue-200 bg-blue-50",
          },
          [RequestStatus.APPROVED]: {
            label: "已通过",
            variant: "default",
            className: "bg-gray-600 hover:bg-gray-700",
          },
          [RequestStatus.REJECTED]: {
            label: "已驳回",
            variant: "destructive",
            className: "",
          },
        }[status] || { label: status, variant: "secondary", className: "" };

        return (
          <Badge
            variant={statusConfig.variant as any}
            className={statusConfig.className}
          >
            {statusConfig.label}
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
        <div className="flex justify-between items-center mb-4">
          {selectedRows.length > 0 ? (
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
          ) : (
            <div /> // Spacer
          )}

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
          searchKey="equipmentName"
          searchPlaceholder="搜索设备名称..."
          onSelectionChange={(rows) => setSelectedRows(rows as ScrapRequest[])}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
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
    </>
  );
}

"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { RequestStatus, Role } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import {
  IconCheck,
  IconX,
  IconPlus,
  IconEye,
  IconFilter,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/business/data-table";
import {
  approvePurchaseRequestAction,
  rejectPurchaseRequestAction,
} from "@/lib/actions/purchase";
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
type PurchaseRequest = {
  id: string;
  name: string;
  model: string;
  quantity: number;
  budget: number;
  reason: string;
  status: RequestStatus;
  applicant: {
    name: string;
    username: string;
  };
  createdAt: Date;
  rejectReason: string | null;
};

interface PurchaseListClientProps {
  initialData: PurchaseRequest[];
  userRole: Role;
}

export default function PurchaseListClient({
  initialData,
  userRole,
}: PurchaseListClientProps) {
  const [data, setData] = React.useState<PurchaseRequest[]>(initialData);
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
    const result = await approvePurchaseRequestAction(id);
    if (result.success) {
      toast.success("已批准采购申请");
      // Action revalidatePath updates data via props
    } else {
      toast.error(result.error);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog.id || !rejectReason.trim()) return;
    const result = await rejectPurchaseRequestAction(
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

  const columns: ColumnDef<PurchaseRequest>[] = [
    {
      accessorKey: "name",
      header: "设备名称",
    },
    {
      accessorKey: "model",
      header: "规格型号",
    },
    {
      accessorKey: "quantity",
      header: "数量",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("quantity")}</span>
      ),
    },
    {
      accessorKey: "budget",
      header: "单价预算",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          ¥{row.getValue<number>("budget").toLocaleString()}
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
            className: "text-yellow-600 border-yellow-200 bg-yellow-50",
          },
          [RequestStatus.APPROVED]: {
            label: "已通过",
            variant: "default",
            className: "bg-green-600 hover:bg-green-700",
          },
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
                  通过
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
            {/* 可以添加查看详情等其他操作 */}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">{/* 筛选等... */}</div>
          <Button onClick={() => router.push("/dashboard/admin/purchase/new")}>
            <IconPlus className="mr-2 h-4 w-4" />
            新增申请
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="搜索设备名称..."
        />
      </div>

      {/* 驳回弹窗 */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回申请</DialogTitle>
            <DialogDescription>
              请输入驳回原因，该信息将展示给申请人。
            </DialogDescription>
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

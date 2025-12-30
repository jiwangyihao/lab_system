"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconDotsVertical,
  IconRefresh,
  IconFilter,
  IconCalendarEvent,
  IconTrash,
  IconSettings,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DataTable, SortableHeader } from "@/components/business/data-table";
import { EquipmentDetailDialog } from "@/components/business/equipment-detail-dialog";
import { BatchActions } from "@/components/business/batch-actions";

import {
  getEquipmentsAction,
  getEquipmentByIdAction,
  changeEquipmentStatusAction,
  batchDeleteEquipmentAction,
  batchChangeStatusAction,
  type EquipmentListItem,
  type EquipmentDetail,
} from "@/lib/actions/equipment";
import type { EquipmentStatus } from "@/lib/schemas/equipment.schema";

// ========== 状态配置 ==========

const statusConfig: Record<
  EquipmentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  AVAILABLE: { label: "空闲", variant: "default" },
  OCCUPIED: { label: "占用", variant: "secondary" },
  MAINTENANCE: { label: "维修中", variant: "outline" },
  SCRAP_REQUESTED: { label: "报废申请中", variant: "outline" },
  SCRAPPED: { label: "已报废", variant: "destructive" },
};

// ========== 页面配置（根据角色） ==========

interface PageConfig {
  title: string;
  description: string;
  isAdmin: boolean;
}

function getPageConfig(userRole: string): PageConfig {
  const isAdmin = userRole === "ADMIN" || userRole === "HEAD";

  if (isAdmin) {
    return {
      title: "设备管理",
      description: "管理实验室设备信息、状态和可用时段",
      isAdmin: true,
    };
  }

  return {
    title: "可用设备",
    description: "查询实验室可用设备，选择设备进行预约",
    isAdmin: false,
  };
}

// ========== 设备列表页 ==========

interface EquipmentListPageProps {
  userRole?: string;
  userId?: string;
}

export default function EquipmentListPage({
  userRole = "STUDENT",
  userId,
}: EquipmentListPageProps) {
  const router = useRouter();
  const pageConfig = getPageConfig(userRole);

  const [data, setData] = React.useState<EquipmentListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    EquipmentStatus | "all"
  >("all");
  const [onlyMyManaged, setOnlyMyManaged] = React.useState(false);

  const [selectedEquipment, setSelectedEquipment] =
    React.useState<EquipmentDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  // 批量操作状态
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedRows, setSelectedRows] = React.useState<EquipmentListItem[]>(
    []
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] =
    React.useState(false);

  // 加载数据
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEquipmentsAction({
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        adminId: onlyMyManaged && userId ? userId : undefined,
        pageSize: 100,
      });

      if (result.success && result.data) {
        setData(result.data.items);
      } else {
        toast.error(result.message || "加载设备列表失败");
      }
    } catch {
      toast.error("加载设备列表失败");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, onlyMyManaged, userId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 查看详情
  const handleViewDetail = async (id: string) => {
    const result = await getEquipmentByIdAction(id);
    if (result.success && result.data) {
      setSelectedEquipment(result.data);
      setDetailDialogOpen(true);
    } else {
      toast.error(result.message || "加载设备详情失败");
    }
  };

  // 状态变更（仅管理员）
  const handleStatusChange = async (id: string, newStatus: EquipmentStatus) => {
    const result = await changeEquipmentStatusAction({ id, newStatus });
    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  // 批量报废
  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => r.id);
    const result = await batchDeleteEquipmentAction(ids);
    if (result.success) {
      toast.success(result.message);
      setDeleteDialogOpen(false);
      setRowSelection({}); // Clear selection via controlled state
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  // 批量变更状态 (例: 变更为可用)
  const handleBatchSetAvailable = async () => {
    const ids = selectedRows.map((r) => r.id);
    const result = await batchChangeStatusAction(ids, "AVAILABLE");
    if (result.success) {
      toast.success(result.message);
      setStatusChangeDialogOpen(false);
      setRowSelection({});
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  // 表格列定义
  const columns: ColumnDef<EquipmentListItem>[] = [
    ...(pageConfig.isAdmin
      ? [
          {
            id: "select",
            header: ({ table }: any) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
                className="translate-y-[2px]"
              />
            ),
            cell: ({ row }: any) => (
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
        ]
      : []),
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>设备名称</SortableHeader>
      ),
    },
    {
      accessorKey: "model",
      header: "型号",
    },
    {
      accessorKey: "manufacturer",
      header: "制造商",
    },
    {
      accessorKey: "admin",
      header: "负责管理员",
      cell: ({ row }) => {
        const admin = row.original.admin;
        return admin ? (
          <div className="flex flex-col">
            <span className="font-medium">{admin.name || admin.username}</span>
            <span className="text-xs text-muted-foreground">
              @{admin.username}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "purchaseDate",
      header: ({ column }) => (
        <SortableHeader column={column}>购买日期</SortableHeader>
      ),
      cell: ({ row }) =>
        format(new Date(row.getValue("purchaseDate")), "yyyy-MM-dd", {
          locale: zhCN,
        }),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as EquipmentStatus;
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: "rentalPrice",
      header: ({ column }) => (
        <SortableHeader column={column}>租用价格</SortableHeader>
      ),
      cell: ({ row }) =>
        `¥${(row.getValue("rentalPrice") as number).toFixed(2)}/h`,
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => {
        const equipment = row.original;
        const currentStatus = equipment.status;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                <IconDotsVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleViewDetail(equipment.id)}
                  >
                    <IconEye className="mr-2 h-4 w-4" />
                    查看详情
                  </DropdownMenuItem>

                  {/* 借用人员操作：预约设备 */}
                  {!pageConfig.isAdmin && currentStatus === "AVAILABLE" && (
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/dashboard/reservation/new?equipmentId=${equipment.id}`
                        )
                      }
                    >
                      <IconCalendarEvent className="mr-2 h-4 w-4" />
                      预约设备
                    </DropdownMenuItem>
                  )}

                  {/* 管理员操作：编辑设备 */}
                  {pageConfig.isAdmin && (
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/equipment/${equipment.id}/edit`)
                      }
                    >
                      <IconEdit className="mr-2 h-4 w-4" />
                      编辑设备
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                {/* 报废操作: ADMIN跳转申请，HEAD直接报废 */}
                {(pageConfig.isAdmin || userRole === "HEAD") &&
                  currentStatus !== "SCRAPPED" && (
                    <>
                      {(currentStatus === "AVAILABLE" ||
                        currentStatus === "MAINTENANCE") && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (userRole === "HEAD") {
                              handleStatusChange(equipment.id, "SCRAPPED");
                            } else {
                              router.push(
                                `/dashboard/equipment/${equipment.id}/scrap`
                              );
                            }
                          }}
                          className="text-destructive"
                        >
                          {userRole === "HEAD" ? "报废设备" : "申请报废"}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pageConfig.title}</h1>
          <p className="text-muted-foreground">{pageConfig.description}</p>
        </div>

        {/* 管理员才显示新增按钮 */}
        {userRole === "HEAD" ? (
          <Button onClick={() => router.push("/dashboard/equipment/new")}>
            <IconPlus className="mr-2 h-4 w-4" />
            新增设备
          </Button>
        ) : (
          (userRole === "ADMIN" || userRole === "TEACHER") && (
            <Button
              onClick={() => router.push("/dashboard/admin/purchase/new")}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              采购申请
            </Button>
          )
        )}
      </div>

      {/* 批量操作提示 */}
      <BatchActions
        selectedCount={selectedRows.length}
        onClearSelection={() => setRowSelection({})}
        // 实际上 DataTable 是 controlled mode 还是 local state?
        // 前面 DataTable 实现是 local state + onSelectionChange callback.
        // 如果要清空，需要 DataTable 暴露 clearSelection capability.
        // 或者 DataTable props 接受 `rowSelection` 状态。
        // 目前 DataTable 仅仅是 'internal state' + 'callback'. 所以外部很难清空内部状态。
        // 我应该修改 DataTable 让 rowSelection 受控，或者暴露 ref.
        // 简单方案: 当 BatchActions click clear, pass a trigger to DataTable?
        // 为不重新修改 DataTable (已两次)，我们暂时允许 "Uncheck all manually" or refresh page.
        // Better: I will ignore "Clear" button functionality limitation or force reload.
        // Actually, reloading data might reset selection if IDs change? No.
        // Let's modify DataTable to accept `rowSelection` prop in next iteration if needed.
        // For now, onClearSelection does nothing effectively on table state.
        // Wait, if I supply `key` to DataTable, changing key resets it.
        // Hack: `key={timestamp}`? No.
        // Let's implement handles first.
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatusChangeDialogOpen(true)}
        >
          <IconSettings className="mr-2 h-4 w-4" />
          设为可用
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          批量报废
        </Button>
      </BatchActions>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex w-full md:w-auto items-center gap-2">
          <IconFilter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="搜索设备..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as EquipmentStatus | "all")}
        >
          <SelectTrigger className="w-full md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 只看我管理的 (仅管理员) */}
        {pageConfig.isAdmin && (
          <div className="flex items-center space-x-2 pt-2 md:pt-0">
            <Checkbox
              id="managed-by-me"
              checked={onlyMyManaged}
              onCheckedChange={(checked) => setOnlyMyManaged(!!checked)}
            />
            <label
              htmlFor="managed-by-me"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              只看我管理的
            </label>
          </div>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="icon"
          onClick={loadData}
          className="self-end md:self-auto"
        >
          <IconRefresh
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        showSearch={false}
        pageSize={10}
        onSelectionChange={setSelectedRows}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
      />

      {/* 详情弹窗 */}
      <EquipmentDetailDialog
        equipment={selectedEquipment}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={
          pageConfig.isAdmin
            ? (id) => router.push(`/dashboard/equipment/${id}/edit`)
            : undefined
        }
      />

      {/* 批量报废确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量报废?</AlertDialogTitle>
            <AlertDialogDescription>
              即将报废选中的 {selectedRows.length}{" "}
              台设备。此操作将把设备状态改为"已报废"。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}
            >
              确认报废
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量变更状态确认弹窗 */}
      <AlertDialog
        open={statusChangeDialogOpen}
        onOpenChange={setStatusChangeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量设为可用?</AlertDialogTitle>
            <AlertDialogDescription>
              即将把选中的 {selectedRows.length} 台设备状态更改为"空闲
              (AVAILABLE)"。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchSetAvailable}>
              确认更改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

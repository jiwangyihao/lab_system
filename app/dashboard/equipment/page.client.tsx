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
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/business/data-table";
import { EquipmentDetailDialog } from "@/components/business/equipment-detail-dialog";
import {
  getEquipmentsAction,
  getEquipmentByIdAction,
  changeEquipmentStatusAction,
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
}

export default function EquipmentListPage({
  userRole = "STUDENT",
}: EquipmentListPageProps) {
  const router = useRouter();
  const pageConfig = getPageConfig(userRole);

  const [data, setData] = React.useState<EquipmentListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    EquipmentStatus | "all"
  >("all");
  const [selectedEquipment, setSelectedEquipment] =
    React.useState<EquipmentDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  // 加载数据
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEquipmentsAction({
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
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
  }, [searchQuery, statusFilter]);

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

  // 表格列定义
  const columns: ColumnDef<EquipmentListItem>[] = [
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

                {/* 管理员专有操作：状态变更 */}
                {pageConfig.isAdmin && currentStatus !== "SCRAPPED" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {currentStatus !== "AVAILABLE" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(equipment.id, "AVAILABLE")
                          }
                        >
                          标记为空闲
                        </DropdownMenuItem>
                      )}
                      {currentStatus === "AVAILABLE" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(equipment.id, "MAINTENANCE")
                          }
                        >
                          标记为维修中
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(equipment.id, "SCRAPPED")
                        }
                        className="text-destructive"
                      >
                        报废设备
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
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
        {pageConfig.isAdmin && (
          <Button onClick={() => router.push("/dashboard/equipment/new")}>
            <IconPlus className="mr-2 h-4 w-4" />
            新增设备
          </Button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索设备名称、型号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as EquipmentStatus | "all")}
        >
          <SelectTrigger className="w-32">
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
        <Button variant="outline" size="icon" onClick={loadData}>
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
      />

      {/* 详情弹窗 - 仅管理员显示编辑按钮 */}
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
    </div>
  );
}

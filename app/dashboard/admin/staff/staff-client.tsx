"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconUserShield,
  IconUserCog,
  IconSchool,
  IconDotsVertical,
} from "@tabler/icons-react";
import { Role } from "@/lib/enums";
import { type ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/business/data-table";
import { StaffFormDialog } from "@/components/business/staff-form-dialog";
import { deleteStaffAction } from "@/lib/actions/staff";
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

// 定义表格数据类型
type Staff = {
  id: string;
  username: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
};

interface StaffClientProps {
  initialData: Staff[];
}

export default function StaffClient({ initialData }: StaffClientProps) {
  const [data, setData] = React.useState<Staff[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // 监听 initialData 变化 (用于 Server Action revalidate 后的更新)
  // 注意：在 Server Component 父组件重新渲染时，initialData 会更新
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleCreate = () => {
    setEditingStaff(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteStaffAction(deleteId);
    if (result.success) {
      toast.success("员工已删除");
      // 乐观更新或等待父组件刷新
      // 这里依赖 Server Action 的 revalidatePath
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: "username",
      header: "用户名",
    },
    {
      accessorKey: "name",
      header: "姓名",
    },
    {
      accessorKey: "role",
      header: "角色",
      cell: ({ row }) => {
        const role = row.getValue("role") as Role;
        const config = {
          [Role.HEAD]: {
            label: "负责人",
            icon: IconUserShield,
            color: "bg-purple-100 text-purple-800",
          },
          [Role.ADMIN]: {
            label: "管理员",
            icon: IconUserCog,
            color: "bg-blue-100 text-blue-800",
          },
          [Role.TEACHER]: {
            label: "教师",
            icon: IconSchool,
            color: "bg-teal-100 text-teal-800",
          },
          [Role.STUDENT]: {
            label: "学生",
            icon: null,
            color: "bg-gray-100 text-gray-800",
          },
          [Role.OUTSIDER]: {
            label: "校外",
            icon: null,
            color: "bg-yellow-100 text-yellow-800",
          },
        }[role] || { label: role, icon: null, color: "bg-gray-100" };

        const Icon = config.icon;

        return (
          <div
            className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {config.label}
          </div>
        );
      },
    },
    {
      accessorKey: "contact",
      header: "联系方式",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          {row.original.phone && <span>{row.original.phone}</span>}
          {row.original.email && <span>{row.original.email}</span>}
          {!row.original.phone && !row.original.email && <span>-</span>}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "状态",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge
            variant="outline"
            className="text-green-600 border-green-200 bg-green-50"
          >
            启用
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-red-600 border-red-200 bg-red-50"
          >
            停用
          </Badge>
        ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader column={column}>注册时间</SortableHeader>
      ),
      cell: ({ row }) =>
        format(new Date(row.getValue("createdAt")), "yyyy-MM-dd", {
          locale: zhCN,
        }),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const staff = row.original;
        // 不允许删除自己或同级/上级角色 (简单逻辑：HEAD 可以删 ADMIN/TEACHER，但不能删其他 HEAD 或自己)
        // 这里前端简单展示，后端有校验
        const isSelf = false; // 需要获取当前用户ID判断，此处省略

        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent ring-0 outline-none">
              <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>操作</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleEdit(staff)}>
                <IconEdit className="mr-2 h-4 w-4" />
                编辑信息
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteId(staff.id)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="mr-2 h-4 w-4" />
                删除账号
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {/* 左侧：搜索 (DataTable内部实现，这里可以留空或放其他筛选) */}
          <div className="flex items-center gap-2">
            {/* 外部筛选或其他工具栏 */}
          </div>
          {/* 右侧：新增按钮 */}
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            添加员工
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="搜索姓名..."
        />
      </div>

      <StaffFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        staffToEdit={editingStaff}
        onSuccess={() => {
          // 简单的触发重绘是不够的，通常 relying on Server Action revalidate is good
          // 但如果需要即时反馈，可以 router.refresh()
          // 父组件传递的 initialData 更新依赖于页面重新请求
        }}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该账号？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。如果该账号已有业务数据（如审批记录），建议改为“停用”而非删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

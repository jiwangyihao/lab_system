"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Role } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "@/lib/schemas/staff.schema";
import { createStaffAction, updateStaffAction } from "@/lib/actions/staff";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffToEdit?: {
    id: string;
    username: string;
    name: string;
    role: Role;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
  } | null;
  onSuccess: () => void;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  staffToEdit,
  onSuccess,
}: StaffFormDialogProps) {
  const isEdit = !!staffToEdit;
  const [isLoading, setIsLoading] = React.useState(false);

  // 动态切换 Schema
  const formSchema = isEdit ? updateStaffSchema : createStaffSchema;

  // 使用 any 规避联合类型导致的复杂推导，在此场景下足够安全
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(formSchema as any) as any,
    defaultValues: {
      username: "",
      name: "",
      password: "",
      role: Role.TEACHER,
      phone: "",
      email: "",
      isActive: true,
    },
  });

  // 重置表单
  React.useEffect(() => {
    if (open) {
      if (staffToEdit) {
        reset({
          id: staffToEdit.id,
          name: staffToEdit.name,
          role: staffToEdit.role,
          phone: staffToEdit.phone || "",
          email: staffToEdit.email || "",
          isActive: staffToEdit.isActive,
        });
      } else {
        reset({
          username: "",
          name: "",
          password: "",
          role: Role.TEACHER,
          phone: "",
          email: "",
        });
      }
    }
  }, [open, staffToEdit, reset]);

  const handleFormSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      let result;
      if (isEdit) {
        result = await updateStaffAction(data);
      } else {
        result = await createStaffAction(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "员工信息已更新" : "新员工已创建");
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      toast.error("操作失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑员工信息" : "添加新员工"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改员工的基本信息与角色权限。"
              : "创建一个新的管理员或教师账号。"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                placeholder="输入登录账号"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message as string}
                </p>
              )}
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">初始密码 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="设置初始密码"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message as string}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">姓名 *</Label>
            <Input id="name" placeholder="输入真实姓名" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>角色权限 *</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.ADMIN}>
                      设备管理员 (Admin)
                    </SelectItem>
                    <SelectItem value={Role.TEACHER}>
                      教师/导师 (Teacher)
                    </SelectItem>
                    <SelectItem value={Role.HEAD}>
                      实验室负责人 (Head)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">
                {errors.role.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">联系电话</Label>
            <Input id="phone" placeholder="选填" {...register("phone")} />
            {errors.phone && (
              <p className="text-sm text-destructive">
                {errors.phone.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">电子邮箱</Label>
            <Input id="email" placeholder="选填" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message as string}
              </p>
            )}
          </div>

          {isEdit && (
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>账号启用状态</Label>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "提交中..." : "确认提交"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

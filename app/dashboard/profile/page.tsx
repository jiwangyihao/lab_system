"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
} from "@/lib/schemas/auth.schema";
import {
  getCurrentUserAction,
  updateProfileAction,
  changePasswordAction,
} from "@/lib/actions/auth";

// 角色名称映射
const ROLE_NAMES: Record<string, string> = {
  STUDENT: "学生",
  TEACHER: "教师",
  OUTSIDER: "校外人员",
  ADMIN: "设备管理员",
  HEAD: "实验室负责人",
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userData, setUserData] = useState<{
    id: string;
    username: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: string;
  } | null>(null);

  // 个人信息表单
  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
  });

  // 修改密码表单
  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // 加载用户数据
  useEffect(() => {
    async function loadUser() {
      const result = await getCurrentUserAction();
      if (result.success && result.data) {
        setUserData(result.data);
        profileForm.reset({
          name: result.data.name,
          phone: result.data.phone || "",
          email: result.data.email || "",
        });
      }
    }
    loadUser();
  }, [profileForm]);

  // 更新个人信息
  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    try {
      setIsLoading(true);
      setProfileMessage(null);

      const result = await updateProfileAction(data);

      if (result.success) {
        setProfileMessage({ type: "success", text: result.message });
        // 重新加载用户数据
        const userResult = await getCurrentUserAction();
        if (userResult.success && userResult.data) {
          setUserData(userResult.data);
        }
      } else {
        setProfileMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setProfileMessage({ type: "error", text: "更新失败，请稍后重试" });
    } finally {
      setIsLoading(false);
    }
  };

  // 修改密码
  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsLoading(true);
      setPasswordMessage(null);

      const result = await changePasswordAction(data);

      if (result.success) {
        setPasswordMessage({ type: "success", text: result.message });
        passwordForm.reset();
      } else {
        setPasswordMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "修改失败，请稍后重试" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">个人信息</h1>
        <p className="text-muted-foreground">管理您的账户信息和密码</p>
      </div>

      {/* 用户概览卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {userData.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{userData.name}</CardTitle>
              <CardDescription>
                @{userData.username} ·{" "}
                {ROLE_NAMES[userData.role] || userData.role}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 编辑个人信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>更新您的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            {profileMessage && (
              <Alert
                variant={
                  profileMessage.type === "error" ? "destructive" : "default"
                }
              >
                <AlertDescription>{profileMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                {...profileForm.register("name")}
                disabled={isLoading}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  {...profileForm.register("phone")}
                  disabled={isLoading}
                />
                {profileForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  {...profileForm.register("email")}
                  disabled={isLoading}
                />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存修改"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            {passwordMessage && (
              <Alert
                variant={
                  passwordMessage.type === "error" ? "destructive" : "default"
                }
              >
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="请输入当前密码"
                {...passwordForm.register("currentPassword")}
                disabled={isLoading}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="请输入新密码"
                  {...passwordForm.register("newPassword")}
                  disabled={isLoading}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">确认新密码</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  {...passwordForm.register("confirmNewPassword")}
                  disabled={isLoading}
                />
                {passwordForm.formState.errors.confirmNewPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "修改中..." : "修改密码"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

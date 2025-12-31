"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/layout/auth-layout";
import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/schemas/auth.schema";
import { registerAction } from "@/lib/actions/auth";

type RoleType = "STUDENT" | "TEACHER" | "OUTSIDER";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("STUDENT");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "STUDENT",
    } as any,
  });

  // 监听角色变化
  const role = watch("role");

  const handleRoleChange = (value: RoleType) => {
    setSelectedRole(value);
    setValue("role", value);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await registerAction(data);

      if (!result.success) {
        setError(result.message);
        return;
      }

      // 注册成功，跳转登录页
      router.push("/login?registered=true");
    } catch (err) {
      setError("注册失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">创建账号</h2>
          <p className="text-sm text-muted-foreground">填写以下信息完成注册</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 角色选择 */}
          <div className="space-y-2">
            <Label>用户类型</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => handleRoleChange(value as RoleType)}
            >
              <SelectTrigger>
                <SelectValue>
                  {selectedRole === "STUDENT" && "学生"}
                  {selectedRole === "TEACHER" && "教师"}
                  {selectedRole === "OUTSIDER" && "校外人员"}
                  {!selectedRole && "选择用户类型"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">学生</SelectItem>
                <SelectItem value="TEACHER">教师</SelectItem>
                <SelectItem value="OUTSIDER">校外人员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 基础信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                {...register("username")}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                placeholder="请输入姓名"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号 (选填)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                {...register("phone")}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱 (选填)</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* 学生专属字段 */}
          {selectedRole === "STUDENT" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentNo">学号</Label>
                  <Input
                    id="studentNo"
                    type="text"
                    placeholder="请输入学号"
                    {...register("studentNo" as any)}
                    disabled={isLoading}
                  />
                  {(errors as any).studentNo && (
                    <p className="text-sm text-destructive">
                      {(errors as any).studentNo.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="major">专业</Label>
                  <Input
                    id="major"
                    type="text"
                    placeholder="请输入专业"
                    {...register("major" as any)}
                    disabled={isLoading}
                  />
                  {(errors as any).major && (
                    <p className="text-sm text-destructive">
                      {(errors as any).major.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="className">班级</Label>
                <Input
                  id="className"
                  type="text"
                  placeholder="请输入班级"
                  {...register("className" as any)}
                  disabled={isLoading}
                />
                {(errors as any).className && (
                  <p className="text-sm text-destructive">
                    {(errors as any).className.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* 教师专属字段 */}
          {selectedRole === "TEACHER" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacherNo">工号</Label>
                <Input
                  id="teacherNo"
                  type="text"
                  placeholder="请输入工号"
                  {...register("teacherNo" as any)}
                  disabled={isLoading}
                />
                {(errors as any).teacherNo && (
                  <p className="text-sm text-destructive">
                    {(errors as any).teacherNo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">职称</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="请输入职称"
                  {...register("title" as any)}
                  disabled={isLoading}
                />
                {(errors as any).title && (
                  <p className="text-sm text-destructive">
                    {(errors as any).title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">院系</Label>
                <Input
                  id="department"
                  type="text"
                  placeholder="请输入院系"
                  {...register("department" as any)}
                  disabled={isLoading}
                />
                {(errors as any).department && (
                  <p className="text-sm text-destructive">
                    {(errors as any).department.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 校外人员专属字段 */}
          {selectedRole === "OUTSIDER" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idCard">身份证号</Label>
                <Input
                  id="idCard"
                  type="text"
                  placeholder="请输入身份证号"
                  {...register("idCard" as any)}
                  disabled={isLoading}
                />
                {(errors as any).idCard && (
                  <p className="text-sm text-destructive">
                    {(errors as any).idCard.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">单位</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="请输入单位名称"
                  {...register("company" as any)}
                  disabled={isLoading}
                />
                {(errors as any).company && (
                  <p className="text-sm text-destructive">
                    {(errors as any).company.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                注册中...
              </span>
            ) : (
              "注册"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">已有账号？</span>{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            立即登录
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

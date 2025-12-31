import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ReservationStatus, Role } from "@/lib/enums";
import { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconUser,
  IconFileDescription,
  IconCash,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "预约详情",
};

const statusMap: Record<ReservationStatus, { label: string; color: string }> = {
  PENDING_TEACHER: {
    label: "待导师审批",
    color: "bg-yellow-100 text-yellow-800",
  },
  PENDING_ADMIN: {
    label: "待管理员审批",
    color: "bg-orange-100 text-orange-800",
  },
  PENDING_HEAD: {
    label: "待负责人审批",
    color: "bg-purple-100 text-purple-800",
  },
  PENDING_PAYMENT: { label: "待缴费", color: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已批准", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已驳回", color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "已撤销", color: "bg-gray-100 text-gray-800" },
  IN_USE: { label: "使用中", color: "bg-teal-100 text-teal-800" },
  COMPLETED: { label: "已完成", color: "bg-gray-200 text-gray-600" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          model: true,
          manufacturer: true,
          rentalPrice: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          student: {
            select: {
              major: true,
              className: true,
              tutor: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          outsider: {
            select: {
              company: true,
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!reservation) {
    notFound();
  }

  // 权限检查：只有本人、管理员、负责人、或学生的导师可以查看
  const isOwner = reservation.userId === session.user.id;
  const isAdmin =
    session.user.role === Role.ADMIN || session.user.role === Role.HEAD;
  const isTutor =
    reservation.user.student?.tutor?.user?.name === session.user.name;

  if (!isOwner && !isAdmin && !isTutor) {
    redirect("/dashboard/reservation");
  }

  const statusConfig = statusMap[reservation.status as ReservationStatus];
  const isExternal = reservation.user.role === Role.OUTSIDER;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reservation">
          <Button variant="ghost" size="icon">
            <IconArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">预约详情</h1>
          <p className="text-muted-foreground">查看预约申请的详细信息</p>
        </div>
        <Badge
          variant="outline"
          className={statusConfig.color + " border-0 text-sm px-3 py-1"}
        >
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 设备信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconFileDescription className="h-5 w-5" />
              设备信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">设备名称</span>
              <span className="font-medium">{reservation.equipment.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">规格型号</span>
              <span>{reservation.equipment.model}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">生产厂家</span>
              <span>{reservation.equipment.manufacturer}</span>
            </div>
            {isExternal && reservation.equipment.rentalPrice > 0 && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">租用单价</span>
                  <span className="text-primary font-medium">
                    ¥{reservation.equipment.rentalPrice}/小时
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 预约时间 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconCalendar className="h-5 w-5" />
              借用时间
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">借用日期</span>
              <span className="font-medium">
                {format(new Date(reservation.startTime), "yyyy年MM月dd日", {
                  locale: zhCN,
                })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">借用时段</span>
              <span className="flex items-center gap-1">
                <IconClock className="h-4 w-4 text-muted-foreground" />
                {format(new Date(reservation.startTime), "HH:mm")} -{" "}
                {format(new Date(reservation.endTime), "HH:mm")}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请时间</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(reservation.createdAt), "yyyy-MM-dd HH:mm")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 申请人信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              申请人信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">姓名</span>
              <span className="font-medium">
                {reservation.user.name || reservation.user.username}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">用户类型</span>
              <span>
                {reservation.user.role === Role.STUDENT && "学生"}
                {reservation.user.role === Role.TEACHER && "教师"}
                {reservation.user.role === Role.OUTSIDER && "校外人员"}
                {reservation.user.role === Role.ADMIN && "管理员"}
                {reservation.user.role === Role.HEAD && "负责人"}
              </span>
            </div>
            {reservation.user.student && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">专业班级</span>
                  <span>
                    {reservation.user.student.major}{" "}
                    {reservation.user.student.className}
                  </span>
                </div>
                {reservation.user.student.tutor && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">指导教师</span>
                      <span>{reservation.user.student.tutor.user.name}</span>
                    </div>
                  </>
                )}
              </>
            )}
            {reservation.user.outsider && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所属单位</span>
                  <span>{reservation.user.outsider.company}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 缴费信息 (校外人员) */}
        {isExternal && reservation.payment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconCash className="h-5 w-5" />
                缴费信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">应缴金额</span>
                <span className="font-bold text-lg text-primary">
                  ¥{reservation.payment.amount.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">缴费状态</span>
                <Badge
                  variant={reservation.payment.paidAt ? "default" : "outline"}
                >
                  {reservation.payment.paidAt ? "已缴费" : "待缴费"}
                </Badge>
              </div>
              {reservation.payment.paidAt && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">缴费时间</span>
                    <span>
                      {format(
                        new Date(reservation.payment.paidAt),
                        "yyyy-MM-dd HH:mm"
                      )}
                    </span>
                  </div>
                  {reservation.payment.method && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">支付方式</span>
                        <span>{reservation.payment.method}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 用途说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">借用用途</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {reservation.usageDesc}
          </p>
        </CardContent>
      </Card>

      {/* 驳回原因 */}
      {reservation.status === "REJECTED" && reservation.rejectReason && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <IconAlertCircle className="h-5 w-5" />
              驳回原因
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{reservation.rejectReason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

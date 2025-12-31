import { auth } from "@/lib/auth";
import {
  getDashboardStats,
  getEquipmentUsageStats,
  getReservationTrendStats,
  getRecentReservations,
} from "@/lib/actions/statistics";
import { StatCard } from "@/components/business/dashboard/StatCard";
import { UsageLineChart } from "@/components/business/dashboard/UsageLineChart";
import { ReservationBarChart } from "@/components/business/dashboard/ReservationBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconDevices,
  IconCalendarEvent,
  IconClipboardCheck,
  IconChartLine,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Metadata } from "next";

// 角色名称映射
const ROLE_NAMES: Record<string, string> = {
  STUDENT: "学生",
  TEACHER: "教师",
  OUTSIDER: "校外人员",
  ADMIN: "设备管理员",
  HEAD: "实验室负责人",
};

// 预约状态映射
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING_TEACHER: { label: "待导师审批", variant: "secondary" },
  PENDING_ADMIN: { label: "待管理员审批", variant: "secondary" },
  PENDING_HEAD: { label: "待负责人审批", variant: "secondary" },
  PENDING_PAYMENT: { label: "待缴费", variant: "outline" },
  APPROVED: { label: "已批准", variant: "default" },
  REJECTED: { label: "已驳回", variant: "destructive" },
  CANCELLED: { label: "已撤销", variant: "destructive" },
  IN_USE: { label: "使用中", variant: "default" },
  COMPLETED: { label: "已完成", variant: "outline" },
};

interface RecentReservation {
  id: string;
  status: string;
  equipmentName: string;
  startTime: Date;
  endTime: Date;
}

export const metadata: Metadata = {
  title: "控制台",
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "用户";
  const userRole = session?.user?.role || "STUDENT";

  // 并行获取统计数据
  const [statsResult, usageResult, trendResult, recentResult] =
    await Promise.all([
      getDashboardStats(),
      getEquipmentUsageStats("week"),
      getReservationTrendStats("week"),
      getRecentReservations(5),
    ]);

  const stats = statsResult.data;
  const usageData = usageResult.data || [];
  const trendData = trendResult.data || [];
  const recentReservations = (recentResult.data || []) as RecentReservation[];

  // 判断是否显示管理员相关内容
  const isAdmin = userRole === "ADMIN" || userRole === "HEAD";
  const isTeacher = userRole === "TEACHER";

  return (
    <div className="space-y-6">
      {/* 欢迎标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          欢迎回来，{userName}
        </h1>
        <p className="text-muted-foreground">
          您的身份：{ROLE_NAMES[userRole] || userRole}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="设备总数"
          value={stats?.equipment.total ?? "--"}
          description={
            stats
              ? `空闲 ${stats.equipment.available} / 占用 ${stats.equipment.occupied} / 维修 ${stats.equipment.maintenance}`
              : "加载中..."
          }
          icon={<IconDevices className="h-4 w-4" />}
        />

        <StatCard
          title={isAdmin ? "系统预约" : "我的预约"}
          value={stats?.reservations.total ?? "--"}
          description={
            stats
              ? `进行中 ${stats.reservations.inUse} / 待审批 ${stats.reservations.pending}`
              : "加载中..."
          }
          icon={<IconCalendarEvent className="h-4 w-4" />}
        />

        {(isAdmin || isTeacher) && (
          <StatCard
            title="待审批"
            value={stats?.pendingApprovals ?? "--"}
            description="需要您处理的审批请求"
            icon={<IconClipboardCheck className="h-4 w-4" />}
          />
        )}

        <StatCard
          title="设备利用率"
          value={stats ? `${stats.averageUsageRate}%` : "--%"}
          description="过去30天平均利用率"
          icon={<IconChartLine className="h-4 w-4" />}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 md:grid-cols-2">
        <UsageLineChart data={usageData} title="近7天设备利用率" height={250} />
        <ReservationBarChart
          data={trendData}
          title="近7天预约趋势"
          height={250}
        />
      </div>

      {/* 近期预约 + 快速操作 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>近期预约</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReservations.length > 0 ? (
              <div className="space-y-3">
                {recentReservations.map((reservation) => {
                  const statusConfig = STATUS_CONFIG[reservation.status] || {
                    label: reservation.status,
                    variant: "outline" as const,
                  };
                  return (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {reservation.equipmentName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(
                            new Date(reservation.startTime),
                            "MM/dd HH:mm",
                            { locale: zhCN }
                          )}{" "}
                          -{" "}
                          {format(
                            new Date(reservation.endTime),
                            "MM/dd HH:mm",
                            { locale: zhCN }
                          )}
                        </p>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                暂无预约记录
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速导航</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/equipment"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">设备列表</div>
              <p className="text-sm text-muted-foreground">
                浏览和预约实验设备
              </p>
            </a>
            <a
              href="/dashboard/reservation"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">我的预约</div>
              <p className="text-sm text-muted-foreground">
                查看预约记录和状态
              </p>
            </a>
            {(isAdmin || isTeacher) && (
              <a
                href="/dashboard/admin/approval"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">审批中心</div>
                <p className="text-sm text-muted-foreground">
                  处理待审批的预约申请
                </p>
              </a>
            )}
            {isAdmin && (
              <a
                href="/dashboard/reports"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">统计报表</div>
                <p className="text-sm text-muted-foreground">
                  查看和生成使用报表
                </p>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

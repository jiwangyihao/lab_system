"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ReportContent, ReportDetail } from "@/lib/actions/report";

interface ReportViewerProps {
  report: ReportDetail;
}

// 角色名称映射
const ROLE_NAMES: Record<string, string> = {
  STUDENT: "学生",
  TEACHER: "教师",
  OUTSIDER: "校外人员",
  ADMIN: "设备管理员",
  HEAD: "实验室负责人",
};

/**
 * 报表内容展示组件
 */
export function ReportViewer({ report }: ReportViewerProps) {
  const content = report.content;
  const { summary, equipmentBreakdown, topUsers, dailyStats } = content;

  return (
    <div className="space-y-6">
      {/* 报表信息 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            统计周期：
            {format(new Date(report.periodStart), "yyyy/MM/dd", {
              locale: zhCN,
            })}{" "}
            -{" "}
            {format(new Date(report.periodEnd), "yyyy/MM/dd", { locale: zhCN })}
          </p>
          <p className="text-sm text-muted-foreground">
            生成时间：
            {format(new Date(report.generatedAt), "yyyy/MM/dd HH:mm", {
              locale: zhCN,
            })}
          </p>
        </div>
        <Badge variant="outline">
          {report.type === "WEEKLY"
            ? "周报"
            : report.type === "MONTHLY"
            ? "月报"
            : "年报"}
        </Badge>
      </div>

      {/* 摘要卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">设备总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEquipment}</div>
            <p className="text-xs text-muted-foreground">
              可用 {summary.availableEquipment} 台
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">预约总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalReservations}
            </div>
            <p className="text-xs text-muted-foreground">
              完成 {summary.completedReservations} / 取消{" "}
              {summary.cancelledReservations}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">使用时长</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUsageHours}h</div>
            <p className="text-xs text-muted-foreground">累计使用小时数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均利用率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.averageUsageRate}%
            </div>
            <p className="text-xs text-muted-foreground">设备平均使用率</p>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日预约数</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="reservations"
                  name="预约数"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日使用时长</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="h" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="usageHours"
                  name="使用时长"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 设备使用排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">设备使用排行</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {equipmentBreakdown.slice(0, 5).map((eq, index) => (
              <div
                key={eq.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{eq.name}</p>
                    <p className="text-sm text-muted-foreground">{eq.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{eq.usageHours}h</p>
                  <p className="text-sm text-muted-foreground">
                    预约 {eq.reservationCount} 次
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 用户使用排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">用户使用排行</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topUsers.slice(0, 5).map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_NAMES[user.role] || user.role}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{user.usageHours}h</p>
                  <p className="text-sm text-muted-foreground">
                    预约 {user.reservationCount} 次
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

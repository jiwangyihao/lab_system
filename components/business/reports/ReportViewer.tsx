"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

// 饼图颜色
const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

/**
 * 报表内容展示组件
 */
export function ReportViewer({ report }: ReportViewerProps) {
  const content = report.content;
  const { summary, equipmentBreakdown, topUsers, dailyStats } = content;

  // 用户角色统计饼图数据
  const roleChartData =
    content.userRoleStats?.map((stat, index) => ({
      name: stat.roleName,
      value: stat.reservationCount,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    })) || [];

  // 设备使用排行条形图数据（取前10）
  const equipmentChartData = equipmentBreakdown.slice(0, 10).map((eq) => ({
    name: eq.name.length > 8 ? eq.name.substring(0, 8) + "..." : eq.name,
    fullName: eq.name,
    usageHours: eq.usageHours,
    reservations: eq.reservationCount,
  }));

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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">异常事件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">期间报告数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">维护记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalMaintenanceLogs}
            </div>
            <p className="text-xs text-muted-foreground">期间维护次数</p>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {report.type === "YEARLY" ? "每周预约数" : "每日预约数"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
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
            <CardTitle className="text-base">
              {report.type === "YEARLY" ? "每周使用时长" : "每日使用时长"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={dailyStats}>
                <defs>
                  <linearGradient
                    id="usageGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  {/* 趋势线渐变 */}
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="50%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  unit="h"
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip formatter={(value) => [`${value}h`, "使用时长"]} />
                {/* 填充区域 */}
                <Area
                  type="monotone"
                  dataKey="usageHours"
                  stroke="transparent"
                  fill="url(#usageGradient)"
                />
                {/* 趋势线：仅悬停时显示点 */}
                <Line
                  type="monotone"
                  dataKey="usageHours"
                  name="使用时长"
                  stroke="url(#lineGradient)"
                  strokeWidth={2.5}
                  strokeOpacity={0.8}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "hsl(var(--primary))",
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))",
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 用户角色分布 & 设备使用排行 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 用户角色分布饼图 */}
        {roleChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">用户角色预约分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "预约次数"]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 设备使用排行条形图 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              设备使用时长排行 (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={equipmentChartData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 10 }} unit="h" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "usageHours" ? `${value}h` : value,
                    name === "usageHours" ? "使用时长" : "预约次数",
                  ]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar
                  dataKey="usageHours"
                  name="使用时长"
                  fill="hsl(var(--chart-3))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 用户使用排行 */}
      <div className="grid gap-4 md:grid-cols-2">
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

        {/* 用户分类统计 */}
        {content.userRoleStats && content.userRoleStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">用户分类统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {content.userRoleStats.map((stat) => (
                  <div
                    key={stat.role}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{stat.roleName}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.userCount} 位用户
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{stat.usageHours}h</p>
                      <p className="text-sm text-muted-foreground">
                        预约 {stat.reservationCount} 次
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 设备使用详情表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">设备使用详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {equipmentBreakdown.slice(0, 10).map((eq, index) => (
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
                    预约 {eq.reservationCount} 次 | 利用率 {eq.usageRate}%
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

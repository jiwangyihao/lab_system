"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UsageDataPoint } from "@/lib/actions/statistics";

interface UsageLineChartProps {
  data: UsageDataPoint[];
  title?: string;
  height?: number;
}

/**
 * 设备利用率面积图组件（带趋势线）
 */
export function UsageLineChart({
  data,
  title = "设备利用率趋势",
  height = 300,
}: UsageLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-2))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-2))"
                  stopOpacity={0.02}
                />
              </linearGradient>
              {/* 趋势线渐变 */}
              <linearGradient id="lineGradientDash" x1="0" y1="0" x2="1" y2="0">
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
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              unit="%"
              domain={[0, "auto"]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value) => [`${value}%`, "利用率"]}
            />
            {/* 填充区域 */}
            <Area
              type="monotone"
              dataKey="usage"
              stroke="transparent"
              fill="url(#usageGradient)"
            />
            {/* 趋势线：仅悬停时显示点 */}
            <Line
              type="monotone"
              dataKey="usage"
              name="利用率"
              stroke="url(#lineGradientDash)"
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
  );
}

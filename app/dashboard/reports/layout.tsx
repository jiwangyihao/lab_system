"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendar,
} from "@tabler/icons-react";

const REPORT_TABS = [
  {
    value: "weekly",
    label: "周报表",
    icon: IconCalendarWeek,
    href: "/dashboard/reports/weekly",
  },
  {
    value: "monthly",
    label: "月报表",
    icon: IconCalendarMonth,
    href: "/dashboard/reports/monthly",
  },
  {
    value: "yearly",
    label: "年报表",
    icon: IconCalendar,
    href: "/dashboard/reports/yearly",
  },
];

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // 根据路径确定当前 Tab
  const currentTab =
    REPORT_TABS.find((tab) => pathname.includes(tab.value))?.value || "weekly";

  const handleTabChange = (value: string) => {
    const tab = REPORT_TABS.find((t) => t.value === value);
    if (tab) {
      router.push(tab.href);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">统计报表</h1>
        <p className="text-muted-foreground">查看和生成设备使用情况报表</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}

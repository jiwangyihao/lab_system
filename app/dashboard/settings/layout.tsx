"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconSettings,
  IconFileDescription,
  IconCalendarEvent,
  IconNetwork,
  IconDatabase,
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";

const settingsNav = [
  {
    title: "通用设置",
    value: "general",
    href: "/dashboard/settings/general",
    icon: IconSettings,
  },
  {
    title: "管理制度",
    value: "rules",
    href: "/dashboard/settings/rules",
    icon: IconFileDescription,
  },
  {
    title: "实验计划",
    value: "schedule",
    href: "/dashboard/settings/schedule",
    icon: IconCalendarEvent,
  },
  {
    title: "IP 白名单",
    value: "network",
    href: "/dashboard/settings/network",
    icon: IconNetwork,
  },
  {
    title: "数据库管理",
    value: "database",
    href: "/dashboard/settings/database",
    icon: IconDatabase,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine current tab value from pathname
  const currentTab =
    settingsNav.find((item) => pathname.startsWith(item.href))?.value ||
    "general";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground">
          管理系统运行规则、实验计划及网络访问控制。
        </p>
      </div>
      <Separator />
      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          const nav = settingsNav.find((item) => item.value === value);
          if (nav) router.push(nav.href);
        }}
        className="w-full"
      >
        <TabsList className="mb-4">
          {settingsNav.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="flex items-center gap-2"
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div>{children}</div>
    </div>
  );
}

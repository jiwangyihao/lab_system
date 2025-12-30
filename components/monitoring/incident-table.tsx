"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconDotsVertical,
  IconLoader2,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconFileDescription,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateIncidentStatus } from "@/lib/actions/monitoring";

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: Date;
  user: {
    name: string | null;
    username: string;
  };
  equipment?: {
    name: string;
    model: string;
  } | null;
}

const severityMap: Record<string, { label: string; color: string }> = {
  LOW: { label: "低", color: "bg-blue-100 text-blue-800" },
  MEDIUM: { label: "中", color: "bg-orange-100 text-orange-800" },
  HIGH: { label: "高", color: "bg-red-100 text-red-800" },
};

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: "待处理", color: "bg-red-100 text-red-800" },
  IN_PROGRESS: { label: "处理中", color: "bg-yellow-100 text-yellow-800" },
  RESOLVED: { label: "已解决", color: "bg-green-100 text-green-800" },
};

export function IncidentTable({
  data,
  canManage,
}: {
  data: Incident[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStatusUpdate = (id: string, newStatus: string) => {
    startTransition(async () => {
      const result = await updateIncidentStatus(id, newStatus);
      if (result.success) {
        toast.success("状态更新成功");
        router.refresh();
      } else {
        toast.error("更新失败", { description: result.error });
      }
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>标题/设备</TableHead>
            <TableHead>上报人</TableHead>
            <TableHead>严重程度</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>上报时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                暂无异常记录
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const severityConfig = severityMap[item.severity] || {
                label: item.severity,
                color: "bg-gray-100",
              };
              const statusConfig = statusMap[item.status] || {
                label: item.status,
                color: "bg-gray-100",
              };

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.title}</div>
                    {item.equipment && (
                      <div className="text-xs text-muted-foreground">
                        {item.equipment.name} ({item.equipment.model})
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.user.name || item.user.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={severityConfig.color + " border-0"}
                    >
                      {severityConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusConfig.color + " border-0"}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-md">
                        <span className="sr-only">打开菜单</span>
                        <IconDotsVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/monitoring/report/${item.id}`
                              )
                            }
                          >
                            <IconFileDescription className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>

                          {canManage && (
                            <>
                              {item.status === "OPEN" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(item.id, "IN_PROGRESS")
                                  }
                                >
                                  <IconClock className="mr-2 h-4 w-4" />{" "}
                                  开始处理
                                </DropdownMenuItem>
                              )}
                              {(item.status === "OPEN" ||
                                item.status === "IN_PROGRESS") && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(item.id, "RESOLVED")
                                  }
                                >
                                  <IconCheck className="mr-2 h-4 w-4" />{" "}
                                  标记已解决
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CheckInLog {
  id: string;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  notes: string | null;
  user: {
    name: string | null;
    username: string;
  };
  equipment: {
    name: string;
    model: string;
  };
  reservation: {
    startTime: Date;
    endTime: Date;
  };
}

export function CheckInLogTable({ data }: { data: CheckInLog[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>设备名称</TableHead>
            <TableHead>使用人</TableHead>
            <TableHead>签到时间</TableHead>
            <TableHead>签退时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                暂无使用记录
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const isCompleted = !!item.checkOutTime;
              const statusLabel = isCompleted ? "已结束" : "使用中";
              const statusColor = isCompleted
                ? "bg-gray-100 text-gray-800"
                : "bg-teal-100 text-teal-800";

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.equipment.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.equipment.model}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.user.name || item.user.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.checkInTime
                      ? format(new Date(item.checkInTime), "yyyy-MM-dd HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {item.checkOutTime
                      ? format(new Date(item.checkOutTime), "yyyy-MM-dd HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColor + " border-0"}
                    >
                      {statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.notes || "-"}
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

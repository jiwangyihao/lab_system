"use client";

import { useEffect, useState } from "react";
import { getIncident, updateIncidentStatus } from "@/lib/actions/monitoring";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconArrowLeft,
  IconLoader2,
  IconPlayerPlay,
  IconCheck,
} from "@tabler/icons-react";

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [data, setData] = useState<{
    incident: any;
    canManage: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        const result = await getIncident(resolvedParams.id);
        if (!result) {
          // Handle 404 or Unauthorized
        }
        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params]);

  const handleStatusUpdate = async (status: string) => {
    if (!data?.incident) return;
    setUpdating(true);
    try {
      const result = await updateIncidentStatus(data.incident.id, status);
      if (result.success) {
        toast.success("状态更新成功");
        router.refresh();
        // Refresh local data
        const updated = await getIncident(data.incident.id);
        setData(updated);
      } else {
        toast.error("更新失败");
      }
    } catch (error) {
      toast.error("操作失败");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.incident) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">未找到记录或无权访问</p>
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const { incident, canManage } = data;

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

  const severityConfig = severityMap[incident.severity] || {
    label: incident.severity,
    color: "bg-gray-100",
  };
  const statusConfig = statusMap[incident.status] || {
    label: incident.status,
    color: "bg-gray-100",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <IconArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">异常详情</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-2">{incident.title}</CardTitle>
              <CardDescription>
                上报时间:{" "}
                {format(new Date(incident.createdAt), "yyyy-MM-dd HH:mm:ss")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={severityConfig.color + " border-0"}
              >
                严重程度: {severityConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={statusConfig.color + " border-0"}
              >
                状态: {statusConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground">
                上报人
              </h3>
              <p>
                {incident.user?.name} ({incident.user?.username})
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground">
                关联设备
              </h3>
              {incident.equipment ? (
                <p>
                  {incident.equipment.name} ({incident.equipment.model})
                </p>
              ) : (
                <p className="text-muted-foreground italic">未关联设备</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              详细描述
            </h3>
            <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap min-h-[100px]">
              {incident.description}
            </div>
          </div>

          {canManage && (
            <div className="flex gap-4 pt-4 border-t">
              {incident.status === "OPEN" && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate("IN_PROGRESS")}
                  disabled={updating}
                >
                  {updating ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconPlayerPlay className="mr-2 h-4 w-4" />
                  )}
                  开始处理
                </Button>
              )}
              {(incident.status === "OPEN" ||
                incident.status === "IN_PROGRESS") && (
                <Button
                  variant="default"
                  onClick={() => handleStatusUpdate("RESOLVED")}
                  disabled={updating}
                >
                  {updating ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconCheck className="mr-2 h-4 w-4" />
                  )}
                  标记已解决
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

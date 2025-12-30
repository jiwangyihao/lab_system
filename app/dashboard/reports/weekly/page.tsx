"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { queryReportData, type ReportDetail } from "@/lib/actions/report";
import { ReportViewer } from "@/components/business/reports/ReportViewer";
import { ReportExporter } from "@/components/business/reports/ReportExporter";

// 生成过去N周的选项
function generateWeekOptions(count: number = 12) {
  const options: { value: string; label: string; start: Date; end: Date }[] =
    [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const label =
      i === 0
        ? `本周 (${format(weekStart, "MM/dd")} - ${format(weekEnd, "MM/dd")})`
        : `${format(weekStart, "MM/dd")} - ${format(weekEnd, "MM/dd")}`;

    options.push({
      value: format(weekStart, "yyyy-MM-dd"),
      label,
      start: weekStart,
      end: weekEnd,
    });
  }

  return options;
}

export default function WeeklyReportsPage() {
  const weekOptions = useMemo(() => generateWeekOptions(12), []);
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0].value);
  const [reportData, setReportData] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadReportData();
  }, [selectedWeek]);

  const loadReportData = async () => {
    setIsLoading(true);
    // 使用选中的周起始日期查询数据
    const result = await queryReportData(
      "WEEKLY",
      undefined,
      undefined,
      selectedWeek
    );

    if (result.success && result.data) {
      setReportData(result.data);
    } else {
      toast.error(result.error || "加载报表失败");
      setReportData(null);
    }
    setIsLoading(false);
  };

  const handleRefresh = () => {
    startTransition(() => {
      loadReportData();
    });
  };

  const getSelectedLabel = () => {
    const option = weekOptions.find((o) => o.value === selectedWeek);
    return option?.label || "选择周";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={selectedWeek}
            onValueChange={(v) => v && setSelectedWeek(v)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue>{getSelectedLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <IconRefresh
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {reportData && <ReportExporter report={reportData} />}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : reportData ? (
        <ReportViewer report={reportData} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">暂无本周数据</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

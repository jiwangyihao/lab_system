"use client";

import { useState, useEffect, useTransition } from "react";
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
import { queryReportData, type ReportDetail } from "@/lib/actions/report";
import { ReportViewer } from "@/components/business/reports/ReportViewer";
import { ReportExporter } from "@/components/business/reports/ReportExporter";

export default function MonthlyReportsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 生成过去24个月的选项
  const monthOptions: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    monthOptions.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
    });
  }

  const [selectedValue, setSelectedValue] = useState<string>(
    `${currentYear}-${currentMonth}`
  );
  const [reportData, setReportData] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const [year, month] = selectedValue.split("-").map(Number);
    loadReportData(year, month);
  }, [selectedValue]);

  const loadReportData = async (year: number, month: number) => {
    setIsLoading(true);
    const result = await queryReportData("MONTHLY", year, month);
    if (result.success && result.data) {
      setReportData(result.data);
    } else {
      toast.error(result.error || "加载报表失败");
      setReportData(null);
    }
    setIsLoading(false);
  };

  const handleValueChange = (value: string) => {
    setSelectedValue(value);
  };

  const handleRefresh = () => {
    const [year, month] = selectedValue.split("-").map(Number);
    startTransition(() => {
      loadReportData(year, month);
    });
  };

  const getSelectedLabel = () => {
    const option = monthOptions.find(
      (o) => `${o.year}-${o.month}` === selectedValue
    );
    return option?.label || "选择月份";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={selectedValue} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>{getSelectedLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem
                  key={`${option.year}-${option.month}`}
                  value={`${option.year}-${option.month}`}
                >
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
            <p className="text-muted-foreground">暂无该月份的数据</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

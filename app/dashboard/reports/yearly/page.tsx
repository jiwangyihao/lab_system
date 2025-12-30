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

export default function YearlyReportsPage() {
  const currentYear = new Date().getFullYear();
  // 生成从2020年到当前年份的年份列表
  const years = Array.from(
    { length: currentYear - 2019 },
    (_, i) => currentYear - i
  );

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [reportData, setReportData] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadReportData(selectedYear);
  }, [selectedYear]);

  const loadReportData = async (year: number) => {
    setIsLoading(true);
    const result = await queryReportData("YEARLY", year);
    if (result.success && result.data) {
      setReportData(result.data);
    } else {
      toast.error(result.error || "加载报表失败");
      setReportData(null);
    }
    setIsLoading(false);
  };

  const handleYearChange = (value: string | null) => {
    if (value) {
      const year = parseInt(value, 10);
      setSelectedYear(year);
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
      loadReportData(selectedYear);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>{selectedYear}年度</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}年度
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
            <p className="text-muted-foreground mb-4">
              暂无{selectedYear}年度的数据
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

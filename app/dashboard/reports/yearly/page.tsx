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
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  generateReport,
  getReports,
  getReportById,
  type ReportListItem,
  type ReportDetail,
} from "@/lib/actions/report";
import { ReportViewer } from "@/components/business/reports/ReportViewer";
import { ReportExporter } from "@/components/business/reports/ReportExporter";

export default function YearlyReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    const result = await getReports("YEARLY");
    if (result.success && result.data) {
      setReports(result.data);
      if (result.data.length > 0 && !selectedId) {
        handleSelectReport(result.data[0].id);
      }
    }
    setIsLoading(false);
  };

  const handleSelectReport = async (id: string) => {
    setSelectedId(id);
    const result = await getReportById(id);
    if (result.success && result.data) {
      setSelectedReport(result.data);
    } else {
      toast.error("加载报表失败");
    }
  };

  const handleValueChange = (value: string | null) => {
    if (value) {
      handleSelectReport(value);
    }
  };

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateReport("YEARLY");
      if (result.success) {
        toast.success("生成成功", { description: "年报表已生成" });
        await loadReports();
        if (result.data?.id) {
          handleSelectReport(result.data.id);
        }
      } else {
        toast.error("生成失败", { description: result.error });
      }
    });
  };

  const handleRefresh = () => {
    loadReports();
  };

  const getSelectedLabel = () => {
    if (!selectedId) return "选择报表";
    const report = reports.find((r) => r.id === selectedId);
    if (!report) return "选择报表";
    return format(new Date(report.periodStart), "yyyy年度", { locale: zhCN });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={selectedId} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue>{getSelectedLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {format(new Date(report.periodStart), "yyyy年度", {
                    locale: zhCN,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <IconRefresh className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedReport && <ReportExporter report={selectedReport} />}
          <Button onClick={handleGenerate} disabled={isPending}>
            <IconPlus className="h-4 w-4 mr-2" />
            {isPending ? "生成中..." : "生成去年报表"}
          </Button>
        </div>
      </div>

      {selectedReport ? (
        <ReportViewer report={selectedReport} />
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">暂无年报表</p>
            <Button onClick={handleGenerate} disabled={isPending}>
              <IconPlus className="h-4 w-4 mr-2" />
              生成第一份年报表
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

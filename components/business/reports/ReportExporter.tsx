"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { ReportDetail } from "@/lib/actions/report";
import { cn } from "@/lib/utils";

interface ReportExporterProps {
  report: ReportDetail;
}

/**
 * 报表导出组件
 */
export function ReportExporter({ report }: ReportExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const content = report.content;

      // 创建工作簿
      const wb = XLSX.utils.book_new();

      // 摘要 Sheet
      const summaryData = [
        [
          "报表类型",
          report.type === "WEEKLY"
            ? "周报"
            : report.type === "MONTHLY"
            ? "月报"
            : "年报",
        ],
        [
          "统计周期",
          `${new Date(report.periodStart).toLocaleDateString()} - ${new Date(
            report.periodEnd
          ).toLocaleDateString()}`,
        ],
        ["生成时间", new Date(report.generatedAt).toLocaleString()],
        [],
        ["指标", "数值"],
        ["设备总数", content.summary.totalEquipment],
        ["可用设备", content.summary.availableEquipment],
        ["预约总数", content.summary.totalReservations],
        ["已完成预约", content.summary.completedReservations],
        ["已取消预约", content.summary.cancelledReservations],
        ["总使用时长（小时）", content.summary.totalUsageHours],
        ["平均利用率（%）", content.summary.averageUsageRate],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "摘要");

      // 设备使用排行 Sheet
      const equipmentData = [
        [
          "排名",
          "设备名称",
          "型号",
          "预约次数",
          "使用时长（小时）",
          "利用率（%）",
        ],
        ...content.equipmentBreakdown.map((eq, i) => [
          i + 1,
          eq.name,
          eq.model,
          eq.reservationCount,
          eq.usageHours,
          eq.usageRate,
        ]),
      ];
      const equipmentSheet = XLSX.utils.aoa_to_sheet(equipmentData);
      XLSX.utils.book_append_sheet(wb, equipmentSheet, "设备使用排行");

      // 用户使用排行 Sheet
      const userRoleNames: Record<string, string> = {
        STUDENT: "学生",
        TEACHER: "教师",
        OUTSIDER: "校外人员",
        ADMIN: "设备管理员",
        HEAD: "实验室负责人",
      };
      const userData = [
        ["排名", "用户姓名", "角色", "预约次数", "使用时长（小时）"],
        ...content.topUsers.map((user, i) => [
          i + 1,
          user.name,
          userRoleNames[user.role] || user.role,
          user.reservationCount,
          user.usageHours,
        ]),
      ];
      const userSheet = XLSX.utils.aoa_to_sheet(userData);
      XLSX.utils.book_append_sheet(wb, userSheet, "用户使用排行");

      // 每日统计 Sheet
      const dailyData = [
        ["日期", "预约数", "签到数", "使用时长（小时）"],
        ...content.dailyStats.map((day) => [
          day.date,
          day.reservations,
          day.checkIns,
          day.usageHours,
        ]),
      ];
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailySheet, "每日统计");

      // 下载文件
      const fileName = `报表_${report.type}_${new Date(report.periodStart)
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("导出成功", {
        description: `已下载 ${fileName}`,
      });
    } catch (error) {
      console.error("Export Excel error:", error);
      toast.error("导出失败", {
        description: "请稍后重试",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // 动态导入以避免可能的构建问题
      const { pdf } = await import("@react-pdf/renderer");
      const { ReportPdf } = await import("./ReportPdf");

      const blob = await pdf(<ReportPdf report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `报表_${report.type}_${new Date(report.periodStart)
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("导出成功", {
        description: "PDF 文件已下载",
      });
    } catch (error) {
      console.error("Export PDF error:", error);
      toast.error("导出失败", {
        description: "PDF 生成出错，请重试",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        disabled={isExporting}
      >
        <IconDownload className="h-4 w-4" />
        {isExporting ? "导出中..." : "导出"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          <IconFileSpreadsheet className="h-4 w-4 mr-2" />
          导出 Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf}>
          <IconFileTypePdf className="h-4 w-4 mr-2" />
          导出 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

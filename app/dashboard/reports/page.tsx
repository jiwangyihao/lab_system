import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "统计报表",
};

export default function ReportsPage() {
  // 默认重定向到周报表
  redirect("/dashboard/reports/weekly");
}

import { redirect } from "next/navigation";

export default function ReportsPage() {
  // 默认重定向到周报表
  redirect("/dashboard/reports/weekly");
}

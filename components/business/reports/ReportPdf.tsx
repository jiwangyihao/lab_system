"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ReportDetail } from "@/lib/actions/report";

// 注册字体以支持中文
// 注意：实际生产环境中应该使用本地字体文件或可靠的 CDN
Font.register({
  family: "NotoSansSC",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.12/files/noto-sans-sc-chinese-simplified-400-normal.woff",
});

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "NotoSansSC",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  section: {
    margin: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "#f5f5f5",
    padding: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingVertical: 5,
    fontSize: 10,
  },
  label: {
    width: "40%",
    fontWeight: "bold",
  },
  value: {
    width: "60%",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: "#e5e7eb",
    marginTop: 10,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
    fontWeight: "bold",
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
  },
  tableCell: {
    margin: "auto",
    marginTop: 5,
    marginBottom: 5,
    fontSize: 9,
    padding: 2,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#999999",
  },
});

interface ReportPdfProps {
  report: ReportDetail;
}

const REPORT_TYPE_MAP = {
  WEEKLY: "周报",
  MONTHLY: "月报",
  YEARLY: "年报",
};

const ROLE_NAMES: Record<string, string> = {
  STUDENT: "学生",
  TEACHER: "教师",
  OUTSIDER: "校外人员",
  ADMIN: "管理员",
  HEAD: "负责人",
};

export function ReportPdf({ report }: ReportPdfProps) {
  const { content } = report;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            实验室设备使用
            {REPORT_TYPE_MAP[report.type as keyof typeof REPORT_TYPE_MAP]}
          </Text>
          <Text style={styles.subtitle}>
            统计周期：
            {format(new Date(report.periodStart), "yyyy/MM/dd", {
              locale: zhCN,
            })}{" "}
            -{" "}
            {format(new Date(report.periodEnd), "yyyy/MM/dd", {
              locale: zhCN,
            })}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>概览</Text>
          <View style={styles.row}>
            <Text style={styles.label}>设备总数：</Text>
            <Text style={styles.value}>
              {content.summary.totalEquipment} (可用:{" "}
              {content.summary.availableEquipment})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>预约总数：</Text>
            <Text style={styles.value}>
              {content.summary.totalReservations} (完成:{" "}
              {content.summary.completedReservations}, 取消:{" "}
              {content.summary.cancelledReservations})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>总使用时长：</Text>
            <Text style={styles.value}>
              {content.summary.totalUsageHours} 小时
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>平均利用率：</Text>
            <Text style={styles.value}>
              {content.summary.averageUsageRate}%
            </Text>
          </View>
        </View>

        {/* Equipment Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>设备使用排行 (Top 10)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, { width: "40%" }]}>
                <Text style={styles.tableCell}>设备名称</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>预约数</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>时长(h)</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>利用率</Text>
              </View>
            </View>
            {content.equipmentBreakdown.slice(0, 10).map((eq, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: "40%" }]}>
                  <Text style={styles.tableCell}>
                    {eq.name} ({eq.model})
                  </Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{eq.reservationCount}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{eq.usageHours}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{eq.usageRate}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* User Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>活跃用户排行 (Top 10)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, { width: "30%" }]}>
                <Text style={styles.tableCell}>姓名</Text>
              </View>
              <View style={[styles.tableCol, { width: "30%" }]}>
                <Text style={styles.tableCell}>角色</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>预约数</Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>时长(h)</Text>
              </View>
            </View>
            {content.topUsers.slice(0, 10).map((user, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: "30%" }]}>
                  <Text style={styles.tableCell}>{user.name}</Text>
                </View>
                <View style={[styles.tableCol, { width: "30%" }]}>
                  <Text style={styles.tableCell}>
                    {ROLE_NAMES[user.role] || user.role}
                  </Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{user.reservationCount}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{user.usageHours}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          生成时间：
          {format(new Date(report.generatedAt), "yyyy/MM/dd HH:mm:ss", {
            locale: zhCN,
          })}
          {"  |  "}
          江南大学实验室设备管理系统
        </Text>
      </Page>
    </Document>
  );
}

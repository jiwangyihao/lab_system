"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
  differenceInHours,
  eachDayOfInterval,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { revalidatePath } from "next/cache";

// ========== Types ==========

export type ReportType = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface ReportSummary {
  totalEquipment: number;
  availableEquipment: number;
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalUsageHours: number;
  averageUsageRate: number;
}

export interface EquipmentBreakdown {
  id: string;
  name: string;
  model: string;
  reservationCount: number;
  usageHours: number;
  usageRate: number;
}

export interface TopUser {
  id: string;
  name: string;
  role: string;
  reservationCount: number;
  usageHours: number;
}

export interface DailyStats {
  date: string;
  label: string;
  reservations: number;
  checkIns: number;
  usageHours: number;
}

export interface ReportContent {
  summary: ReportSummary;
  equipmentBreakdown: EquipmentBreakdown[];
  topUsers: TopUser[];
  dailyStats: DailyStats[];
}

export interface ReportListItem {
  id: string;
  type: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
}

export interface ReportDetail extends ReportListItem {
  content: ReportContent;
}

// ========== Permission Check ==========

async function checkReportPermission(): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录" };
  }

  // 仅 ADMIN 和 HEAD 可访问报表
  if (session.user.role !== "ADMIN" && session.user.role !== "HEAD") {
    return { success: false, error: "无权限访问报表" };
  }

  return { success: true, userId: session.user.id };
}

// ========== Generate Report ==========

/**
 * 生成报表
 */
export async function generateReport(
  type: ReportType,
  periodStart?: Date,
  periodEnd?: Date
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: string;
}> {
  try {
    const permCheck = await checkReportPermission();
    if (!permCheck.success) {
      return { success: false, error: permCheck.error };
    }

    const now = new Date();

    // 确定报表周期
    let start: Date;
    let end: Date;

    if (periodStart && periodEnd) {
      start = periodStart;
      end = periodEnd;
    } else {
      switch (type) {
        case "WEEKLY":
          start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          break;
        case "MONTHLY":
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case "YEARLY":
          start = startOfYear(subYears(now, 1));
          end = endOfYear(subYears(now, 1));
          break;
      }
    }

    // 收集统计数据
    const content = await collectReportData(start, end, type);

    // 创建报表记录
    const report = await prisma.report.create({
      data: {
        type,
        periodStart: start,
        periodEnd: end,
        contentJson: content as object,
      },
    });

    revalidatePath("/dashboard/reports");

    return { success: true, data: { id: report.id } };
  } catch (error) {
    console.error("generateReport error:", error);
    return { success: false, error: "生成报表失败" };
  }
}

/**
 * 收集报表数据
 */
async function collectReportData(
  start: Date,
  end: Date,
  type: ReportType
): Promise<ReportContent> {
  // 设备统计
  const equipments = await prisma.equipment.findMany({
    include: {
      reservations: {
        where: {
          startTime: { gte: start },
          endTime: { lte: end },
        },
      },
    },
  });

  const totalEquipment = equipments.length;
  const availableEquipment = equipments.filter(
    (e) => e.status === "AVAILABLE"
  ).length;

  // 预约统计
  const reservations = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
      equipment: { select: { id: true, name: true, model: true } },
    },
  });

  const totalReservations = reservations.length;
  const completedReservations = reservations.filter(
    (r) => r.status === "COMPLETED"
  ).length;
  const cancelledReservations = reservations.filter(
    (r) => r.status === "CANCELLED" || r.status === "REJECTED"
  ).length;

  // 使用时长计算
  const totalUsageHours = reservations
    .filter((r) => r.status === "COMPLETED" || r.status === "IN_USE")
    .reduce((acc, r) => acc + differenceInHours(r.endTime, r.startTime), 0);

  // 利用率计算（假设每天12小时可用）
  const daysInPeriod = eachDayOfInterval({ start, end }).length;
  const theoreticalHours = availableEquipment * daysInPeriod * 12 || 1;
  const averageUsageRate = Math.min(
    100,
    Math.round((totalUsageHours / theoreticalHours) * 100)
  );

  // 设备分解
  const equipmentBreakdown: EquipmentBreakdown[] = equipments
    .map((e) => {
      const eqReservations = reservations.filter((r) => r.equipmentId === e.id);
      const usageHours = eqReservations
        .filter((r) => r.status === "COMPLETED" || r.status === "IN_USE")
        .reduce((acc, r) => acc + differenceInHours(r.endTime, r.startTime), 0);
      const eqTheoreticalHours = daysInPeriod * 12 || 1;

      return {
        id: e.id,
        name: e.name,
        model: e.model,
        reservationCount: eqReservations.length,
        usageHours,
        usageRate: Math.min(
          100,
          Math.round((usageHours / eqTheoreticalHours) * 100)
        ),
      };
    })
    .sort((a, b) => b.usageHours - a.usageHours);

  // 用户排行
  const userStatsMap = new Map<
    string,
    { name: string; role: string; count: number; hours: number }
  >();
  for (const r of reservations) {
    const existing = userStatsMap.get(r.userId) || {
      name: r.user.name,
      role: r.user.role,
      count: 0,
      hours: 0,
    };
    existing.count++;
    if (r.status === "COMPLETED" || r.status === "IN_USE") {
      existing.hours += differenceInHours(r.endTime, r.startTime);
    }
    userStatsMap.set(r.userId, existing);
  }

  const topUsers: TopUser[] = Array.from(userStatsMap.entries())
    .map(([id, stats]) => ({
      id,
      name: stats.name,
      role: stats.role,
      reservationCount: stats.count,
      usageHours: stats.hours,
    }))
    .sort((a, b) => b.reservationCount - a.reservationCount)
    .slice(0, 10);

  // 每日统计
  const days = eachDayOfInterval({ start, end });
  const dailyStats: DailyStats[] = [];

  // 为避免查询过多，对于年报表采样（每周一次）
  const sampleDays =
    type === "YEARLY" ? days.filter((_, i) => i % 7 === 0) : days;

  for (const day of sampleDays.slice(0, 31)) {
    // 最多31天
    const dayReservations = reservations.filter(
      (r) => format(r.createdAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    );

    const checkIns = await prisma.checkIn.count({
      where: {
        checkInTime: {
          gte: day,
          lt: new Date(day.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const dayUsageHours = dayReservations
      .filter((r) => r.status === "COMPLETED" || r.status === "IN_USE")
      .reduce((acc, r) => acc + differenceInHours(r.endTime, r.startTime), 0);

    dailyStats.push({
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "MM/dd", { locale: zhCN }),
      reservations: dayReservations.length,
      checkIns,
      usageHours: dayUsageHours,
    });
  }

  return {
    summary: {
      totalEquipment,
      availableEquipment,
      totalReservations,
      completedReservations,
      cancelledReservations,
      totalUsageHours,
      averageUsageRate,
    },
    equipmentBreakdown,
    topUsers,
    dailyStats,
  };
}

// ========== Get Reports ==========

/**
 * 获取报表列表
 */
export async function getReports(type?: ReportType): Promise<{
  success: boolean;
  data?: ReportListItem[];
  error?: string;
}> {
  try {
    const permCheck = await checkReportPermission();
    if (!permCheck.success) {
      return { success: false, error: permCheck.error };
    }

    const reports = await prisma.report.findMany({
      where: type ? { type } : undefined,
      orderBy: { generatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        periodStart: true,
        periodEnd: true,
        generatedAt: true,
      },
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error("getReports error:", error);
    return { success: false, error: "获取报表列表失败" };
  }
}

/**
 * 获取报表详情
 */
export async function getReportById(id: string): Promise<{
  success: boolean;
  data?: ReportDetail;
  error?: string;
}> {
  try {
    const permCheck = await checkReportPermission();
    if (!permCheck.success) {
      return { success: false, error: permCheck.error };
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return { success: false, error: "报表不存在" };
    }

    return {
      success: true,
      data: {
        id: report.id,
        type: report.type,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        generatedAt: report.generatedAt,
        content: report.contentJson as unknown as ReportContent,
      },
    };
  } catch (error) {
    console.error("getReportById error:", error);
    return { success: false, error: "获取报表详情失败" };
  }
}

// ========== Delete Report ==========

/**
 * 删除报表
 */
export async function deleteReport(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const permCheck = await checkReportPermission();
    if (!permCheck.success) {
      return { success: false, error: permCheck.error };
    }

    await prisma.report.delete({
      where: { id },
    });

    revalidatePath("/dashboard/reports");

    return { success: true };
  } catch (error) {
    console.error("deleteReport error:", error);
    return { success: false, error: "删除报表失败" };
  }
}

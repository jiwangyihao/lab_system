"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  differenceInHours,
} from "date-fns";
import { zhCN } from "date-fns/locale";

// ========== Types ==========

export interface DashboardStats {
  equipment: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    scrapped: number;
  };
  reservations: {
    total: number;
    pending: number;
    approved: number;
    inUse: number;
    completed: number;
  };
  pendingApprovals: number;
  averageUsageRate: number;
}

export interface UsageDataPoint {
  date: string;
  label: string;
  usage: number;
  totalHours: number;
  usedHours: number;
}

export interface ReservationTrendPoint {
  date: string;
  label: string;
  count: number;
  byType: Record<string, number>;
}

// ========== Dashboard Stats ==========

/**
 * 获取 Dashboard 首页统计数据
 */
export async function getDashboardStats(): Promise<{
  success: boolean;
  data?: DashboardStats;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // 设备统计
    const equipmentStats = await prisma.equipment.groupBy({
      by: ["status"],
      _count: true,
    });

    const equipmentCounts = {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      scrapped: 0,
    };

    for (const stat of equipmentStats) {
      const count = stat._count;
      equipmentCounts.total += count;
      switch (stat.status) {
        case "AVAILABLE":
          equipmentCounts.available = count;
          break;
        case "OCCUPIED":
          equipmentCounts.occupied = count;
          break;
        case "MAINTENANCE":
          equipmentCounts.maintenance = count;
          break;
        case "SCRAPPED":
        case "SCRAP_REQUESTED":
          equipmentCounts.scrapped += count;
          break;
      }
    }

    // 预约统计（根据角色过滤）
    const reservationWhere =
      userRole === "ADMIN" || userRole === "HEAD"
        ? {} // 管理员可见所有
        : { userId }; // 普通用户只看自己的

    const reservationStats = await prisma.reservation.groupBy({
      by: ["status"],
      _count: true,
      where: reservationWhere,
    });

    const reservationCounts = {
      total: 0,
      pending: 0,
      approved: 0,
      inUse: 0,
      completed: 0,
    };

    for (const stat of reservationStats) {
      const count = stat._count;
      reservationCounts.total += count;
      switch (stat.status) {
        case "PENDING_TEACHER":
        case "PENDING_ADMIN":
        case "PENDING_HEAD":
        case "PENDING_PAYMENT":
          reservationCounts.pending += count;
          break;
        case "APPROVED":
          reservationCounts.approved = count;
          break;
        case "IN_USE":
          reservationCounts.inUse = count;
          break;
        case "COMPLETED":
          reservationCounts.completed = count;
          break;
      }
    }

    // 待审批数量（根据角色）
    let pendingApprovals = 0;
    if (userRole === "TEACHER") {
      // 教师：待导师审批的学生预约
      const students = await prisma.student.findMany({
        where: { tutorId: userId },
        select: { userId: true },
      });
      const studentIds = students.map((s) => s.userId);
      if (studentIds.length > 0) {
        pendingApprovals = await prisma.reservation.count({
          where: {
            userId: { in: studentIds },
            status: "PENDING_TEACHER",
          },
        });
      }
    } else if (userRole === "ADMIN") {
      pendingApprovals = await prisma.reservation.count({
        where: { status: "PENDING_ADMIN" },
      });
    } else if (userRole === "HEAD") {
      pendingApprovals = await prisma.reservation.count({
        where: { status: "PENDING_HEAD" },
      });
    }

    // 设备利用率计算（过去30天内完成的预约占用时长 / 理论可用时长）
    const thirtyDaysAgo = subDays(new Date(), 30);
    const completedReservations = await prisma.reservation.findMany({
      where: {
        status: { in: ["COMPLETED", "IN_USE"] },
        endTime: { gte: thirtyDaysAgo },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const totalUsedHours = completedReservations.reduce((acc, r) => {
      return acc + differenceInHours(r.endTime, r.startTime);
    }, 0);

    // 假设每天每台设备可用 12 小时
    const totalAvailableHours = equipmentCounts.available * 30 * 12 || 1; // 避免除零
    const averageUsageRate = Math.min(
      100,
      Math.round((totalUsedHours / totalAvailableHours) * 100)
    );

    return {
      success: true,
      data: {
        equipment: equipmentCounts,
        reservations: reservationCounts,
        pendingApprovals,
        averageUsageRate,
      },
    };
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return { success: false, error: "获取统计数据失败" };
  }
}

// ========== Equipment Usage Stats ==========

/**
 * 获取设备利用率时间序列数据
 * @param period 统计周期：week（按日）或 month（按周）
 */
export async function getEquipmentUsageStats(
  period: "week" | "month" = "week"
): Promise<{
  success: boolean;
  data?: UsageDataPoint[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const now = new Date();
    let startDate: Date;
    let intervals: Date[];

    if (period === "week") {
      startDate = subDays(now, 7);
      intervals = eachDayOfInterval({ start: startDate, end: now });
    } else {
      startDate = subMonths(now, 1);
      intervals = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );
    }

    // 获取可用设备数量
    const availableEquipmentCount = await prisma.equipment.count({
      where: { status: { not: "SCRAPPED" } },
    });

    // 假设每天每台设备可用 12 小时
    const hoursPerDay = 12;

    const dataPoints: UsageDataPoint[] = [];

    for (let i = 0; i < intervals.length - 1; i++) {
      const intervalStart = startOfDay(intervals[i]);
      const intervalEnd =
        period === "week"
          ? endOfDay(intervals[i])
          : startOfDay(intervals[i + 1]);

      // 查询该时段内的预约使用时长
      const reservations = await prisma.reservation.findMany({
        where: {
          status: { in: ["COMPLETED", "IN_USE", "APPROVED"] },
          startTime: { lt: intervalEnd },
          endTime: { gt: intervalStart },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const usedHours = reservations.reduce((acc, r) => {
        const effectiveStart =
          r.startTime > intervalStart ? r.startTime : intervalStart;
        const effectiveEnd = r.endTime < intervalEnd ? r.endTime : intervalEnd;
        return (
          acc + Math.max(0, differenceInHours(effectiveEnd, effectiveStart))
        );
      }, 0);

      const daysInInterval = period === "week" ? 1 : 7;
      const totalHours = availableEquipmentCount * hoursPerDay * daysInInterval;
      const usage =
        totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

      dataPoints.push({
        date: format(intervalStart, "yyyy-MM-dd"),
        label:
          period === "week"
            ? format(intervalStart, "MM/dd", { locale: zhCN })
            : format(intervalStart, "MM/dd", { locale: zhCN }) + " 周",
        usage,
        totalHours,
        usedHours,
      });
    }

    return { success: true, data: dataPoints };
  } catch (error) {
    console.error("getEquipmentUsageStats error:", error);
    return { success: false, error: "获取利用率数据失败" };
  }
}

// ========== Reservation Trend Stats ==========

/**
 * 获取预约趋势时间序列数据
 * @param period 统计周期：week（按日）或 month（按周）
 */
export async function getReservationTrendStats(
  period: "week" | "month" = "week"
): Promise<{
  success: boolean;
  data?: ReservationTrendPoint[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const now = new Date();
    let startDate: Date;
    let intervals: Date[];

    if (period === "week") {
      startDate = subDays(now, 7);
      intervals = eachDayOfInterval({ start: startDate, end: now });
    } else {
      startDate = subMonths(now, 1);
      intervals = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );
    }

    // 获取设备列表用于分类
    const equipments = await prisma.equipment.findMany({
      select: { id: true, name: true },
    });
    const equipmentNameMap = new Map(equipments.map((e) => [e.id, e.name]));

    const dataPoints: ReservationTrendPoint[] = [];

    for (let i = 0; i < intervals.length - 1; i++) {
      const intervalStart = startOfDay(intervals[i]);
      const intervalEnd =
        period === "week"
          ? endOfDay(intervals[i])
          : startOfDay(intervals[i + 1]);

      // 查询该时段内开始使用的预约（使用 startTime 而非 createdAt）
      const reservations = await prisma.reservation.findMany({
        where: {
          startTime: {
            gte: intervalStart,
            lt: intervalEnd,
          },
        },
        select: {
          equipmentId: true,
        },
      });

      // 按设备分组统计
      const byType: Record<string, number> = {};
      for (const r of reservations) {
        const name = equipmentNameMap.get(r.equipmentId) || "未知设备";
        byType[name] = (byType[name] || 0) + 1;
      }

      dataPoints.push({
        date: format(intervalStart, "yyyy-MM-dd"),
        label:
          period === "week"
            ? format(intervalStart, "MM/dd", { locale: zhCN })
            : format(intervalStart, "MM/dd", { locale: zhCN }) + " 周",
        count: reservations.length,
        byType,
      });
    }

    return { success: true, data: dataPoints };
  } catch (error) {
    console.error("getReservationTrendStats error:", error);
    return { success: false, error: "获取预约趋势数据失败" };
  }
}

// ========== Recent Reservations ==========

/**
 * 获取用户近期预约列表
 */
export async function getRecentReservations(limit: number = 5): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    equipmentName: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }>;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const reservations = await prisma.reservation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        equipment: {
          select: { name: true },
        },
      },
    });

    return {
      success: true,
      data: reservations.map((r) => ({
        id: r.id,
        equipmentName: r.equipment.name,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
      })),
    };
  } catch (error) {
    console.error("getRecentReservations error:", error);
    return { success: false, error: "获取近期预约失败" };
  }
}

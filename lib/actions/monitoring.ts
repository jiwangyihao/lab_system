"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { incidentSchema } from "@/lib/schemas/monitoring.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  Incident,
  User,
  Equipment,
  CheckIn,
  Reservation,
  Prisma,
} from "@prisma/client";

type IncidentWithRelations = Incident & {
  user: User;
  equipment: Equipment | null;
};

type CheckInLogWithRelations = CheckIn & {
  user: User;
  equipment: Equipment;
  reservation: Reservation;
};

// 获取异常记录
export async function getIncidents(
  status?: string
): Promise<IncidentWithRelations[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const where: any = {};
    if (status) where.status = status;

    // 普通用户只能看自己的? 或者公开?
    // 假设所有人都能看，或者管理员能看所有
    // 简单处理：全部返回，前端过滤或不显示敏感信息
    // 但通常是：管理员看所有，用户看自己。

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "HEAD" &&
      session.user.role !== "TEACHER"
    ) {
      where.userId = session.user.id;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: { user: true, equipment: true } as any, // 强制绕过类型检查
      orderBy: { createdAt: "desc" },
    });
    return incidents as unknown as IncidentWithRelations[];
  } catch (error) {
    console.error("getIncidents error:", error);
    return [];
  }
}

// 获取单个异常详情
export async function getIncident(
  id: string
): Promise<{ incident: IncidentWithRelations; canManage: boolean } | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { user: true, equipment: true } as any,
    });

    if (!incident) return null;

    const role = session.user.role;
    const canManage = role === "ADMIN" || role === "HEAD" || role === "TEACHER";

    // 权限检查: 管理员/负责人/教师 或 本人
    if (!canManage && incident.userId !== session.user.id) {
      return null;
    }

    return {
      incident: incident as unknown as IncidentWithRelations,
      canManage,
    };
  } catch (error) {
    console.error("getIncident error:", error);
    return null;
  }
}

// 获取签到日志
export async function getCheckInLogs(
  equipmentId?: string
): Promise<CheckInLogWithRelations[]> {
  try {
    const session = await auth();
    // 主要是管理员/教师查看
    if (
      !session?.user ||
      (session.user.role !== "ADMIN" &&
        session.user.role !== "TEACHER" &&
        session.user.role !== "HEAD")
    ) {
      return [];
    }

    const where: Prisma.CheckInWhereInput = {};
    if (equipmentId) where.equipmentId = equipmentId;

    // TEACHER 只能看自己辅导的学生的日志
    if (session.user.role === "TEACHER") {
      // 获取该教师辅导的学生 ID 列表
      const students = await prisma.student.findMany({
        where: { tutorId: session.user.id },
        select: { userId: true },
      });
      const studentIds = students.map((s) => s.userId);
      // 也包括教师自己的日志
      where.userId = { in: [...studentIds, session.user.id] };
    }

    const logs = await prisma.checkIn.findMany({
      where,
      include: { user: true, equipment: true, reservation: true } as any,
      orderBy: { checkInTime: "desc" },
    });
    return logs as unknown as CheckInLogWithRelations[];
  } catch (error) {
    console.error("getCheckInLogs error:", error);
    return [];
  }
}

// 签到 checkIn
export async function checkIn(reservationId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "未经授权" };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { equipment: true },
    });

    if (!reservation) {
      return { error: "预约不存在" };
    }

    if (
      reservation.userId !== session.user.id &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "TEACHER"
    ) {
      // 允许本人或管理员/教师代签? 暂时限制本人
      // 根据业务需求，通常是本人签到。如果管理员代签，可能需要额外权限判断。
      // 这里只允许本人操作
      if (reservation.userId !== session.user.id)
        return { error: "只能对自己预约的设备进行签到" };
    }

    // 校验状态
    if (reservation.status !== "APPROVED") {
      // 如果已经是 IN_USE，提示已签到
      if (reservation.status === "IN_USE") return { error: "该预约已签到" };
      return { error: "预约状态不正确，无法签到" };
    }

    // 校验时间
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);

    // 允许提前15分钟签到 ~ 结束前1分钟
    const signWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000);
    // 强制结束前也能签到，但不能过期
    if (now < signWindowStart) {
      return { error: "未到签到时间 (可提前15分钟)" };
    }
    if (now > endTime) {
      return { error: "预约已过期，无法签到" };
    }

    // 更新预约状态 & 创建 CheckIn 记录
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "IN_USE" },
      });

      // 视情况更新设备状态
      // await tx.equipment.update({
      //   where: { id: reservation.equipmentId },
      //   data: { status: "OCCUPIED" },
      // });

      // 创建 CheckIn
      await tx.checkIn.create({
        data: {
          reservationId,
          userId: session.user.id!,
          equipmentId: reservation.equipmentId,
          checkInTime: now,
        },
      });
    });

    revalidatePath("/dashboard/reservation");
    return { success: true };
  } catch (error) {
    console.error("CheckIn error:", error);
    return { error: "签到失败" };
  }
}

// 签退 checkOut
export async function checkOut(reservationId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "未经授权" };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { checkIns: true },
    });

    if (!reservation) return { error: "预约不存在" };

    if (
      reservation.userId !== session.user.id &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "TEACHER"
    ) {
      return { error: "无权操作" };
    }

    if (reservation.status !== "IN_USE") {
      return { error: "预约状态不正确，无法签退" };
    }

    const checkInRecord = await prisma.checkIn.findFirst({
      where: { reservationId, checkOutTime: null },
    });

    // 如果找不到 checkIn 记录，可能数据不一致，但我们要允许签退修复状态
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "COMPLETED" },
      });

      if (checkInRecord) {
        await tx.checkIn.update({
          where: { id: checkInRecord.id },
          data: { checkOutTime: now },
        });
      } else {
        // 补CheckOut记录? 或者忽略
        // 如果没有签到记录但状态是IN_USE (异常情况), 此时应强制结束
      }

      // 释放设备状态
      // await tx.equipment.update({ where: { id: reservation.equipmentId }, data: { status: "AVAILABLE" } });
    });

    revalidatePath("/dashboard/reservation");
    return { success: true };
  } catch (error) {
    console.error("CheckOut error:", error);
    return { error: "签退失败" };
  }
}

// 异常上报
export async function createIncident(data: z.infer<typeof incidentSchema>) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "未经授权" };

    const validated = incidentSchema.safeParse(data);
    if (!validated.success) return { error: "数据校验失败" };

    const { title, description, severity, equipmentId } = validated.data;

    await prisma.incident.create({
      data: {
        userId: session.user.id!,
        title,
        description,
        severity,
        equipmentId,
        status: "OPEN",
      },
    });

    revalidatePath("/dashboard/monitoring/incidents");
    return { success: true };
  } catch (error) {
    return { error: "上报失败" };
  }
}

// 异常状态更新
export async function updateIncidentStatus(incidentId: string, status: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "未经授权" };

    // 权限检查
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "HEAD" && role !== "TEACHER") {
      return { error: "无权限更改状态" };
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: { status },
    });

    revalidatePath("/dashboard/monitoring/incidents");
    return { success: true };
  } catch (error) {
    return { error: "更新失败" };
  }
}

// 惰性自动检查
export async function autoExpireCheck() {
  try {
    // 找到所有 IN_USE 且 当前时间 > endTime + 2小时
    const now = new Date();
    const buffer = 2 * 60 * 60 * 1000;
    const toleranceTime = new Date(now.getTime() - buffer);

    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "IN_USE",
        endTime: { lt: toleranceTime },
      },
    });

    if (expiredReservations.length === 0) return { count: 0 };

    const ids = expiredReservations.map((r) => r.id);

    await prisma.$transaction(async (tx) => {
      // 更新 Reservation
      await tx.reservation.updateMany({
        where: { id: { in: ids } },
        data: { status: "COMPLETED" },
        // 或者设为特殊状态如 "OVERTIME" 如果Enum支持，但Schema里没有，暂用COMPLETED
      });

      // 更新 CheckIn (补 checkOutTime)
      // 找到对应的CheckIn
      await tx.checkIn.updateMany({
        where: { reservationId: { in: ids }, checkOutTime: null },
        data: { checkOutTime: now, notes: "System Auto Checkout" },
      });
    });

    console.log(`Auto-expired ${ids.length} reservations.`);
    return { count: ids.length };
  } catch (error) {
    console.error("Auto expire error:", error);
    return { error: "Check failed" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  maintenanceLogSchema,
  type MaintenanceLogData,
} from "@/lib/schemas/equipment.schema";
import type { ActionResult } from "./auth";

// ========== 获取维护日志列表 ==========

export type MaintenanceLogItem = {
  id: string;
  equipmentId: string;
  content: string;
  logDate: Date;
  operator: string;
};

export type MaintenanceLogListResult = {
  items: MaintenanceLogItem[];
  total: number;
};

export async function getMaintenanceLogsAction(
  equipmentId: string,
  options?: { page?: number; pageSize?: number }
): Promise<ActionResult<MaintenanceLogListResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    const [items, total] = await Promise.all([
      prisma.maintenanceLog.findMany({
        where: { equipmentId },
        orderBy: { logDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.maintenanceLog.count({
        where: { equipmentId },
      }),
    ]);

    return {
      success: true,
      message: "获取成功",
      data: { items, total },
    };
  } catch (error) {
    console.error("getMaintenanceLogsAction error:", error);
    return { success: false, message: "获取维护日志失败" };
  }
}

// ========== 创建维护日志 ==========

export async function createMaintenanceLogAction(
  data: MaintenanceLogData
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 检查权限（ADMIN、HEAD 或当前使用设备的用户可添加日志）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true },
    });

    if (!user) {
      return { success: false, message: "用户不存在" };
    }

    // 校验数据
    const validatedData = maintenanceLogSchema.parse(data);

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: validatedData.equipmentId },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    // 创建维护日志
    const log = await prisma.maintenanceLog.create({
      data: {
        equipmentId: validatedData.equipmentId,
        content: validatedData.content,
        operator: validatedData.operator || user.name,
      },
    });

    revalidatePath(`/dashboard/equipment/${validatedData.equipmentId}`);

    return {
      success: true,
      message: "维护日志添加成功",
      data: { id: log.id },
    };
  } catch (error) {
    console.error("createMaintenanceLogAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "添加维护日志失败" };
  }
}

// ========== 删除维护日志 ==========

export async function deleteMaintenanceLogAction(
  id: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 检查权限（仅 ADMIN 和 HEAD 可删除）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "HEAD")) {
      return {
        success: false,
        message: "权限不足，仅管理员或负责人可删除日志",
      };
    }

    // 检查日志是否存在
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
    });

    if (!log) {
      return { success: false, message: "日志不存在" };
    }

    // 删除日志
    await prisma.maintenanceLog.delete({
      where: { id },
    });

    revalidatePath(`/dashboard/equipment/${log.equipmentId}`);

    return { success: true, message: "日志删除成功" };
  } catch (error) {
    console.error("deleteMaintenanceLogAction error:", error);
    return { success: false, message: "删除日志失败" };
  }
}

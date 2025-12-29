"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  timeSlotSchema,
  updateTimeSlotSchema,
  type TimeSlotData,
  type UpdateTimeSlotData,
} from "@/lib/schemas/equipment.schema";
import type { ActionResult } from "./auth";

// ========== 权限校验辅助函数 ==========

async function checkAdminOrHead(): Promise<
  { success: true; userId: string } | { success: false; message: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "请先登录" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "HEAD")) {
    return { success: false, message: "权限不足，仅管理员或负责人可操作" };
  }

  return { success: true, userId: session.user.id };
}

// ========== 获取设备时段列表 ==========

export type TimeSlotItem = {
  id: string;
  equipmentId: string;
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export async function getTimeSlotsAction(
  equipmentId: string
): Promise<ActionResult<TimeSlotItem[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    const timeSlots = await prisma.equipmentTimeSlot.findMany({
      where: { equipmentId },
      orderBy: [
        { dayOfWeek: "asc" },
        { specificDate: "asc" },
        { startTime: "asc" },
      ],
    });

    return {
      success: true,
      message: "获取成功",
      data: timeSlots,
    };
  } catch (error) {
    console.error("getTimeSlotsAction error:", error);
    return { success: false, message: "获取时段列表失败" };
  }
}

// ========== 创建时段规则 ==========

export async function createTimeSlotAction(
  data: TimeSlotData
): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 校验数据
    const validatedData = timeSlotSchema.parse(data);

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: validatedData.equipmentId },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    // 检查时段冲突（同一设备、同一天/日期、时间重叠）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conflictWhere: any = {
      equipmentId: validatedData.equipmentId,
      OR: [
        // 时间段重叠检测
        {
          startTime: { lt: validatedData.endTime },
          endTime: { gt: validatedData.startTime },
        },
      ],
    };

    if (
      validatedData.dayOfWeek !== null &&
      validatedData.dayOfWeek !== undefined
    ) {
      conflictWhere.dayOfWeek = validatedData.dayOfWeek;
    } else if (validatedData.specificDate) {
      conflictWhere.specificDate = validatedData.specificDate;
    }

    const conflictSlot = await prisma.equipmentTimeSlot.findFirst({
      where: conflictWhere,
    });

    if (conflictSlot) {
      return { success: false, message: "时段与现有配置冲突" };
    }

    // 创建时段
    const timeSlot = await prisma.equipmentTimeSlot.create({
      data: {
        equipmentId: validatedData.equipmentId,
        dayOfWeek: validatedData.dayOfWeek ?? null,
        specificDate: validatedData.specificDate ?? null,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        isAvailable: validatedData.isAvailable,
      },
    });

    revalidatePath(`/dashboard/equipment/${validatedData.equipmentId}`);

    return {
      success: true,
      message: "时段创建成功",
      data: { id: timeSlot.id },
    };
  } catch (error) {
    console.error("createTimeSlotAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "创建时段失败" };
  }
}

// ========== 更新时段规则 ==========

export async function updateTimeSlotAction(
  data: UpdateTimeSlotData
): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 校验数据
    const validatedData = updateTimeSlotSchema.parse(data);
    const { id, ...updateData } = validatedData;

    // 检查时段是否存在
    const existingSlot = await prisma.equipmentTimeSlot.findUnique({
      where: { id },
    });

    if (!existingSlot) {
      return { success: false, message: "时段不存在" };
    }

    // 检查时段冲突（排除自身）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conflictWhere: any = {
      id: { not: id },
      equipmentId: updateData.equipmentId,
      OR: [
        {
          startTime: { lt: updateData.endTime },
          endTime: { gt: updateData.startTime },
        },
      ],
    };

    if (updateData.dayOfWeek !== null && updateData.dayOfWeek !== undefined) {
      conflictWhere.dayOfWeek = updateData.dayOfWeek;
    } else if (updateData.specificDate) {
      conflictWhere.specificDate = updateData.specificDate;
    }

    const conflictSlot = await prisma.equipmentTimeSlot.findFirst({
      where: conflictWhere,
    });

    if (conflictSlot) {
      return { success: false, message: "时段与现有配置冲突" };
    }

    // 更新时段
    await prisma.equipmentTimeSlot.update({
      where: { id },
      data: {
        dayOfWeek: updateData.dayOfWeek ?? null,
        specificDate: updateData.specificDate ?? null,
        startTime: updateData.startTime,
        endTime: updateData.endTime,
        isAvailable: updateData.isAvailable,
      },
    });

    revalidatePath(`/dashboard/equipment/${updateData.equipmentId}`);

    return { success: true, message: "时段更新成功" };
  } catch (error) {
    console.error("updateTimeSlotAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "更新时段失败" };
  }
}

// ========== 删除时段规则 ==========

export async function deleteTimeSlotAction(id: string): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 检查时段是否存在
    const timeSlot = await prisma.equipmentTimeSlot.findUnique({
      where: { id },
    });

    if (!timeSlot) {
      return { success: false, message: "时段不存在" };
    }

    // 删除时段
    await prisma.equipmentTimeSlot.delete({
      where: { id },
    });

    revalidatePath(`/dashboard/equipment/${timeSlot.equipmentId}`);

    return { success: true, message: "时段删除成功" };
  } catch (error) {
    console.error("deleteTimeSlotAction error:", error);
    return { success: false, message: "删除时段失败" };
  }
}

// ========== 批量创建周期时段 ==========

export type BatchTimeSlotData = {
  equipmentId: string;
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

export async function batchCreateTimeSlotsAction(
  data: BatchTimeSlotData
): Promise<ActionResult<{ count: number }>> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    // 删除现有周期时段
    await prisma.equipmentTimeSlot.deleteMany({
      where: {
        equipmentId: data.equipmentId,
        dayOfWeek: { not: null },
      },
    });

    // 批量创建新时段
    const result = await prisma.equipmentTimeSlot.createMany({
      data: data.slots.map((slot) => ({
        equipmentId: data.equipmentId,
        dayOfWeek: slot.dayOfWeek,
        specificDate: null,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true,
      })),
    });

    revalidatePath(`/dashboard/equipment/${data.equipmentId}`);

    return {
      success: true,
      message: `成功创建 ${result.count} 个时段`,
      data: { count: result.count },
    };
  } catch (error) {
    console.error("batchCreateTimeSlotsAction error:", error);
    return { success: false, message: "批量创建时段失败" };
  }
}

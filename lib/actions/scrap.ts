"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createScrapSchema,
  type CreateScrapInput,
} from "@/lib/schemas/scrap.schema";
import { RequestStatus, Role, EquipmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取报废申请列表
 */
export async function getScrapRequestsAction() {
  const session = await auth();
  if (!session?.user?.role) return { error: "未登录" };
  const { role } = session.user;

  try {
    let whereCondition: any = {};
    if (role === Role.HEAD) {
      // HEAD 看所有
    } else if (role === Role.ADMIN) {
      // ADMIN 看自己申请的？还是所有的？
      // 通常报废是重大事项，ADMIN 可能负责发起，HEAD 审批。
      whereCondition = { applicantId: session.user.id };
    } else {
      return { error: "无权访问" };
    }

    const requests = await prisma.scrapRequest.findMany({
      where: whereCondition,
      include: {
        applicant: { select: { name: true, username: true } },
        equipment: { select: { name: true, model: true, manufacturer: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: requests };
  } catch (error) {
    console.error("Failed to fetch scrap requests:", error);
    return { error: "获取列表失败" };
  }
}

/**
 * 提交报废申请
 */
export async function createScrapRequestAction(input: CreateScrapInput) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) {
    // 假设只有管理员能发起报废，HEAD 审批
    // 其实 HEAD 自己也能发起，逻辑上没问题
    if (session?.user?.role !== Role.HEAD) {
      return { error: "无权发起报废申请" };
    }
  }

  const parseResult = createScrapSchema.safeParse(input);
  if (!parseResult.success) return { error: "输入无效" };

  const { equipmentId, reason } = parseResult.data;

  try {
    // 检查设备状态，如果不空闲，可能不能报废 (或者都可以)
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) return { error: "设备不存在" };
    if (equipment.status === EquipmentStatus.SCRAPPED)
      return { error: "该设备已报废" };

    // 检查是否已有 Pending 的申请
    const existing = await prisma.scrapRequest.findFirst({
      where: { equipmentId, status: RequestStatus.PENDING },
    });
    if (existing) return { error: "该设备已有待审批的报废申请" };

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      await tx.scrapRequest.create({
        data: {
          applicantId: session.user.id,
          equipmentId,
          reason,
          status: RequestStatus.PENDING,
        },
      });

      // Update equipment status to SCRAP_REQUESTED
      await tx.equipment.update({
        where: { id: equipmentId },
        data: { status: EquipmentStatus.SCRAP_REQUESTED },
      });
    });

    revalidatePath("/dashboard/admin/scrap");
    revalidatePath("/dashboard/equipment"); // Update equipment list
    return { success: true };
  } catch (error) {
    console.error("Failed to create scrap request:", error);
    return {
      error: "申请失败",
    };
  }
}

/**
 * 审批通过 (HEAD only) -> 自动标记设备为 SCRAPPED
 */
export async function approveScrapRequestAction(id: string) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 更新申请状态
      const request = await tx.scrapRequest.update({
        where: { id },
        data: { status: RequestStatus.APPROVED },
        include: { equipment: true }, // 无需全字段，但为了确保存在
      });

      // 2. 更新设备状态为已报废
      await tx.equipment.update({
        where: { id: request.equipmentId },
        data: { status: EquipmentStatus.SCRAPPED },
      });

      // 3. 记录维护日志
      await tx.maintenanceLog.create({
        data: {
          equipmentId: request.equipmentId,
          content: `设备报废申请已通过 (申请ID: ${request.id})`,
          operator: session.user.name || session.user.username,
        },
      });
    });

    revalidatePath("/dashboard/admin/scrap");
    revalidatePath("/dashboard/equipment"); // 设备列表状态变更
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "审批失败" };
  }
}

/**
 * 审批驳回
 */
export async function rejectScrapRequestAction(id: string, reason: string) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  try {
    const request = await prisma.scrapRequest.findUnique({
      where: { id },
      select: { equipmentId: true },
    });

    if (!request) return { error: "申请不存在" };

    await prisma.$transaction(async (tx) => {
      await tx.scrapRequest.update({
        where: { id },
        data: {
          status: RequestStatus.REJECTED,
          rejectReason: reason,
        },
      });

      // Revert equipment status to AVAILABLE (or previous status if we tracked it, but AVAILABLE is safe assumption for now)
      await tx.equipment.update({
        where: { id: request.equipmentId },
        data: { status: EquipmentStatus.AVAILABLE },
      });
    });

    revalidatePath("/dashboard/admin/scrap");
    revalidatePath("/dashboard/equipment");
    return { success: true };
  } catch (error) {
    return { error: "操作失败" };
  }
}

/**
 * 批量审批通过报废申请
 */
export async function batchApproveScrapAction(ids: string[]) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  if (ids.length === 0) return { error: "未选择任何申请" };

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    const result = await approveScrapRequestAction(id);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  revalidatePath("/dashboard/admin/scrap");
  revalidatePath("/dashboard/equipment");

  if (failCount === 0) {
    return { success: true, message: `成功批准 ${successCount} 个申请` };
  } else {
    return {
      success: true,
      message: `批准 ${successCount} 个，失败 ${failCount} 个`,
    };
  }
}

/**
 * 批量驳回报废申请
 */
export async function batchRejectScrapAction(ids: string[], reason: string) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  if (ids.length === 0) return { error: "未选择任何申请" };

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    const result = await rejectScrapRequestAction(id, reason);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  revalidatePath("/dashboard/admin/scrap");
  revalidatePath("/dashboard/equipment");

  if (failCount === 0) {
    return { success: true, message: `成功驳回 ${successCount} 个申请` };
  } else {
    return {
      success: true,
      message: `驳回 ${successCount} 个，失败 ${failCount} 个`,
    };
  }
}

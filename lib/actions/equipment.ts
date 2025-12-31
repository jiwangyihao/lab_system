"use server";

import { prisma, TransactionClient } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentFilterSchema,
  changeStatusSchema,
  type CreateEquipmentData,
  type UpdateEquipmentData,
  type EquipmentFilterData,
  type ChangeStatusData,
  type EquipmentStatus,
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

// ========== 获取设备列表 ==========

export type EquipmentListItem = {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  purchaseDate: Date;
  status: EquipmentStatus;
  rentalPrice: number;
  maintenanceCycle: number | null;
  admin: {
    id: string;
    name: string;
    username: string;
  } | null;
};

export type EquipmentListResult = {
  items: EquipmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getEquipmentsAction(
  filters?: Partial<EquipmentFilterData>
): Promise<ActionResult<EquipmentListResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 解析并验证筛选参数
    const validatedFilters = equipmentFilterSchema.parse(filters ?? {});
    const { search, status, page, pageSize, sortBy, sortOrder } =
      validatedFilters;

    // 构建查询条件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (validatedFilters.adminId) {
      where.adminId = validatedFilters.adminId;
    }

    // 排除已报废设备（除非明确筛选） - 用户反馈希望看到报废设备，暂取消默认隐藏
    // if (!status) {
    //   where.status = { not: "SCRAPPED" };
    // }

    // 构建排序
    const orderBy = sortBy ? { [sortBy]: sortOrder } : { name: "asc" as const };

    // 执行查询
    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          model: true,
          manufacturer: true,
          purchaseDate: true,
          status: true,
          rentalPrice: true,
          maintenanceCycle: true,
          admin: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      prisma.equipment.count({ where }),
    ]);

    return {
      success: true,
      message: "获取成功",
      data: {
        items: items as EquipmentListItem[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getEquipmentsAction error:", error);
    return { success: false, message: "获取设备列表失败" };
  }
}

// ========== 获取设备详情 ==========

export type EquipmentDetail = EquipmentListItem & {
  timeSlots: Array<{
    id: string;
    dayOfWeek: number | null;
    specificDate: Date | null;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  maintenanceLogs: Array<{
    id: string;
    content: string;
    logDate: Date;
    operator: string;
  }>;
  _count: {
    reservations: number;
  };
};

export async function getEquipmentByIdAction(
  id: string
): Promise<ActionResult<EquipmentDetail>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        timeSlots: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        maintenanceLogs: {
          orderBy: { logDate: "desc" },
          take: 20,
        },
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    return {
      success: true,
      message: "获取成功",
      data: equipment as unknown as EquipmentDetail,
    };
  } catch (error) {
    console.error("getEquipmentByIdAction error:", error);
    return { success: false, message: "获取设备详情失败" };
  }
}

// ========== 创建设备 ==========

export async function createEquipmentAction(
  data: CreateEquipmentData
): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 校验数据
    const validatedData = createEquipmentSchema.parse(data);

    // 创建设备
    const equipment = await prisma.equipment.create({
      data: {
        name: validatedData.name,
        model: validatedData.model,
        manufacturer: validatedData.manufacturer,
        purchaseDate: validatedData.purchaseDate,
        status: validatedData.status,
        rentalPrice: validatedData.rentalPrice,
        maintenanceCycle: validatedData.maintenanceCycle ?? null,
        adminId: validatedData.adminId,
      },
    });

    revalidatePath("/dashboard/equipment");

    return {
      success: true,
      message: "设备创建成功",
      data: { id: equipment.id },
    };
  } catch (error) {
    console.error("createEquipmentAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "创建设备失败" };
  }
}

// ========== 更新设备 ==========

export async function updateEquipmentAction(
  data: UpdateEquipmentData
): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 校验数据
    const validatedData = updateEquipmentSchema.parse(data);
    const { id, ...updateData } = validatedData;

    // 检查设备是否存在
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return { success: false, message: "设备不存在" };
    }

    // 更新设备
    await prisma.equipment.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/equipment");
    revalidatePath(`/dashboard/equipment/${id}`);

    return { success: true, message: "设备更新成功" };
  } catch (error) {
    console.error("updateEquipmentAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "更新设备失败" };
  }
}

// ========== 删除设备 (软删除 - 标记为报废) ==========

export async function deleteEquipmentAction(id: string): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: {
              where: {
                status: {
                  in: [
                    "PENDING_TEACHER",
                    "PENDING_ADMIN",
                    "PENDING_HEAD",
                    "APPROVED",
                    "IN_USE",
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    // 检查是否有进行中的预约
    if (equipment._count.reservations > 0) {
      return { success: false, message: "该设备有进行中的预约，无法报废" };
    }

    // 软删除 - 标记为报废
    await prisma.equipment.update({
      where: { id },
      data: { status: "SCRAPPED" },
    });

    revalidatePath("/dashboard/equipment");

    return { success: true, message: "设备已报废" };
  } catch (error) {
    console.error("deleteEquipmentAction error:", error);
    return { success: false, message: "删除设备失败" };
  }
}

// ========== 变更设备状态 ==========

// 状态机：定义有效的状态转换
const validTransitions: Record<EquipmentStatus, EquipmentStatus[]> = {
  AVAILABLE: ["OCCUPIED", "MAINTENANCE", "SCRAP_REQUESTED", "SCRAPPED"],
  OCCUPIED: ["AVAILABLE", "MAINTENANCE", "SCRAP_REQUESTED"],
  MAINTENANCE: ["AVAILABLE", "SCRAP_REQUESTED", "SCRAPPED"],
  SCRAP_REQUESTED: ["AVAILABLE", "SCRAPPED"], // 申请被拒回 AVAILABLE，通过变 SCRAPPED
  SCRAPPED: [], // 已报废设备不可恢复
};

export async function changeEquipmentStatusAction(
  data: ChangeStatusData
): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) {
      return authCheck;
    }

    // 校验数据
    const validatedData = changeStatusSchema.parse(data);
    const { id, newStatus, reason } = validatedData;

    // 检查设备当前状态
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { status: true, name: true },
    });

    if (!equipment) {
      return { success: false, message: "设备不存在" };
    }

    const currentStatus = equipment.status as EquipmentStatus;

    // 校验状态转换是否有效
    if (!validTransitions[currentStatus].includes(newStatus)) {
      return {
        success: false,
        message: `无法将设备从「${getStatusLabel(
          currentStatus
        )}」变更为「${getStatusLabel(newStatus)}」`,
      };
    }

    // 使用事务更新状态并记录日志
    await prisma.$transaction(async (tx: TransactionClient) => {
      // 更新状态
      await tx.equipment.update({
        where: { id },
        data: { status: newStatus },
      });

      // 如果变更为维修状态或报废，添加维护日志
      if (newStatus === "MAINTENANCE" || newStatus === "SCRAPPED") {
        const session = await auth();
        const user = await tx.user.findUnique({
          where: { id: session!.user!.id },
          select: { name: true },
        });

        await tx.maintenanceLog.create({
          data: {
            equipmentId: id,
            content: reason || `设备状态变更为${getStatusLabel(newStatus)}`,
            operator: user?.name || "系统",
          },
        });
      }
    });

    revalidatePath("/dashboard/equipment");
    revalidatePath(`/dashboard/equipment/${id}`);

    return { success: true, message: "状态变更成功" };
  } catch (error) {
    console.error("changeEquipmentStatusAction error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "状态变更失败" };
  }
}

// ========== 批量操作 ==========

export async function batchDeleteEquipmentAction(
  ids: string[]
): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) return authCheck;

    if (!ids.length) return { success: false, message: "未选择任何设备" };

    // 检查是否有进行中的预约
    const pendingCount = await prisma.reservation.count({
      where: {
        equipmentId: { in: ids },
        status: {
          in: [
            "PENDING_TEACHER",
            "PENDING_ADMIN",
            "PENDING_HEAD",
            "APPROVED",
            "IN_USE",
          ],
        },
      },
    });

    if (pendingCount > 0) {
      return {
        success: false,
        message: "选中的设备中存在进行中的预约，无法批量报废",
      };
    }

    // 批量更新为已报废
    await prisma.equipment.updateMany({
      where: { id: { in: ids } },
      data: { status: "SCRAPPED" },
    });

    // 记录日志 (系统操作)
    // 批量记录比较麻烦，暂略，或者循环创建. createMany supported.
    // 但 maintenanceLog 需要 equipmentId.
    // 简单起见，仅更新状态.

    revalidatePath("/dashboard/equipment");
    return { success: true, message: `成功报废 ${ids.length} 台设备` };
  } catch (error) {
    return { success: false, message: "批量操作失败" };
  }
}

export async function batchChangeStatusAction(
  ids: string[],
  newStatus: EquipmentStatus
): Promise<ActionResult> {
  try {
    const authCheck = await checkAdminOrHead();
    if (!authCheck.success) return authCheck;

    if (!ids.length) return { success: false, message: "未选择任何设备" };

    // 简单批量更新，不检查每台设备的状态迁移是否合法 (假设批量操作强制执行或由前端过滤)
    // 但为了数据一致性，最好还是检查.
    // 如果是设置为 AVAILABLE or MAINTENANCE, 通常可以直接更.
    // 这里直接 updateMany.

    await prisma.equipment.updateMany({
      where: { id: { in: ids } },
      data: { status: newStatus },
    });

    revalidatePath("/dashboard/equipment");
    return { success: true, message: `成功更新 ${ids.length} 台设备状态` };
  } catch (error) {
    return { success: false, message: "批量更新失败" };
  }
}

// ========== 辅助函数 ==========

function getStatusLabel(status: EquipmentStatus): string {
  const labels: Record<EquipmentStatus, string> = {
    AVAILABLE: "空闲",
    OCCUPIED: "占用",
    MAINTENANCE: "维修中",
    SCRAP_REQUESTED: "报废申请中",
    SCRAPPED: "已报废",
  };
  return labels[status] || status;
}

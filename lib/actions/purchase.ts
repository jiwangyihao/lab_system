"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPurchaseSchema,
  type CreatePurchaseInput,
} from "@/lib/schemas/purchase.schema";
import { RequestStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 获取设备管理员列表 (供教师选择)
 */
export async function getEquipmentAdminsAction() {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };

  try {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true, name: true, username: true },
    });
    return { data: admins };
  } catch (error) {
    return { error: "获取管理员列表失败" };
  }
}

/**
 * 获取采购申请列表
 */
export async function getPurchaseRequestsAction() {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };

  const { role, id: userId } = session.user;

  try {
    let whereCondition: any = {};

    if (role === Role.HEAD) {
      // HEAD 可以看到所有申请，重点关注 PENDING_HEAD (待负责人审批)
      whereCondition = {};
    } else if (role === Role.ADMIN) {
      // ADMIN 可以看到:
      // 1. 自己提交的申请 (applicantId = userId)
      // 2. 指派给自己审批的申请 (targetAdminId = userId)
      whereCondition = {
        OR: [{ applicantId: userId }, { targetAdminId: userId }],
      };
    } else {
      // 普通申请人只能看自己的
      whereCondition = { applicantId: userId };
    }

    const requests = await prisma.purchaseRequest.findMany({
      where: whereCondition,
      include: {
        applicant: {
          select: { name: true, username: true },
        },
        targetAdmin: {
          select: { name: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: requests };
  } catch (error) {
    console.error("Failed to fetch purchase requests:", error);
    return { error: "获取列表失败" };
  }
}

/**
 * 提交采购申请
 */
export async function createPurchaseRequestAction(input: CreatePurchaseInput) {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };

  const userRole = session.user.role;

  if (!([Role.ADMIN, Role.TEACHER, Role.HEAD] as string[]).includes(userRole)) {
    return { error: "无权提交申请" };
  }

  const parseResult = createPurchaseSchema.safeParse(input);
  if (!parseResult.success) return { error: "输入无效" };

  const { name, model, quantity, budget, reason, targetAdminId } =
    parseResult.data;

  // 校验 logic
  let finalTargetAdminId = targetAdminId;

  if (userRole === Role.TEACHER) {
    if (!finalTargetAdminId) {
      return { error: "请选择负责的设备管理员" };
    }
  } else if (userRole === Role.ADMIN) {
    // 管理员默认为自己
    finalTargetAdminId = session.user.id;
  }

  try {
    await prisma.purchaseRequest.create({
      data: {
        applicantId: session.user.id,
        targetAdminId: finalTargetAdminId,
        name,
        model,
        quantity,
        budget,
        reason,
        status:
          userRole === Role.ADMIN
            ? RequestStatus.PENDING_HEAD
            : RequestStatus.PENDING,
      },
    });

    revalidatePath("/dashboard/admin/purchase");
    return { success: true };
  } catch (error) {
    console.error("Failed to create purchase request:", error);
    return { error: "提交申请失败" };
  }
}

/**
 * 审批通过
 */
export async function approvePurchaseRequestAction(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };

  const { role, id: userId } = session.user;

  try {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!request) return { error: "申请不存在" };

    if (request.status === RequestStatus.PENDING) {
      // 阶段一: 管理员审批
      // 只有被指定的管理员能批 (或者 HEAD 也可以直接批?) -> 假设严格流程
      // 如果 ADMIN 发起的，targetAdminId 是自己，自己给自己批?
      // "如果是设备管理员发起的采购请求...流转至HEAD"
      // 所以 ADMIN 发起时，状态虽然是 PENDING，但应该直接由 HEAD 批?
      // 更合理的逻辑:
      // 1. TEACHER 发起 -> PENDING (Assignee: Admin)
      // 2. ADMIN 发起 -> PENDING (Assignee: HEAD) - 此时 Admin 已经是 targetAdmin
      // 或者: ADMIN 发起 -> PENDING_HEAD (直接进二审)?
      // 让我们在 create 时处理: ADMIN 发起 -> PENDING_HEAD.
      // 但上面代码 `create` 里写了 `status: RequestStatus.PENDING`.
      // 我们可以让 ADMIN 自己点一下 "提交/确认"? 或者 HEAD 看到 PENDING 且 applicant=ADMIN 就直接批.
      // 简单起见:
      // 如果 当前用户是 HEAD -> 直接通过 (变为 APPROVED, or PENDING_HEAD -> APPROVED)
      // 如果 当前用户是 ADMIN -> 变为 PENDING_HEAD (提交给 HEAD)

      if (role === Role.HEAD) {
        // HEAD 有权直接终审通过 (跳过 Admin 如果需要，或者 Admin 发起的)
        await prisma.$transaction(async (tx) => {
          await tx.purchaseRequest.update({
            where: { id },
            data: { status: RequestStatus.APPROVED },
          });

          // 自动创建设备 (根据数量批量创建)
          for (let i = 0; i < request.quantity; i++) {
            await tx.equipment.create({
              data: {
                name: `${request.name} #${i + 1}`,
                model: request.model,
                manufacturer: "待补充", // 采购申请中未包含厂家信息
                purchaseDate: new Date(),
                status: "AVAILABLE",
                rentalPrice: 0, // 初始价格为 0
                adminId: request.targetAdminId, // 关联负责管理员
                maintenanceCycle: 30, // 默认周期
              },
            });
          }
        });
      } else if (role === Role.ADMIN) {
        // ADMIN 只能操作指派给自己的
        if (request.targetAdminId !== userId) {
          return { error: "无权操作他人的申请" };
        }
        // Admin Approval -> PENDING_HEAD
        await prisma.purchaseRequest.update({
          where: { id },
          data: { status: RequestStatus.PENDING_HEAD },
        });
      } else {
        return { error: "无权操作" };
      }
    } else if (request.status === RequestStatus.PENDING_HEAD) {
      // 阶段二: 负责人审批
      if (role !== Role.HEAD) return { error: "等待负责人审批" };

      await prisma.$transaction(async (tx) => {
        await tx.purchaseRequest.update({
          where: { id },
          data: { status: "APPROVED" },
        });

        // 自动创建设备 (根据数量批量创建)
        for (let i = 0; i < request.quantity; i++) {
          await tx.equipment.create({
            data: {
              name: `${request.name} #${i + 1}`,
              model: request.model,
              manufacturer: "待补充",
              purchaseDate: new Date(),
              status: "AVAILABLE",
              rentalPrice: 0,
              adminId: request.targetAdminId,
              maintenanceCycle: 30,
            },
          });
        }
      });
    }

    revalidatePath("/dashboard/admin/purchase");
    return { success: true };
  } catch (error) {
    return { error: "操作失败" };
  }
}

/**
 * 审批驳回
 */
export async function rejectPurchaseRequestAction(id: string, reason: string) {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };
  // HEAD 或 负责的 ADMIN 可驳回

  try {
    const request = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!request) return { error: "申请不存在" };

    const { role, id: userId } = session.user;
    const canReject =
      role === Role.HEAD ||
      (role === Role.ADMIN && request.targetAdminId === userId);

    if (!canReject) return { error: "无权操作" };

    await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        rejectReason: reason,
      },
    });

    revalidatePath("/dashboard/admin/purchase");
    return { success: true };
  } catch (error) {
    return { error: "操作失败" };
  }
}

/**
 * 批量通过
 */
export async function batchApprovePurchaseAction(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "未登录" };

  try {
    // 简化处理：循环调用单个审批
    for (const id of ids) {
      await approvePurchaseRequestAction(id);
    }
    return { success: true, message: `已处理 ${ids.length} 个申请` };
  } catch (error) {
    return { success: false, error: "批量处理失败" };
  }
}

/**
 * 批量驳回
 */
export async function batchRejectPurchaseAction(ids: string[], reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "未登录" };

  try {
    await prisma.purchaseRequest.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: RequestStatus.REJECTED,
        rejectReason: reason,
      },
    });

    revalidatePath("/dashboard/admin/purchase");
    return { success: true, message: "已批量驳回" };
  } catch (error) {
    return { success: false, error: "批量驳回失败" };
  }
}

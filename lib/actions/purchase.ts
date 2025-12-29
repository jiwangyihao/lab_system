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
 * 获取采购申请列表
 * - ADMIN/TEACHER: 只能看自己的 (或者 ADMIN 看所有的? 需求未明确，假设 ADMIN 看所有 or 看自己的。
 *   通常 ADMIN 负责采购，可能是申请人。HEAD 负责审批，看所有的 pending)
 *   根据 Stage 4 描述: `HEAD` 在列表页查看待审批项.
 *   这里我们实现一个通用查询，根据角色过滤。
 */
export async function getPurchaseRequestsAction() {
  const session = await auth();
  if (!session?.user) return { error: "未登录" };

  const { role, id: userId } = session.user;

  try {
    let whereCondition: any = {};

    if (role === Role.HEAD) {
      // HEAD 可以看到所有申请
      whereCondition = {};
    } else if (role === Role.ADMIN || role === Role.TEACHER) {
      // 普通申请人只能看自己的
      whereCondition = { applicantId: userId };
    } else {
      return { error: "无权访问" };
    }

    const requests = await prisma.purchaseRequest.findMany({
      where: whereCondition,
      include: {
        applicant: {
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

  // 假设只有 ADMIN 和 TEACHER 可以申请 (且 HEAD 也可以)
  if (
    !([Role.ADMIN, Role.TEACHER, Role.HEAD] as string[]).includes(
      session.user.role
    )
  ) {
    return { error: "无权提交申请" };
  }

  const parseResult = createPurchaseSchema.safeParse(input);
  if (!parseResult.success) return { error: "输入无效" };

  const { name, model, quantity, budget, reason } = parseResult.data;

  try {
    await prisma.purchaseRequest.create({
      data: {
        applicantId: session.user.id,
        name,
        model,
        quantity,
        budget,
        reason,
        status: RequestStatus.PENDING,
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
 * 审批通过 (HEAD only)
 */
export async function approvePurchaseRequestAction(id: string) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  try {
    await prisma.purchaseRequest.update({
      where: { id },
      data: { status: RequestStatus.APPROVED },
    });

    // 审批通过后，是否需要自动创建 Equipment 记录?
    // 通常采购通过后是“等待入库”，设备入库是另一个流程 (createEquipment)。
    // 这里只改变申请状态。

    revalidatePath("/dashboard/admin/purchase");
    return { success: true };
  } catch (error) {
    return { error: "操作失败" };
  }
}

/**
 * 审批驳回 (HEAD only)
 */
export async function rejectPurchaseRequestAction(id: string, reason: string) {
  const session = await auth();
  if (session?.user?.role !== Role.HEAD) return { error: "无权操作" };

  try {
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

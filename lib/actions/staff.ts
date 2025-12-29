"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "@/lib/schemas/staff.schema";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";

/**
 * 获取员工列表 (仅 HEAD 可见)
 */
export async function getStaffsAction() {
  const session = await auth();

  if (session?.user?.role !== Role.HEAD) {
    return { error: "无权访问" };
  }

  try {
    const staffs = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.TEACHER, Role.HEAD],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { data: staffs };
  } catch (error) {
    console.error("Failed to fetch staffs:", error);
    return { error: "获取员工列表失败" };
  }
}

/**
 * 创建新员工
 */
export async function createStaffAction(input: CreateStaffInput) {
  const session = await auth();

  if (session?.user?.role !== Role.HEAD) {
    return { error: "无权执行此操作" };
  }

  const parseResult = createStaffSchema.safeParse(input);
  if (!parseResult.success) {
    return { error: "输入数据无效" };
  }

  const { username, password, name, role, phone, email } = parseResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { error: "用户名已存在" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
        phone,
        email: email || null,
        isActive: true, // 默认启用
        // 根据角色创建关联表 (简化处理，暂时只创建 User，业务逻辑中可能后续需要补全 Teacher 等信息)
        // 如果是 Teacher，通常需要额外信息，这里作为 Staff 管理，假设只关注账号权限
        // 若业务强更求 Teacher 表存在，需在此处处理，但 Staff Form 可能只填基础信息
      },
    });

    revalidatePath("/dashboard/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to create staff:", error);
    return { error: "创建员工失败" };
  }
}

/**
 * 更新员工信息/角色
 */
export async function updateStaffAction(input: UpdateStaffInput) {
  const session = await auth();

  if (session?.user?.role !== Role.HEAD) {
    return { error: "无权执行此操作" };
  }

  const parseResult = updateStaffSchema.safeParse(input);
  if (!parseResult.success) {
    return { error: "输入数据无效" };
  }

  const { id, name, role, phone, email, isActive } = parseResult.data;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        phone,
        email: email || null,
        isActive,
      },
    });

    revalidatePath("/dashboard/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to update staff:", error);
    return { error: "更新员工失败" };
  }
}

/**
 * 删除员工 (或停用)
 */
export async function deleteStaffAction(id: string) {
  const session = await auth();

  if (session?.user?.role !== Role.HEAD) {
    return { error: "无权执行此操作" };
  }

  try {
    // 检查是否有关联数据，若有则不能硬删除，改为停用
    // 为简化，这里先尝试删除，若失败则提示；或者直接逻辑删除
    // 根据需求 "停用/启用：软删除或冻结账号"，我们优先更新 isActive
    // 但此 Action 命名为 delete，若前端是“删除”按钮，我们执行物理删除?
    // 安全起见，这里实现物理删除，但前端应谨慎调用。或者实现 toggleActive

    // 检查是否存在关联
    // const user = await prisma.user.findUnique({ where: { id }, include: { reservations: true } });
    // if (user?.reservations.length > 0) return { error: "该用户有历史数据，无法删除，请禁用账号" };

    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/dashboard/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete staff:", error);
    // Prisma error code logic could go here
    return {
      error: "删除失败，该用户可能包含关联数据（如预约记录），建议改为停用账号",
    };
  }
}

/**
 * 切换员工状态 (启用/禁用)
 */
export async function toggleStaffStatusAction(id: string, isActive: boolean) {
  const session = await auth();

  if (session?.user?.role !== Role.HEAD) {
    return { error: "无权执行此操作" };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/dashboard/admin/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle staff status:", error);
    return { error: "操作失败" };
  }
}

"use server";

import { prisma, TransactionClient } from "@/lib/prisma";
import bcrypt from "bcrypt";
import {
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  type RegisterFormData,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
} from "@/lib/schemas/auth.schema";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ========== 注册 Action ==========

export type ActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function registerAction(
  formData: RegisterFormData
): Promise<ActionResult<{ userId: string }>> {
  try {
    // 1. 校验表单数据
    const validatedData = registerSchema.parse(formData);

    // 2. 检查用户名唯一性
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return {
        success: false,
        message: "用户名已被占用",
      };
    }

    // 3. 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 4. 使用事务创建用户和扩展表
    const user = await prisma.$transaction(async (tx: TransactionClient) => {
      // 创建主用户记录
      const newUser = await tx.user.create({
        data: {
          username: validatedData.username,
          password: hashedPassword,
          name: validatedData.name,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          role: validatedData.role,
        },
      });

      // 根据角色创建扩展表记录
      switch (validatedData.role) {
        case "STUDENT":
          // 检查学号唯一性
          const existingStudent = await tx.student.findUnique({
            where: { studentNo: validatedData.studentNo },
          });
          if (existingStudent) {
            throw new Error("学号已被注册");
          }

          await tx.student.create({
            data: {
              userId: newUser.id,
              studentNo: validatedData.studentNo,
              major: validatedData.major,
              className: validatedData.className,
              tutorId: validatedData.tutorId || null,
            },
          });
          break;

        case "TEACHER":
          // 检查工号唯一性
          const existingTeacher = await tx.teacher.findUnique({
            where: { teacherNo: validatedData.teacherNo },
          });
          if (existingTeacher) {
            throw new Error("工号已被注册");
          }

          await tx.teacher.create({
            data: {
              userId: newUser.id,
              teacherNo: validatedData.teacherNo,
              title: validatedData.title,
              department: validatedData.department,
            },
          });
          break;

        case "OUTSIDER":
          await tx.outsider.create({
            data: {
              userId: newUser.id,
              idCard: validatedData.idCard,
              company: validatedData.company,
              balance: 0,
            },
          });
          break;
      }

      return newUser;
    });

    return {
      success: true,
      message: "注册成功",
      data: { userId: user.id },
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "注册失败，请稍后重试",
    };
  }
}

// ========== 更新个人资料 Action ==========

export async function updateProfileAction(
  formData: UpdateProfileFormData
): Promise<ActionResult> {
  try {
    // 1. 获取当前会话
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "请先登录",
      };
    }

    // 2. 校验表单数据
    const validatedData = updateProfileSchema.parse(formData);

    // 3. 更新用户信息
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "个人资料更新成功",
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "更新失败，请稍后重试",
    };
  }
}

// ========== 修改密码 Action ==========

export async function changePasswordAction(
  formData: ChangePasswordFormData
): Promise<ActionResult> {
  try {
    // 1. 获取当前会话
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "请先登录",
      };
    }

    // 2. 校验表单数据
    const validatedData = changePasswordSchema.parse(formData);

    // 3. 获取当前用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    // 4. 验证当前密码
    const passwordMatch = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return {
        success: false,
        message: "当前密码错误",
      };
    }

    // 5. 加密新密码并更新
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return {
      success: true,
      message: "密码修改成功",
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "修改密码失败，请稍后重试",
    };
  }
}

// ========== 获取当前用户信息 Action ==========

export async function getCurrentUserAction(): Promise<
  ActionResult<{
    id: string;
    username: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: string;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "请先登录",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "用户不存在",
      };
    }

    return {
      success: true,
      message: "获取成功",
      data: user,
    };
  } catch (error) {
    return {
      success: false,
      message: "获取用户信息失败",
    };
  }
}

// ========== 获取教师列表 (用于学生注册选择导师) ==========

export async function getTeachersAction(): Promise<
  ActionResult<Array<{ id: string; name: string; department: string }>>
> {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "获取成功",
      data: teachers.map(
        (t: {
          userId: string;
          department: string;
          user: { id: string; name: string };
        }) => ({
          id: t.userId,
          name: t.user.name,
          department: t.department,
        })
      ),
    };
  } catch (error) {
    return {
      success: false,
      message: "获取教师列表失败",
    };
  }
}

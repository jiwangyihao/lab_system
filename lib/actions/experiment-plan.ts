"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateExperimentPlanSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  description: z.string().optional(),
  targetUsers: z.string().optional(), // JSON
});

export async function getExperimentPlans() {
  try {
    const plans = await prisma.experimentPlan.findMany({
      orderBy: { startDate: "asc" },
    });
    return { success: true, data: plans };
  } catch (error) {
    console.error("Failed to fetch experiment plans:", error);
    return { success: false, error: "获取实验计划失败" };
  }
}

export async function createExperimentPlan(
  data: z.infer<typeof CreateExperimentPlanSchema>
) {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权操作" };
  }

  const result = CreateExperimentPlanSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: "数据格式错误" };
  }

  try {
    await prisma.experimentPlan.create({
      data: {
        title: result.data.title,
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        description: result.data.description,
        targetUsers: result.data.targetUsers,
      },
    });

    revalidatePath("/dashboard/settings/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to create experiment plan:", error);
    return { success: false, error: "创建失败" };
  }
}

export async function deleteExperimentPlan(id: string) {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权操作" };
  }

  try {
    await prisma.experimentPlan.delete({
      where: { id },
    });
    revalidatePath("/dashboard/settings/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete experiment plan:", error);
    return { success: false, error: "删除失败" };
  }
}

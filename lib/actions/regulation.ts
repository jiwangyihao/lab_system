"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Define the structure for nested regulation items
export type RegulationItem = {
  id: string;
  text: string;
  children?: RegulationItem[];
};

// Recursive Zod schema for validation
const RegulationItemSchema: z.ZodType<RegulationItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string().min(1, "内容不能为空"),
    children: z.array(RegulationItemSchema).optional(),
  })
);

const CreateRegulationSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  content: z.array(RegulationItemSchema),
  isActive: z.boolean().default(true),
});

const UpdateRegulationSchema = CreateRegulationSchema.partial().extend({
  id: z.string(),
});

/**
 * Get all regulations, sorted by order
 */
export async function getRegulations() {
  try {
    const regulations = await prisma.regulation.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return { success: true, data: regulations };
  } catch (error) {
    console.error("Failed to fetch regulations:", error);
    return { success: false, error: "获取规章制度失败" };
  }
}

/**
 * Get all regulations (including inactive) for management, sorted by order
 */
export async function getAllRegulationsForAdmin() {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权访问" };
  }

  try {
    const regulations = await prisma.regulation.findMany({
      orderBy: { order: "asc" },
    });
    return { success: true, data: regulations };
  } catch (error) {
    console.error("Failed to fetch regulations for admin:", error);
    return { success: false, error: "获取规章制度失败" };
  }
}

/**
 * Get a single regulation by ID
 */
export async function getRegulation(id: string) {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权访问" };
  }

  try {
    const regulation = await prisma.regulation.findUnique({
      where: { id },
    });
    if (!regulation) return { success: false, error: "未找到规章制度" };
    return { success: true, data: regulation };
  } catch (error) {
    console.error("Failed to fetch regulation:", error);
    return { success: false, error: "获取规章制度失败" };
  }
}

/**
 * Create a new regulation
 */
export async function createRegulation(
  data: z.infer<typeof CreateRegulationSchema>
) {
  const session = await auth();
  if (session?.user?.role !== "HEAD") {
    return { success: false, error: "无权操作" };
  }

  const result = CreateRegulationSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: "数据格式错误" };
  }

  try {
    // Get the max order to append to the end
    const lastRegulation = await prisma.regulation.findFirst({
      orderBy: { order: "desc" },
    });
    const newOrder = (lastRegulation?.order ?? 0) + 1;

    await prisma.regulation.create({
      data: {
        title: result.data.title,
        content: result.data.content as any, // Prisma handles Json type automatically
        isActive: result.data.isActive,
        order: newOrder,
      },
    });

    revalidatePath("/dashboard/settings/rules");
    return { success: true };
  } catch (error) {
    console.error("Failed to create regulation:", error);
    return { success: false, error: "创建失败" };
  }
}

/**
 * Update an existing regulation
 */
export async function updateRegulation(
  data: z.infer<typeof UpdateRegulationSchema>
) {
  const session = await auth();
  if (session?.user?.role !== "HEAD") {
    return { success: false, error: "无权操作" };
  }

  const result = UpdateRegulationSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: "数据格式错误" };
  }

  try {
    await prisma.regulation.update({
      where: { id: result.data.id },
      data: {
        title: result.data.title,
        content: result.data.content as any,
        isActive: result.data.isActive,
      },
    });

    revalidatePath("/dashboard/settings/rules");
    return { success: true };
  } catch (error) {
    console.error("Failed to update regulation:", error);
    return { success: false, error: "更新失败" };
  }
}

/**
 * Delete a regulation
 */
export async function deleteRegulation(id: string) {
  const session = await auth();
  if (session?.user?.role !== "HEAD") {
    return { success: false, error: "无权操作" };
  }

  try {
    await prisma.regulation.delete({
      where: { id },
    });

    revalidatePath("/dashboard/settings/rules");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete regulation:", error);
    return { success: false, error: "删除失败" };
  }
}

/**
 * Reorder regulations
 */
export async function reorderRegulations(
  items: { id: string; order: number }[]
) {
  const session = await auth();
  if (session?.user?.role !== "HEAD") {
    return { success: false, error: "无权操作" };
  }

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.regulation.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath("/dashboard/settings/rules");
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder regulations:", error);
    return { success: false, error: "排序更新失败" };
  }
}

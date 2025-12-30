"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  desc: z.string().optional(),
});

export async function getSystemConfig(key: string) {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    return { success: true, data: config?.value };
  } catch (error) {
    console.error(`Failed to get config ${key}:`, error);
    return { success: false, error: "获取配置失败" };
  }
}

export async function getAllSystemConfigs() {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权访问" };
  }

  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });
    return { success: true, data: configs };
  } catch (error) {
    console.error("Failed to get all configs:", error);
    return { success: false, error: "获取配置失败" };
  }
}

export async function updateSystemConfig(
  key: string,
  value: string,
  desc?: string
) {
  const session = await auth();
  // Only HEAD or ADMIN can update system config.
  // Maybe only HEAD? Plan said HEAD.
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权操作" };
  }

  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, desc },
      create: { key, value, desc },
    });

    revalidatePath("/dashboard/settings/general");
    return { success: true };
  } catch (error) {
    console.error(`Failed to update config ${key}:`, error);
    return { success: false, error: "更新配置失败" };
  }
}

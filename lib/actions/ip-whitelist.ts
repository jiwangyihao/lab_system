"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const IpSchema = z.object({
  ipAddress: z.string().ip({ message: "无效的 IP 地址" }),
  desc: z.string().optional(),
});

export async function getIpWhitelists() {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权访问" };
  }

  try {
    const list = await prisma.ipWhitelist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: list };
  } catch (error) {
    console.error("Failed to fetch IP whitelist:", error);
    return { success: false, error: "获取白名单失败" };
  }
}

export async function createIpWhitelist(data: z.infer<typeof IpSchema>) {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权操作" };
  }

  const result = IpSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  try {
    await prisma.ipWhitelist.create({
      data: {
        ipAddress: result.data.ipAddress,
        desc: result.data.desc,
      },
    });

    revalidatePath("/dashboard/settings/network");
    return { success: true };
  } catch (error) {
    console.error("Failed to create IP whitelist:", error);
    return { success: false, error: "创建失败" };
  }
}

export async function deleteIpWhitelist(id: string) {
  const session = await auth();
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return { success: false, error: "无权操作" };
  }

  try {
    await prisma.ipWhitelist.delete({
      where: { id },
    });

    revalidatePath("/dashboard/settings/network");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete IP whitelist:", error);
    return { success: false, error: "删除失败" };
  }
}

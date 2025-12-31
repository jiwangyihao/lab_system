import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

/**
 * Bootstrap the database with initial data if needed.
 * This runs on application startup.
 */
export async function bootstrapDatabase() {
  try {
    // Check if any HEAD user exists
    const headExists = await prisma.user.findFirst({
      where: { role: "HEAD" },
    });

    if (!headExists) {
      console.log(
        "[Bootstrap] No HEAD account found. Initializing default HEAD account..."
      );

      const password = await hash("admin123", 10);

      await prisma.user.create({
        data: {
          username: "admin",
          password,
          name: "系统管理员",
          role: "HEAD",
          email: "admin@lab.edu.cn",
          phone: "13800000000",
          isActive: true,
        },
      });

      console.log("[Bootstrap] Default HEAD account created: admin / admin123");
    } else {
      console.log("[Bootstrap] HEAD account exists. Skipping initialization.");
    }
  } catch (error) {
    console.error("[Bootstrap] Failed to initialize database:", error);
    // Do not crash the app, just log error (e.g. database connection failed)
  }
}

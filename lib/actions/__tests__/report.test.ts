import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    equipment: {
      findMany: vi.fn(),
    },
    reservation: {
      findMany: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
  },
}));

describe("Report Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateReport", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { generateReport } = await import("@/lib/actions/report");
      const result = await generateReport("WEEKLY");

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return error when user is not admin or head", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1", name: "User", role: "STUDENT" },
        expires: "",
      });

      const { generateReport } = await import("@/lib/actions/report");
      const result = await generateReport("WEEKLY");

      expect(result.success).toBe(false);
      expect(result.error).toBe("无权限访问报表");
    });

    it("should generate weekly report for admin", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "ADMIN" },
        expires: "",
      });

      (prisma.equipment.findMany as any).mockResolvedValue([]);
      (prisma.reservation.findMany as any).mockResolvedValue([]);
      (prisma.checkIn.count as any).mockResolvedValue(0);
      (prisma.report.create as any).mockResolvedValue({
        id: "report-1",
        type: "WEEKLY",
        periodStart: new Date(),
        periodEnd: new Date(),
        contentJson: {},
        generatedAt: new Date(),
      });

      const { generateReport } = await import("@/lib/actions/report");
      const result = await generateReport("WEEKLY");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("report-1");
    });
  });

  describe("getReports", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getReports } = await import("@/lib/actions/report");
      const result = await getReports();

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return report list for admin", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "ADMIN" },
        expires: "",
      });

      (prisma.report.findMany as any).mockResolvedValue([
        {
          id: "report-1",
          type: "WEEKLY",
          periodStart: new Date(),
          periodEnd: new Date(),
          generatedAt: new Date(),
        },
      ]);

      const { getReports } = await import("@/lib/actions/report");
      const result = await getReports("WEEKLY");

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
    });
  });

  describe("getReportById", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getReportById } = await import("@/lib/actions/report");
      const result = await getReportById("report-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return error when report not found", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "ADMIN" },
        expires: "",
      });

      (prisma.report.findUnique as any).mockResolvedValue(null);

      const { getReportById } = await import("@/lib/actions/report");
      const result = await getReportById("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("报表不存在");
    });

    it("should return report detail for admin", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "ADMIN" },
        expires: "",
      });

      const mockContent = {
        summary: {
          totalEquipment: 10,
          availableEquipment: 8,
          totalReservations: 20,
          completedReservations: 15,
          cancelledReservations: 2,
          totalUsageHours: 100,
          averageUsageRate: 50,
        },
        equipmentBreakdown: [],
        topUsers: [],
        dailyStats: [],
      };

      (prisma.report.findUnique as any).mockResolvedValue({
        id: "report-1",
        type: "WEEKLY",
        periodStart: new Date(),
        periodEnd: new Date(),
        contentJson: mockContent,
        generatedAt: new Date(),
      });

      const { getReportById } = await import("@/lib/actions/report");
      const result = await getReportById("report-1");

      expect(result.success).toBe(true);
      expect(result.data?.content.summary.totalEquipment).toBe(10);
    });
  });

  describe("deleteReport", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { deleteReport } = await import("@/lib/actions/report");
      const result = await deleteReport("report-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should delete report for head", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "HEAD" },
        expires: "",
      });

      (prisma.report.delete as any).mockResolvedValue({
        id: "report-1",
        type: "WEEKLY",
        periodStart: new Date(),
        periodEnd: new Date(),
        contentJson: {},
        generatedAt: new Date(),
      });

      const { deleteReport } = await import("@/lib/actions/report");
      const result = await deleteReport("report-1");

      expect(result.success).toBe(true);
    });
  });
});

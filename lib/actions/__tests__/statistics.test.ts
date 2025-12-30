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
    equipment: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    reservation: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
  },
}));

describe("Statistics Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getDashboardStats } = await import("@/lib/actions/statistics");
      const result = await getDashboardStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return equipment stats for admin user", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "admin-1", name: "Admin", role: "ADMIN" },
        expires: "",
      });

      (prisma.equipment.groupBy as any).mockResolvedValue([
        { status: "AVAILABLE", _count: 5 },
        { status: "OCCUPIED", _count: 2 },
        { status: "MAINTENANCE", _count: 1 },
      ]);

      (prisma.reservation.groupBy as any).mockResolvedValue([
        { status: "APPROVED", _count: 3 },
        { status: "PENDING_ADMIN", _count: 2 },
      ]);

      (prisma.reservation.count as any).mockResolvedValue(2);
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      const { getDashboardStats } = await import("@/lib/actions/statistics");
      const result = await getDashboardStats();

      expect(result.success).toBe(true);
      expect(result.data?.equipment.total).toBe(8);
      expect(result.data?.equipment.available).toBe(5);
      expect(result.data?.equipment.occupied).toBe(2);
      expect(result.data?.equipment.maintenance).toBe(1);
    });
  });

  describe("getEquipmentUsageStats", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getEquipmentUsageStats } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getEquipmentUsageStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return usage data points for week period", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1", name: "User", role: "STUDENT" },
        expires: "",
      });

      (prisma.equipment.count as any).mockResolvedValue(10);
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      const { getEquipmentUsageStats } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getEquipmentUsageStats("week");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getReservationTrendStats", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getReservationTrendStats } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getReservationTrendStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return trend data for week period", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1", name: "User", role: "STUDENT" },
        expires: "",
      });

      (prisma.equipment.findMany as any).mockResolvedValue([
        { id: "eq-1", name: "设备1" },
      ]);
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      const { getReservationTrendStats } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getReservationTrendStats("week");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getRecentReservations", () => {
    it("should return error when not logged in", async () => {
      (auth as any).mockResolvedValue(null);

      const { getRecentReservations } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getRecentReservations();

      expect(result.success).toBe(false);
      expect(result.error).toBe("未登录");
    });

    it("should return recent reservations for logged in user", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1", name: "User", role: "STUDENT" },
        expires: "",
      });

      (prisma.reservation.findMany as any).mockResolvedValue([
        {
          id: "res-1",
          equipment: { name: "设备1" },
          startTime: new Date(),
          endTime: new Date(),
          status: "APPROVED",
        },
      ]);

      const { getRecentReservations } = await import(
        "@/lib/actions/statistics"
      );
      const result = await getRecentReservations(5);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkIn,
  checkOut,
  autoExpireCheck,
  getIncidents,
} from "../monitoring";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    checkIn: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    incident: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Monitoring Actions", () => {
  const mockUserId = "user-123";
  const mockReservationId = "res-123";
  const mockEquipmentId = "eq-123";

  // Helper to mock session
  const mockSession = (role = "STUDENT") => {
    (auth as any).mockResolvedValue({
      user: { id: mockUserId, role, name: "Test User" },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkIn", () => {
    it("should allow check-in within valid time window", async () => {
      mockSession();
      const now = new Date();
      const startTime = new Date(now.getTime() + 5 * 60 * 1000); // Starts in 5 mins
      const endTime = new Date(now.getTime() + 65 * 60 * 1000);

      (prisma.reservation.findUnique as any).mockResolvedValue({
        id: mockReservationId,
        userId: mockUserId,
        equipmentId: mockEquipmentId,
        status: "APPROVED",
        startTime,
        endTime,
      });

      const result = await checkIn(mockReservationId);

      expect(result).toEqual({ success: true });
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: mockReservationId },
        data: { status: "IN_USE" },
      });
      expect(prisma.checkIn.create).toHaveBeenCalled();
    });

    it("should prevent early check-in", async () => {
      mockSession();
      const now = new Date();
      const startTime = new Date(now.getTime() + 20 * 60 * 1000); // Starts in 20 mins (>15 permitted)
      const endTime = new Date(now.getTime() + 80 * 60 * 1000);

      (prisma.reservation.findUnique as any).mockResolvedValue({
        id: mockReservationId,
        userId: mockUserId,
        equipmentId: mockEquipmentId,
        status: "APPROVED",
        startTime,
        endTime,
      });

      const result = await checkIn(mockReservationId);
      expect(result.error).toContain("未到签到时间");
    });

    it("should prevent check-in for non-owner", async () => {
      mockSession("STUDENT"); // Current user

      (prisma.reservation.findUnique as any).mockResolvedValue({
        id: mockReservationId,
        userId: "other-user", // Different owner
        equipmentId: mockEquipmentId,
        status: "APPROVED",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      });

      const result = await checkIn(mockReservationId);
      expect(result.error).toContain("只能对自己预约的设备进行签到");
    });
  });

  describe("checkOut", () => {
    it("should allow check-out for IN_USE reservation", async () => {
      mockSession();

      (prisma.reservation.findUnique as any).mockResolvedValue({
        id: mockReservationId,
        userId: mockUserId,
        status: "IN_USE",
        equipmentId: mockEquipmentId,
      });

      (prisma.checkIn.findFirst as any).mockResolvedValue({
        id: "checkin-123",
        reservationId: mockReservationId,
      });

      const result = await checkOut(mockReservationId);

      expect(result).toEqual({ success: true });
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: mockReservationId },
        data: { status: "COMPLETED" },
      });
      expect(prisma.checkIn.update).toHaveBeenCalled();
    });
  });

  describe("autoExpireCheck", () => {
    it("should expire overdue reservations", async () => {
      // Mock findMany to return one expired reservation
      (prisma.reservation.findMany as any).mockResolvedValue([
        { id: "res-expired", status: "IN_USE" },
      ]);

      const result = await autoExpireCheck();

      expect(result.count).toBe(1);
      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["res-expired"] } },
        data: { status: "COMPLETED" },
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createScrapRequestAction,
  approveScrapRequestAction,
  rejectScrapRequestAction,
} from "../scrap";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RequestStatus, Role, EquipmentStatus } from "@prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    scrapRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    maintenanceLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const mockHeadUser = { id: "head-1", role: Role.HEAD, username: "head" };
const mockAdminUser = { id: "admin-1", role: Role.ADMIN, username: "admin" };

describe("Scrap Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createScrapRequestAction", () => {
    const input = {
      equipmentId: "equip-1",
      reason: "Broken beyond repair",
    };

    it("should create scrap request successfully", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });
      // Mock equipment exists and not scrapped
      (prisma.equipment.findUnique as any).mockResolvedValue({
        id: "equip-1",
        status: EquipmentStatus.AVAILABLE,
      });
      // Mock no existing pending request
      (prisma.scrapRequest.findFirst as any).mockResolvedValue(null);

      const result = await createScrapRequestAction(input);

      expect(result.success).toBe(true);
      expect(prisma.scrapRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          equipmentId: input.equipmentId,
          applicantId: mockAdminUser.id,
          status: RequestStatus.PENDING,
        }),
      });
    });

    it("should fail if equipment already scrapped", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });
      (prisma.equipment.findUnique as any).mockResolvedValue({
        id: "equip-1",
        status: EquipmentStatus.SCRAPPED,
      });

      const result = await createScrapRequestAction(input);

      expect(result.error).toBe("该设备已报废");
      expect(prisma.scrapRequest.create).not.toHaveBeenCalled();
    });
  });

  describe("approveScrapRequestAction", () => {
    it("should approve request and update equipment status", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });

      // Mock update returns
      (prisma.scrapRequest.update as any).mockResolvedValue({
        id: "req-1",
        equipmentId: "equip-1",
      });

      const result = await approveScrapRequestAction("req-1");

      expect(result.success).toBe(true);
      // Verify transaction called
      expect(prisma.$transaction).toHaveBeenCalled();

      // Since transaction callback is executed immediately in mock:
      // 1. Update request status
      expect(prisma.scrapRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-1" },
          data: { status: RequestStatus.APPROVED },
        })
      );
      // 2. Update equipment status to SCRAPPED
      expect(prisma.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "equip-1" },
          data: { status: EquipmentStatus.SCRAPPED },
        })
      );
      // 3. Create maintenance log
      expect(prisma.maintenanceLog.create).toHaveBeenCalled();
    });
  });

  describe("rejectScrapRequestAction", () => {
    it("should reject request", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });
      // Mock finding the request first
      (prisma.scrapRequest.findUnique as any).mockResolvedValue({
        id: "req-1",
        equipmentId: "equip-1",
      });

      const result = await rejectScrapRequestAction("req-1", "Fixable");

      expect(result.success).toBe(true);
      expect(prisma.scrapRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: expect.objectContaining({ status: RequestStatus.REJECTED }),
      });
    });
  });
});

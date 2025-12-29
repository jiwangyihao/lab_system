import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPurchaseRequestsAction,
  createPurchaseRequestAction,
  approvePurchaseRequestAction,
  rejectPurchaseRequestAction,
} from "../purchase";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RequestStatus, Role } from "@prisma/client";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseRequest: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockHeadUser = { id: "head-1", role: Role.HEAD, username: "head" };
const mockAdminUser = { id: "admin-1", role: Role.ADMIN, username: "admin" };

describe("Purchase Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPurchaseRequestsAction", () => {
    it("should return all requests for HEAD", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });
      (prisma.purchaseRequest.findMany as any).mockResolvedValue([]);

      const result = await getPurchaseRequestsAction();

      expect(result.data).toBeDefined();
      expect(prisma.purchaseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    it("should return own requests for ADMIN", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });
      (prisma.purchaseRequest.findMany as any).mockResolvedValue([]);

      const result = await getPurchaseRequestsAction();

      expect(result.data).toBeDefined();
      expect(prisma.purchaseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { applicantId: mockAdminUser.id } })
      );
    });
  });

  describe("createPurchaseRequestAction", () => {
    const input = {
      name: "Microscope",
      model: "X100",
      quantity: 1,
      budget: 1000,
      reason: "Need for lab",
    };

    it("should create request successfully", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });

      const result = await createPurchaseRequestAction(input);

      expect(result.success).toBe(true);
      expect(prisma.purchaseRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantId: mockAdminUser.id,
          status: RequestStatus.PENDING,
          ...input,
        }),
      });
    });
  });

  describe("approvePurchaseRequestAction", () => {
    it("should approve request if HEAD", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });

      const result = await approvePurchaseRequestAction("req-1");

      expect(result.success).toBe(true);
      expect(prisma.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: { status: RequestStatus.APPROVED },
      });
    });

    it("should fail if not HEAD", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });

      const result = await approvePurchaseRequestAction("req-1");

      expect(result.error).toBe("无权操作");
      expect(prisma.purchaseRequest.update).not.toHaveBeenCalled();
    });
  });

  describe("rejectPurchaseRequestAction", () => {
    it("should reject request with reason", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });

      const result = await rejectPurchaseRequestAction(
        "req-1",
        "Budget too high"
      );

      expect(result.success).toBe(true);
      expect(prisma.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: {
          status: RequestStatus.REJECTED,
          rejectReason: "Budget too high",
        },
      });
    });
  });
});

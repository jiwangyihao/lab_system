import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRegulation, getRegulations } from "../actions/regulation";
import { updateSystemConfig, getSystemConfig } from "../actions/system-config";
import {
  createExperimentPlan,
  getExperimentPlans,
} from "../actions/experiment-plan";
import { createIpWhitelist, getIpWhitelists } from "../actions/ip-whitelist";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { role: "HEAD" } }),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
// We use vi.hoisted to ensure mock is initialized before vi.mock
const prismaMock = vi.hoisted(() => ({
  regulation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  systemConfig: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  experimentPlan: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  ipWhitelist: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("Phase 7: System Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Regulation", () => {
    it("should create a regulation", async () => {
      // Mock findFirst for order
      prismaMock.regulation.findFirst.mockResolvedValue({ order: 1 });
      prismaMock.regulation.create.mockResolvedValue({});

      const result = await createRegulation({
        title: "Test Rule",
        content: [{ id: "1", text: "Rule 1", children: [] }],
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(prismaMock.regulation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Test Rule",
          order: 2,
        }),
      });
    });

    it("should get regulations", async () => {
      prismaMock.regulation.findMany.mockResolvedValue([]);
      await getRegulations();
      expect(prismaMock.regulation.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    });
  });

  describe("System Config", () => {
    it("should update system config", async () => {
      prismaMock.systemConfig.upsert.mockResolvedValue({});
      const result = await updateSystemConfig("TEST_KEY", "TEST_VALUE", "Desc");
      expect(result.success).toBe(true);
      expect(prismaMock.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: "TEST_KEY" },
        update: { value: "TEST_VALUE", desc: "Desc" },
        create: { key: "TEST_KEY", value: "TEST_VALUE", desc: "Desc" },
      });
    });
  });

  describe("Experiment Plan", () => {
    it("should create experiment plan", async () => {
      prismaMock.experimentPlan.create.mockResolvedValue({});
      const result = await createExperimentPlan({
        title: "Exp 1",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-05"),
      });
      expect(result.success).toBe(true);
      expect(prismaMock.experimentPlan.create).toHaveBeenCalled();
    });
  });

  describe("IP Whitelist", () => {
    it("should create ip whitelist", async () => {
      prismaMock.ipWhitelist.create.mockResolvedValue({});
      const result = await createIpWhitelist({
        ipAddress: "192.168.1.100",
        desc: "Lab PC",
      });
      expect(result.success).toBe(true);
      expect(prismaMock.ipWhitelist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "192.168.1.100",
        }),
      });
    });

    it("should validate ip address", async () => {
      const result = await createIpWhitelist({
        ipAddress: "invalid-ip",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("无效");
      expect(prismaMock.ipWhitelist.create).not.toHaveBeenCalled();
    });
  });
});

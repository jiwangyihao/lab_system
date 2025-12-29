import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ipWhitelist: {
      findMany: vi.fn(),
    },
  },
}));

import { isAllowedIP } from "@/lib/ip-whitelist";
import { prisma } from "@/lib/prisma";

describe("isAllowedIP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("普通用户角色", () => {
    it("应该允许 STUDENT 从任意 IP 访问", async () => {
      const result = await isAllowedIP("192.168.1.100", "STUDENT");
      expect(result).toBe(true);
    });

    it("应该允许 TEACHER 从任意 IP 访问", async () => {
      const result = await isAllowedIP("10.0.0.1", "TEACHER");
      expect(result).toBe(true);
    });

    it("应该允许 OUTSIDER 从任意 IP 访问", async () => {
      const result = await isAllowedIP("8.8.8.8", "OUTSIDER");
      expect(result).toBe(true);
    });
  });

  describe("管理角色", () => {
    it("应该允许 ADMIN 从 localhost (IPv4) 访问", async () => {
      const result = await isAllowedIP("127.0.0.1", "ADMIN");
      expect(result).toBe(true);
    });

    it("应该允许 HEAD 从 localhost (IPv6) 访问", async () => {
      const result = await isAllowedIP("::1", "HEAD");
      expect(result).toBe(true);
    });

    it("应该检查白名单并允许匹配的 IP", async () => {
      vi.mocked(prisma.ipWhitelist.findMany).mockResolvedValue([
        {
          id: "1",
          ipAddress: "192.168.1.",
          desc: "内网",
          createdAt: new Date(),
        },
      ]);

      const result = await isAllowedIP("192.168.1.100", "ADMIN");
      expect(result).toBe(true);
      expect(prisma.ipWhitelist.findMany).toHaveBeenCalled();
    });

    it("应该拒绝不在白名单中的 IP", async () => {
      vi.mocked(prisma.ipWhitelist.findMany).mockResolvedValue([
        {
          id: "1",
          ipAddress: "192.168.1.",
          desc: "内网",
          createdAt: new Date(),
        },
      ]);

      const result = await isAllowedIP("10.0.0.1", "ADMIN");
      expect(result).toBe(false);
    });

    it("应该支持精确 IP 匹配", async () => {
      vi.mocked(prisma.ipWhitelist.findMany).mockResolvedValue([
        {
          id: "1",
          ipAddress: "203.0.113.50",
          desc: "VPN 出口",
          createdAt: new Date(),
        },
      ]);

      const result = await isAllowedIP("203.0.113.50", "HEAD");
      expect(result).toBe(true);
    });
  });
});

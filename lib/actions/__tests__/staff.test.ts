import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStaffsAction,
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
  toggleStaffStatusAction,
} from "../staff";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

const mockHeadUser = {
  id: "head-1",
  role: Role.HEAD,
  username: "head",
};

const mockAdminUser = {
  id: "admin-1",
  role: Role.ADMIN,
  username: "admin",
};

describe("Staff Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStaffsAction", () => {
    it("should return staff list for HEAD", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });
      const mockStaffs = [{ id: "1", username: "staff1", role: Role.ADMIN }];
      (prisma.user.findMany as any).mockResolvedValue(mockStaffs);

      const result = await getStaffsAction();

      expect(result.data).toEqual(mockStaffs);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it("should deny access for non-HEAD users", async () => {
      (auth as any).mockResolvedValue({ user: mockAdminUser });

      const result = await getStaffsAction();

      expect(result.error).toBe("无权访问");
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("createStaffAction", () => {
    const input = {
      username: "newadmin",
      name: "New Admin",
      password: "password123",
      role: Role.ADMIN,
      phone: "12345678901",
      email: "test@example.com",
    };

    it("should create staff successfully", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });
      (prisma.user.findUnique as any).mockResolvedValue(null); // No existing user

      const result = await createStaffAction(input);

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: input.username,
          role: input.role,
        }),
      });
    });

    it("should fail if username exists", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });
      (prisma.user.findUnique as any).mockResolvedValue({ id: "existing" });

      const result = await createStaffAction(input);

      expect(result.error).toBe("用户名已存在");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("updateStaffAction", () => {
    const input = {
      id: "staff-1",
      name: "Updated Name",
      role: Role.TEACHER,
      isActive: false,
    };

    it("should update staff successfully", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });

      const result = await updateStaffAction(input);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: expect.objectContaining({
          name: input.name,
          role: input.role,
          isActive: input.isActive,
        }),
      });
    });
  });

  describe("deleteStaffAction", () => {
    it("should delete staff", async () => {
      (auth as any).mockResolvedValue({ user: mockHeadUser });

      const result = await deleteStaffAction("staff-1");

      expect(result.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "staff-1" },
      });
    });
  });
});

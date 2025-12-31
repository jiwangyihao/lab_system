import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerAction,
  updateProfileAction,
  changePasswordAction,
} from "../auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
    student: { create: vi.fn(), findUnique: vi.fn() },
    teacher: { create: vi.fn(), findUnique: vi.fn() },
    outsider: { create: vi.fn() },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

describe("Auth Actions", () => {
  describe("registerAction", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should register a student successfully", async () => {
      const formData = {
        role: "STUDENT",
        username: "newstudent",
        name: "New Student",
        password: "password123",
        confirmPassword: "password123",
        studentNo: "2023999",
        major: "CS",
        className: "Class A",
        tutorId: "teacher-1",
      };

      // Mock unique checks
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.student.findUnique as any).mockResolvedValue(null);

      // Mock transaction return value
      const mockUser = { id: "user-123", username: "newstudent" };
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const result = await registerAction(formData as any);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe("user-123");
      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
      // Verify user creation
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should fail if username already exists", async () => {
      const formData = {
        role: "STUDENT",
        username: "existinguser",
        name: "Existing User",
        password: "password123",
        confirmPassword: "password123",
        studentNo: "2023888",
        major: "CS",
        className: "Class B",
      };

      // Mock user found
      (prisma.user.findUnique as any).mockResolvedValue({ id: "existing-id" });

      const result = await registerAction(formData as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe("用户名已被占用");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("updateProfileAction", () => {
    it("should update profile successfully", async () => {
      const formData = {
        name: "Updated Name",
        phone: "13800138000",
        email: "test@example.com",
      };

      // Mock auth session
      (auth as any).mockResolvedValue({
        user: { id: "user-123" },
      });

      const result = await updateProfileAction(formData);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          name: "Updated Name",
        }),
      });
    });

    it("should fail if not authenticated", async () => {
      (auth as any).mockResolvedValue(null);
      const result = await updateProfileAction({ name: "Test User" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });

  describe("changePasswordAction", () => {
    it("should change password successfully", async () => {
      const formData = {
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmNewPassword: "newpassword",
      };

      // Mock auth session
      (auth as any).mockResolvedValue({
        user: { id: "user-123" },
      });

      // Mock user found with correct password
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        password: "hashed_old_password",
      });

      // Mock bcrypt compare
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await changePasswordAction(formData);

      expect(result.success).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 10);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("should fail if current password is wrong", async () => {
      const formData = {
        currentPassword: "wrongpassword",
        newPassword: "newpassword",
        confirmNewPassword: "newpassword",
      };

      (auth as any).mockResolvedValue({
        user: { id: "user-123" },
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        password: "hashed_old_password",
      });

      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await changePasswordAction(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("当前密码错误");
    });
  });
});

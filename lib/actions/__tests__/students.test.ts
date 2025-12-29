import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyStudentsAction, removeStudentAction } from "../students";
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
    teacher: { findUnique: vi.fn() },
    student: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Student Actions", () => {
  describe("getMyStudentsAction", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return students for authenticated teacher", async () => {
      // Mock auth
      (auth as any).mockResolvedValue({
        user: { id: "teacher-1" },
      });

      // Mock teacher check
      (prisma.teacher.findUnique as any).mockResolvedValue({
        userId: "teacher-1",
      });

      // Mock students fetch
      const mockStudents = [
        {
          userId: "s1",
          studentNo: "2023001",
          major: "CS",
          className: "Class 1",
          user: { name: "Student 1", phone: "123", email: "s1@test.com" },
        },
      ];
      (prisma.student.findMany as any).mockResolvedValue(mockStudents);

      const result = await getMyStudentsAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].studentNo).toBe("2023001");
    });

    it("should fail for student user", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "student-1" },
      });
      (prisma.teacher.findUnique as any).mockResolvedValue(null);

      const result = await getMyStudentsAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe("仅教师可以访问此功能");
    });
  });

  describe("removeStudentAction", () => {
    it("should remove student association", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "teacher-1" },
      });
      (prisma.teacher.findUnique as any).mockResolvedValue({
        userId: "teacher-1",
      });

      // Mock student check (student belongs to teacher)
      (prisma.student.findFirst as any).mockResolvedValue({
        userId: "s1",
        tutorId: "teacher-1",
      });

      const result = await removeStudentAction("s1");

      expect(result.success).toBe(true);
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { userId: "s1" },
        data: { tutorId: null },
      });
    });
  });
});

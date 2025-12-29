import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "../auth.schema";

describe("Auth Schemas", () => {
  describe("loginSchema", () => {
    it("should validate valid login data", () => {
      const validData = {
        username: "testuser",
        password: "password123",
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should fail validation for short username", () => {
      const invalidData = {
        username: "ab",
        password: "password123",
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("至少");
      }
    });

    it("should fail validation for short password", () => {
      const invalidData = {
        username: "testuser",
        password: "123",
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("should validate valid student registration data", () => {
      const validStudent = {
        role: "STUDENT",
        username: "student1",
        name: "Test Student",
        password: "password123",
        confirmPassword: "password123",
        studentNo: "2023001",
        major: "CS",
        className: "Class 1",
        tutorId: "teacher-uuid",
      };
      const result = registerSchema.safeParse(validStudent);
      expect(result.success).toBe(true);
    });

    it("should validate valid teacher registration data", () => {
      const validTeacher = {
        role: "TEACHER",
        username: "teacher1",
        name: "Test Teacher",
        password: "password123",
        confirmPassword: "password123",
        teacherNo: "T0001",
        title: "Professor",
        department: "CS Dept",
      };
      const result = registerSchema.safeParse(validTeacher);
      expect(result.success).toBe(true);
    });

    it("should fail if passwords do not match", () => {
      const mismatchPasswords = {
        role: "STUDENT",
        username: "student1",
        name: "Test Student",
        password: "password123",
        confirmPassword: "password456",
        studentNo: "2023001",
        major: "CS",
        className: "Class 1",
      };
      const result = registerSchema.safeParse(mismatchPasswords);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("两次输入的密码不一致");
      }
    });

    it("should fail if required student fields are missing", () => {
      const invalidStudent = {
        role: "STUDENT",
        username: "student1",
        name: "Test Student",
        password: "password123",
        confirmPassword: "password123",
        // Missing studentNo, major, className
      };
      const result = registerSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });
  });
});

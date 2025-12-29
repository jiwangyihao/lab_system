import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

describe("authConfig", () => {
  describe("pages", () => {
    it("应该配置登录页为 /login", () => {
      expect(authConfig.pages?.signIn).toBe("/login");
    });
  });

  describe("callbacks.authorized", () => {
    const createMockRequest = (pathname: string) => ({
      nextUrl: { pathname },
    });

    it("应该允许已登录用户访问 dashboard", () => {
      const auth = { user: { id: "1", role: "STUDENT" } };
      const request = createMockRequest("/dashboard");

      const result = authConfig.callbacks?.authorized?.({
        auth,
        request,
      } as any);
      expect(result).toBe(true);
    });

    it("应该拒绝未登录用户访问 dashboard", () => {
      const auth = null;
      const request = createMockRequest("/dashboard");

      const result = authConfig.callbacks?.authorized?.({
        auth,
        request,
      } as any);
      expect(result).toBe(false);
    });

    it("应该允许已登录用户访问其他页面", () => {
      const auth = { user: { id: "1", role: "TEACHER" } };
      const request = createMockRequest("/profile");

      const result = authConfig.callbacks?.authorized?.({
        auth,
        request,
      } as any);
      expect(result).toBe(true);
    });

    it("应该允许未登录用户访问非 dashboard 页面", () => {
      const auth = null;
      const request = createMockRequest("/about");

      const result = authConfig.callbacks?.authorized?.({
        auth,
        request,
      } as any);
      expect(result).toBe(true);
    });
  });

  describe("callbacks.jwt", () => {
    it("应该在用户登录时将 role 和 id 添加到 token", async () => {
      const token = {};
      const user = { id: "user-123", role: "ADMIN" };

      const result = await authConfig.callbacks?.jwt?.({
        token,
        user,
        trigger: "signIn",
        session: null,
        account: null,
      } as any);

      expect(result).toEqual({ role: "ADMIN", id: "user-123" });
    });

    it("应该在没有新用户时保留原有 token", async () => {
      const token = { role: "STUDENT", id: "existing-id" };

      const result = await authConfig.callbacks?.jwt?.({
        token,
        user: undefined,
        trigger: "update",
        session: null,
        account: null,
      } as any);

      expect(result).toEqual(token);
    });
  });

  describe("callbacks.session", () => {
    it("应该将 token 中的 role 和 id 添加到 session.user", async () => {
      const session = { user: {} };
      const token = { role: "HEAD", id: "token-user-id" };

      const result = await authConfig.callbacks?.session?.({
        session,
        token,
        user: null as any,
        newSession: null,
        trigger: "update",
      } as any);

      expect(result.user.role).toBe("HEAD");
      expect(result.user.id).toBe("token-user-id");
    });
  });
});

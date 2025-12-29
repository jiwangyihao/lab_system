import { Role } from "@prisma/client";
import { z } from "zod";

export const createStaffSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  name: z.string().min(2, "姓名至少2个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  role: z.enum([Role.ADMIN, Role.TEACHER, Role.HEAD], {
    errorMap: () => ({ message: "请选择有效的角色" }),
  }),
  phone: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "姓名至少2个字符"),
  role: z.enum([
    Role.ADMIN,
    Role.TEACHER,
    Role.HEAD,
    Role.STUDENT,
    Role.OUTSIDER,
  ]),
  phone: z.string().optional(),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

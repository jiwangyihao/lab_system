import * as z from "zod";

// ========== 通用字段 ==========

export const usernameSchema = z
  .string()
  .min(3, "用户名至少 3 个字符")
  .max(20, "用户名最多 20 个字符")
  .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线");

export const passwordSchema = z
  .string()
  .min(6, "密码至少 6 个字符")
  .max(50, "密码最多 50 个字符");

export const nameSchema = z
  .string()
  .min(2, "姓名至少 2 个字符")
  .max(20, "姓名最多 20 个字符");

export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, "请输入有效的手机号")
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .string()
  .email("请输入有效的邮箱地址")
  .optional()
  .or(z.literal(""));

// ========== 登录 Schema ==========

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ========== 注册基础 Schema ==========

const registerBaseSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

// ========== 学生注册 Schema ==========

export const studentRegisterSchema = registerBaseSchema.extend({
  role: z.literal("STUDENT"),
  studentNo: z
    .string()
    .min(5, "学号至少 5 个字符")
    .max(20, "学号最多 20 个字符"),
  major: z.string().min(2, "专业名称至少 2 个字符"),
  className: z.string().min(2, "班级名称至少 2 个字符"),
  tutorId: z.string().optional(),
});

// ========== 教师注册 Schema ==========

export const teacherRegisterSchema = registerBaseSchema.extend({
  role: z.literal("TEACHER"),
  teacherNo: z
    .string()
    .min(5, "工号至少 5 个字符")
    .max(20, "工号最多 20 个字符"),
  title: z.string().min(2, "职称至少 2 个字符"),
  department: z.string().min(2, "院系名称至少 2 个字符"),
});

// ========== 校外人员注册 Schema ==========

export const outsiderRegisterSchema = registerBaseSchema.extend({
  role: z.literal("OUTSIDER"),
  idCard: z
    .string()
    .length(18, "身份证号必须为 18 位")
    .regex(/^\d{17}[\dXx]$/, "请输入有效的身份证号"),
  company: z.string().min(2, "单位名称至少 2 个字符"),
});

// ========== 统一注册 Schema (Discriminated Union) ==========

export const registerSchema = z
  .discriminatedUnion("role", [
    studentRegisterSchema,
    teacherRegisterSchema,
    outsiderRegisterSchema,
  ])
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
export type StudentRegisterData = z.infer<typeof studentRegisterSchema>;
export type TeacherRegisterData = z.infer<typeof teacherRegisterSchema>;
export type OutsiderRegisterData = z.infer<typeof outsiderRegisterSchema>;

// ========== 个人资料更新 Schema ==========

export const updateProfileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// ========== 修改密码 Schema ==========

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

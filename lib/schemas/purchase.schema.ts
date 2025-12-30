import { z } from "zod";

export const createPurchaseSchema = z.object({
  name: z.string().min(2, "设备名称至少2个字符"),
  model: z.string().min(1, "请输入规格型号"),
  quantity: z.number().int().min(1, "数量至少为1"),
  budget: z.number().min(0, "预算不能为负数"),
  reason: z.string().min(5, "申请理由至少5个字符"),
  targetAdminId: z.string().optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const approvePurchaseSchema = z.object({
  id: z.string(),
});

export const rejectPurchaseSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, "请输入驳回原因"),
});

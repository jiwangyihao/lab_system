import { z } from "zod";

export const createScrapSchema = z.object({
  equipmentId: z.string(),
  reason: z.string().min(5, "报废原因至少5个字符"),
});

export type CreateScrapInput = z.infer<typeof createScrapSchema>;

export const approveScrapSchema = z.object({
  id: z.string(),
});

export const rejectScrapSchema = z.object({
  id: z.string(),
  reason: z.string().min(1, "请输入驳回原因"),
});

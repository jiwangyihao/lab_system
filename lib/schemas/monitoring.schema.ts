import { z } from "zod";

export const incidentSchema = z.object({
  equipmentId: z.string().optional(),
  title: z.string().min(1, "标题不能为空"),
  description: z.string().min(1, "描述不能为空"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"], {
    message: "请选择严重程度",
  }),
});

export type IncidentFormValues = z.infer<typeof incidentSchema>;

export const checkInSchema = z.object({
  reservationId: z.string().min(1, "预约ID不能为空"),
});

export const checkOutSchema = z.object({
  reservationId: z.string().min(1, "预约ID不能为空"),
});

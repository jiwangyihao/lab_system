import * as z from "zod";

// ========== 设备状态枚举 ==========

export const EquipmentStatusEnum = z.enum([
  "AVAILABLE", // 空闲
  "OCCUPIED", // 占用
  "MAINTENANCE", // 维修中
  "SCRAP_REQUESTED", // 报废申请中
  "SCRAPPED", // 已报废
]);

export type EquipmentStatus = z.infer<typeof EquipmentStatusEnum>;

// ========== 创建设备 Schema ==========

export const createEquipmentSchema = z.object({
  name: z
    .string()
    .min(2, "设备名称至少 2 个字符")
    .max(100, "设备名称最多 100 个字符"),
  model: z
    .string()
    .min(1, "设备型号不能为空")
    .max(50, "设备型号最多 50 个字符"),
  manufacturer: z
    .string()
    .min(2, "制造商名称至少 2 个字符")
    .max(100, "制造商名称最多 100 个字符"),
  purchaseDate: z.coerce.date({
    required_error: "请选择购买日期",
    invalid_type_error: "日期格式无效",
  }),
  status: EquipmentStatusEnum.default("AVAILABLE"),
  rentalPrice: z.number().min(0, "租用价格不能为负数").default(0),
  maintenanceCycle: z
    .number()
    .min(1, "检修周期至少 1 天")
    .nullable()
    .optional(),
  adminId: z.string().cuid("无效的管理员 ID").nullable().optional(),
});

export type CreateEquipmentData = z.infer<typeof createEquipmentSchema>;

// ========== 更新设备 Schema ==========

export const updateEquipmentSchema = createEquipmentSchema.partial().extend({
  id: z.string().cuid("无效的设备 ID"),
});

export type UpdateEquipmentData = z.infer<typeof updateEquipmentSchema>;

// ========== 设备筛选 Schema ==========

export const equipmentFilterSchema = z.object({
  search: z.string().optional(),
  status: EquipmentStatusEnum.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["name", "purchaseDate", "status", "rentalPrice"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  adminId: z.string().optional(),
});

export type EquipmentFilterData = z.infer<typeof equipmentFilterSchema>;

// ========== 状态变更 Schema ==========

export const changeStatusSchema = z.object({
  id: z.string().cuid("无效的设备 ID"),
  newStatus: EquipmentStatusEnum,
  reason: z.string().optional(),
});

export type ChangeStatusData = z.infer<typeof changeStatusSchema>;

// ========== 时段 Schema ==========

export const timeSlotSchema = z
  .object({
    equipmentId: z.string().cuid("无效的设备 ID"),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(), // 0=周日, 1=周一...6=周六
    specificDate: z.coerce.date().nullable().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式应为 HH:MM"),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式应为 HH:MM"),
    isAvailable: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // 确保 dayOfWeek 和 specificDate 不能同时为空或同时有值
      const hasDayOfWeek =
        data.dayOfWeek !== null && data.dayOfWeek !== undefined;
      const hasSpecificDate =
        data.specificDate !== null && data.specificDate !== undefined;
      return hasDayOfWeek !== hasSpecificDate;
    },
    { message: "必须指定周几或特定日期（二选一）" }
  )
  .refine(
    (data) => {
      // 确保开始时间小于结束时间
      return data.startTime < data.endTime;
    },
    { message: "开始时间必须早于结束时间", path: ["endTime"] }
  );

export type TimeSlotData = z.infer<typeof timeSlotSchema>;

// ========== 更新时段 Schema ==========

export const updateTimeSlotSchema = z.object({
  id: z.string().cuid("无效的时段 ID"),
  equipmentId: z.string().cuid("无效的设备 ID"),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  specificDate: z.coerce.date().nullable().optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式应为 HH:MM"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "时间格式应为 HH:MM"),
  isAvailable: z.boolean().default(true),
});

export type UpdateTimeSlotData = z.infer<typeof updateTimeSlotSchema>;

// ========== 维护日志 Schema ==========

export const maintenanceLogSchema = z.object({
  equipmentId: z.string().cuid("无效的设备 ID"),
  content: z
    .string()
    .min(5, "维护内容至少 5 个字符")
    .max(1000, "维护内容最多 1000 个字符"),
  operator: z
    .string()
    .min(2, "操作人姓名至少 2 个字符")
    .max(20, "操作人姓名最多 20 个字符"),
});

export type MaintenanceLogData = z.infer<typeof maintenanceLogSchema>;

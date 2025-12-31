/**
 * 共享枚举定义
 *
 * 此文件复制自 Prisma schema 中的枚举定义，用于在客户端组件中使用。
 * 客户端组件不能直接导入 @prisma/client，因为它包含服务端专用代码。
 *
 * 注意：如果 Prisma schema 中的枚举发生变化，需要同步更新此文件。
 */

// 用户角色
export const Role = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  OUTSIDER: "OUTSIDER",
  ADMIN: "ADMIN",
  HEAD: "HEAD",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// 设备状态
export const EquipmentStatus = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  MAINTENANCE: "MAINTENANCE",
  SCRAP_REQUESTED: "SCRAP_REQUESTED",
  SCRAPPED: "SCRAPPED",
} as const;

export type EquipmentStatus =
  (typeof EquipmentStatus)[keyof typeof EquipmentStatus];

// 预约状态
export const ReservationStatus = {
  PENDING_TEACHER: "PENDING_TEACHER",
  PENDING_ADMIN: "PENDING_ADMIN",
  PENDING_HEAD: "PENDING_HEAD",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  IN_USE: "IN_USE",
  COMPLETED: "COMPLETED",
} as const;

export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

// 申请状态 (采购/报废)
export const RequestStatus = {
  PENDING: "PENDING",
  PENDING_HEAD: "PENDING_HEAD",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

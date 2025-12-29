import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMaintenanceLogsAction,
  createMaintenanceLogAction,
  deleteMaintenanceLogAction,
} from "../maintenance";
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
    user: {
      findUnique: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
    },
    maintenanceLog: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// ========== 测试数据 ==========

const VALID_USER_ID = "clz0001testuser00001";
const VALID_STUDENT_ID = "clz0002teststudent01";
const VALID_EQUIPMENT_ID = "clz0001testequip0001";
const VALID_LOG_ID = "clz0001testmaintlog1";
const VALID_LOG_ID_2 = "clz0002testmaintlog2";

const mockSession = {
  user: { id: VALID_USER_ID },
};

const mockAdminUser = {
  id: VALID_USER_ID,
  role: "ADMIN",
  name: "Admin User",
};

const mockStudentUser = {
  id: VALID_STUDENT_ID,
  role: "STUDENT",
  name: "Student User",
};

const mockEquipment = {
  id: VALID_EQUIPMENT_ID,
  name: "测试设备",
};

const mockMaintenanceLog = {
  id: VALID_LOG_ID,
  equipmentId: VALID_EQUIPMENT_ID,
  content: "常规维护检查操作记录",
  logDate: new Date("2024-06-01"),
  operator: "Admin User",
};

const mockLogList = [
  mockMaintenanceLog,
  {
    id: VALID_LOG_ID_2,
    equipmentId: VALID_EQUIPMENT_ID,
    content: "更换零件操作记录",
    logDate: new Date("2024-05-15"),
    operator: "Teacher User",
  },
];

// ========== 测试用例 ==========

describe("Maintenance Log Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 获取维护日志列表测试 ==========

  describe("getMaintenanceLogsAction", () => {
    it("应该成功获取维护日志列表", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.maintenanceLog.findMany as any).mockResolvedValue(mockLogList);
      (prisma.maintenanceLog.count as any).mockResolvedValue(2);

      const result = await getMaintenanceLogsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.total).toBe(2);
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await getMaintenanceLogsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await getMaintenanceLogsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });

    it("应该支持分页参数", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.maintenanceLog.findMany as any).mockResolvedValue([
        mockMaintenanceLog,
      ]);
      (prisma.maintenanceLog.count as any).mockResolvedValue(10);

      const result = await getMaintenanceLogsAction(VALID_EQUIPMENT_ID, {
        page: 2,
        pageSize: 5,
      });

      expect(result.success).toBe(true);
      expect(prisma.maintenanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });
  });

  // ========== 创建维护日志测试 ==========

  describe("createMaintenanceLogAction", () => {
    const validLogData = {
      equipmentId: VALID_EQUIPMENT_ID,
      content: "执行了维护操作记录",
      operator: "Admin User",
    };

    it("登录用户应该可以创建日志", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.maintenanceLog.create as any).mockResolvedValue({
        id: "clz0003newmaintlog01",
        ...validLogData,
        logDate: new Date(),
      });

      const result = await createMaintenanceLogAction(validLogData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("clz0003newmaintlog01");
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await createMaintenanceLogAction(validLogData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await createMaintenanceLogAction(validLogData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });

  // ========== 删除维护日志测试 ==========

  describe("deleteMaintenanceLogAction", () => {
    it("管理员应该可以删除日志", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.maintenanceLog.findUnique as any).mockResolvedValue(
        mockMaintenanceLog
      );
      (prisma.maintenanceLog.delete as any).mockResolvedValue(
        mockMaintenanceLog
      );

      const result = await deleteMaintenanceLogAction(VALID_LOG_ID);

      expect(result.success).toBe(true);
      expect(result.message).toBe("日志删除成功");
    });

    it("日志不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.maintenanceLog.findUnique as any).mockResolvedValue(null);

      const result = await deleteMaintenanceLogAction(VALID_LOG_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("日志不存在");
    });

    it("普通用户不应该能删除日志", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await deleteMaintenanceLogAction(VALID_LOG_ID);

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await deleteMaintenanceLogAction(VALID_LOG_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });
});

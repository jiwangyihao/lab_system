import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEquipmentsAction,
  getEquipmentByIdAction,
  createEquipmentAction,
  updateEquipmentAction,
  deleteEquipmentAction,
  changeEquipmentStatusAction,
} from "../equipment";
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
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    maintenanceLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        equipment: {
          update: vi.fn(),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ name: "Test User" }),
        },
        maintenanceLog: {
          create: vi.fn(),
        },
      })
    ),
  },
}));

// ========== 测试数据 ==========
// 使用符合 CUID 格式的 ID

const VALID_USER_ID = "clz0001testuser00001";
const VALID_STUDENT_ID = "clz0002teststudent01";
const VALID_EQUIPMENT_ID = "clz0001testequip0001";
const VALID_EQUIPMENT_ID_2 = "clz0002testequip0002";

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
  model: "Model-A",
  manufacturer: "厂商A",
  purchaseDate: new Date("2024-01-01"),
  status: "AVAILABLE",
  rentalPrice: 100,
  maintenanceCycle: 30,
};

const mockEquipmentList = [
  mockEquipment,
  {
    id: VALID_EQUIPMENT_ID_2,
    name: "测试设备2",
    model: "Model-B",
    manufacturer: "厂商B",
    purchaseDate: new Date("2024-02-01"),
    status: "OCCUPIED",
    rentalPrice: 200,
    maintenanceCycle: null,
  },
];

// ========== 测试用例 ==========

describe("Equipment Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 获取设备列表测试 ==========

  describe("getEquipmentsAction", () => {
    it("应该成功获取设备列表", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findMany as any).mockResolvedValue(mockEquipmentList);
      (prisma.equipment.count as any).mockResolvedValue(2);

      const result = await getEquipmentsAction({});

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.total).toBe(2);
      expect(prisma.equipment.findMany).toHaveBeenCalled();
    });

    it("应该支持搜索筛选", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findMany as any).mockResolvedValue([mockEquipment]);
      (prisma.equipment.count as any).mockResolvedValue(1);

      const result = await getEquipmentsAction({ search: "测试" });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
    });

    it("应该支持状态筛选", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findMany as any).mockResolvedValue([mockEquipment]);
      (prisma.equipment.count as any).mockResolvedValue(1);

      const result = await getEquipmentsAction({ status: "AVAILABLE" });

      expect(result.success).toBe(true);
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await getEquipmentsAction({});

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });

  // ========== 获取设备详情测试 ==========

  describe("getEquipmentByIdAction", () => {
    it("应该成功获取设备详情", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        timeSlots: [],
        maintenanceLogs: [],
        _count: { reservations: 5 },
      });

      const result = await getEquipmentByIdAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(VALID_EQUIPMENT_ID);
      expect(result.data?.name).toBe("测试设备");
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await getEquipmentByIdAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await getEquipmentByIdAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });

  // ========== 创建设备测试 ==========

  describe("createEquipmentAction", () => {
    const validCreateData = {
      name: "新设备名称",
      model: "Model-X",
      manufacturer: "厂商X名称",
      purchaseDate: new Date("2024-06-01"),
      status: "AVAILABLE" as const,
      rentalPrice: 150,
      maintenanceCycle: 60,
    };

    it("管理员应该可以创建设备", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.create as any).mockResolvedValue({
        id: "clz0003newequipment1",
        ...validCreateData,
      });

      const result = await createEquipmentAction(validCreateData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("clz0003newequipment1");
      expect(prisma.equipment.create).toHaveBeenCalled();
    });

    it("非管理员应该无法创建设备", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await createEquipmentAction(validCreateData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
      expect(prisma.equipment.create).not.toHaveBeenCalled();
    });
  });

  // ========== 更新设备测试 ==========

  describe("updateEquipmentAction", () => {
    const validUpdateData = {
      id: VALID_EQUIPMENT_ID,
      name: "更新后的设备名",
      model: "Model-Updated",
    };

    it("管理员应该可以更新设备", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.equipment.update as any).mockResolvedValue({
        ...mockEquipment,
        ...validUpdateData,
      });

      const result = await updateEquipmentAction(validUpdateData);

      expect(result.success).toBe(true);
      expect(prisma.equipment.update).toHaveBeenCalled();
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await updateEquipmentAction(validUpdateData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("非管理员应该无法更新设备", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await updateEquipmentAction(validUpdateData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
    });
  });

  // ========== 删除设备测试 ==========

  describe("deleteEquipmentAction", () => {
    it("管理员应该可以报废设备", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        _count: { reservations: 0 },
      });
      (prisma.equipment.update as any).mockResolvedValue({
        ...mockEquipment,
        status: "SCRAPPED",
      });

      const result = await deleteEquipmentAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(true);
      expect(result.message).toBe("设备已报废");
    });

    it("有进行中预约时不应该允许报废", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        _count: { reservations: 3 },
      });

      const result = await deleteEquipmentAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toContain("有进行中的预约");
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await deleteEquipmentAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });
  });

  // ========== 变更设备状态测试 ==========

  describe("changeEquipmentStatusAction", () => {
    it("应该允许从空闲变为维修中", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        status: "AVAILABLE",
      });

      const result = await changeEquipmentStatusAction({
        id: VALID_EQUIPMENT_ID,
        newStatus: "MAINTENANCE",
      });

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("不应该允许从已报废变为其他状态", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        status: "SCRAPPED",
      });

      const result = await changeEquipmentStatusAction({
        id: VALID_EQUIPMENT_ID,
        newStatus: "AVAILABLE",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("无法将设备");
    });

    it("不应该允许从占用直接变为报废", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue({
        ...mockEquipment,
        status: "OCCUPIED",
      });

      const result = await changeEquipmentStatusAction({
        id: VALID_EQUIPMENT_ID,
        newStatus: "SCRAPPED",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("无法将设备");
    });

    it("非管理员应该无法变更状态", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await changeEquipmentStatusAction({
        id: VALID_EQUIPMENT_ID,
        newStatus: "MAINTENANCE",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
    });
  });
});

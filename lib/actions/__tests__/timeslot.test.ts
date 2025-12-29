import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTimeSlotsAction,
  createTimeSlotAction,
  updateTimeSlotAction,
  deleteTimeSlotAction,
  batchCreateTimeSlotsAction,
} from "../timeslot";
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
    equipmentTimeSlot: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// ========== 测试数据 ==========

const VALID_USER_ID = "clz0001testuser00001";
const VALID_STUDENT_ID = "clz0002teststudent01";
const VALID_EQUIPMENT_ID = "clz0001testequip0001";
const VALID_TIMESLOT_ID = "clz0001testtimeslt01";
const VALID_TIMESLOT_ID_2 = "clz0002testtimeslt02";

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

const mockTimeSlot = {
  id: VALID_TIMESLOT_ID,
  equipmentId: VALID_EQUIPMENT_ID,
  dayOfWeek: 1,
  specificDate: null,
  startTime: "08:00",
  endTime: "12:00",
  isAvailable: true,
};

const mockTimeSlotList = [
  mockTimeSlot,
  {
    id: VALID_TIMESLOT_ID_2,
    equipmentId: VALID_EQUIPMENT_ID,
    dayOfWeek: 2,
    specificDate: null,
    startTime: "14:00",
    endTime: "18:00",
    isAvailable: true,
  },
];

// ========== 测试用例 ==========

describe("TimeSlot Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 获取时段列表测试 ==========

  describe("getTimeSlotsAction", () => {
    it("应该成功获取时段列表", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.equipmentTimeSlot.findMany as any).mockResolvedValue(
        mockTimeSlotList
      );

      const result = await getTimeSlotsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await getTimeSlotsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("未登录时应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await getTimeSlotsAction(VALID_EQUIPMENT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("请先登录");
    });
  });

  // ========== 创建时段测试 ==========

  describe("createTimeSlotAction", () => {
    const validTimeSlotData = {
      equipmentId: VALID_EQUIPMENT_ID,
      dayOfWeek: 3,
      specificDate: null,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    };

    it("管理员应该可以创建时段", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.equipmentTimeSlot.findFirst as any).mockResolvedValue(null);
      (prisma.equipmentTimeSlot.create as any).mockResolvedValue({
        id: "clz0003newtimeslot01",
        ...validTimeSlotData,
      });

      const result = await createTimeSlotAction(validTimeSlotData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("clz0003newtimeslot01");
    });

    it("时段冲突时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.equipmentTimeSlot.findFirst as any).mockResolvedValue(
        mockTimeSlot
      );

      const result = await createTimeSlotAction(validTimeSlotData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("冲突");
    });

    it("非管理员应该无法创建时段", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await createTimeSlotAction(validTimeSlotData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
    });
  });

  // ========== 更新时段测试 ==========

  describe("updateTimeSlotAction", () => {
    const validUpdateData = {
      id: VALID_TIMESLOT_ID,
      equipmentId: VALID_EQUIPMENT_ID,
      dayOfWeek: 1,
      specificDate: null,
      startTime: "10:00",
      endTime: "14:00",
      isAvailable: true,
    };

    it("管理员应该可以更新时段", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipmentTimeSlot.findUnique as any).mockResolvedValue(
        mockTimeSlot
      );
      (prisma.equipmentTimeSlot.findFirst as any).mockResolvedValue(null);
      (prisma.equipmentTimeSlot.update as any).mockResolvedValue({
        ...mockTimeSlot,
        ...validUpdateData,
      });

      const result = await updateTimeSlotAction(validUpdateData);

      expect(result.success).toBe(true);
    });

    it("时段不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipmentTimeSlot.findUnique as any).mockResolvedValue(null);

      const result = await updateTimeSlotAction(validUpdateData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("时段不存在");
    });
  });

  // ========== 删除时段测试 ==========

  describe("deleteTimeSlotAction", () => {
    it("管理员应该可以删除时段", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipmentTimeSlot.findUnique as any).mockResolvedValue(
        mockTimeSlot
      );
      (prisma.equipmentTimeSlot.delete as any).mockResolvedValue(mockTimeSlot);

      const result = await deleteTimeSlotAction(VALID_TIMESLOT_ID);

      expect(result.success).toBe(true);
      expect(result.message).toBe("时段删除成功");
    });

    it("时段不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipmentTimeSlot.findUnique as any).mockResolvedValue(null);

      const result = await deleteTimeSlotAction(VALID_TIMESLOT_ID);

      expect(result.success).toBe(false);
      expect(result.message).toBe("时段不存在");
    });
  });

  // ========== 批量创建时段测试 ==========

  describe("batchCreateTimeSlotsAction", () => {
    const batchData = {
      equipmentId: VALID_EQUIPMENT_ID,
      slots: [
        { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
      ],
    };

    it("管理员应该可以批量创建时段", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.equipmentTimeSlot.deleteMany as any).mockResolvedValue({
        count: 0,
      });
      (prisma.equipmentTimeSlot.createMany as any).mockResolvedValue({
        count: 3,
      });

      const result = await batchCreateTimeSlotsAction(batchData);

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(3);
    });

    it("设备不存在时应该返回错误", async () => {
      (auth as any).mockResolvedValue(mockSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      const result = await batchCreateTimeSlotsAction(batchData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("设备不存在");
    });

    it("非管理员应该无法批量创建时段", async () => {
      (auth as any).mockResolvedValue({ user: { id: VALID_STUDENT_ID } });
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const result = await batchCreateTimeSlotsAction(batchData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("权限不足");
    });
  });
});

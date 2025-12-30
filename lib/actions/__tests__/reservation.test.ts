import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAvailableSlots,
  createReservation,
  cancelReservation,
  approveReservation,
  confirmPayment,
  getPendingReservations,
} from "../reservation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ReservationStatus, Role } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock date-fns to control time
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    // Keep original implementations
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
    },
    reservation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        reservation: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        payment: {
          update: vi.fn(),
        },
      })
    ),
  },
}));

// ========== 测试数据 ==========

const VALID_USER_ID = "clz0001testuser00001";
const VALID_TEACHER_ID = "clz0002testteacher01";
const VALID_ADMIN_ID = "clz0003testadmin0001";
const VALID_HEAD_ID = "clz0004testhead00001";
const VALID_OUTSIDER_ID = "clz0005testoutsider1";
const VALID_EQUIPMENT_ID = "clz0001testequip0001";
const VALID_RESERVATION_ID = "clz0001testreserv001";

const mockStudentSession = {
  user: { id: VALID_USER_ID, role: Role.STUDENT },
};

const mockTeacherSession = {
  user: { id: VALID_TEACHER_ID, role: Role.TEACHER },
};

const mockAdminSession = {
  user: { id: VALID_ADMIN_ID, role: Role.ADMIN },
};

const mockHeadSession = {
  user: { id: VALID_HEAD_ID, role: Role.HEAD },
};

const mockStudentUser = {
  id: VALID_USER_ID,
  role: Role.STUDENT,
  name: "Test Student",
  student: { tutorId: VALID_TEACHER_ID },
};

const mockTeacherUser = {
  id: VALID_TEACHER_ID,
  role: Role.TEACHER,
  name: "Test Teacher",
};

const mockAdminUser = {
  id: VALID_ADMIN_ID,
  role: Role.ADMIN,
  name: "Test Admin",
};

const mockOutsiderUser = {
  id: VALID_OUTSIDER_ID,
  role: Role.OUTSIDER,
  name: "Test Outsider",
};

const mockEquipment = {
  id: VALID_EQUIPMENT_ID,
  name: "测试设备",
  model: "Model-A",
  status: "AVAILABLE",
  rentalPrice: 100,
  timeSlots: [],
};

const mockEquipmentWithSlots = {
  ...mockEquipment,
  timeSlots: [
    {
      id: "slot1",
      dayOfWeek: 1, // Monday
      startTime: "08:00",
      endTime: "12:00",
      isAvailable: true,
      specificDate: null,
    },
    {
      id: "slot2",
      dayOfWeek: 1,
      startTime: "14:00",
      endTime: "18:00",
      isAvailable: true,
      specificDate: null,
    },
  ],
};

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

const mockReservation = {
  id: VALID_RESERVATION_ID,
  userId: VALID_USER_ID,
  equipmentId: VALID_EQUIPMENT_ID,
  startTime: futureDate,
  endTime: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
  status: ReservationStatus.PENDING_TEACHER,
  usageDesc: "测试用途",
  user: mockStudentUser,
  payment: null,
};

// ========== 测试用例 ==========

describe("Reservation Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 获取可用时段测试 ==========

  describe("getAvailableSlots", () => {
    it("应该成功获取设备可用时段", async () => {
      (prisma.equipment.findUnique as any).mockResolvedValue(
        mockEquipmentWithSlots
      );
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      // Use a Monday date
      const monday = new Date("2025-01-06"); // A Monday

      const result = await getAvailableSlots(VALID_EQUIPMENT_ID, monday);

      expect(result.openSlots).toHaveLength(2);
      expect(result.openSlots[0].start).toBe("08:00");
      expect(result.openSlots[0].end).toBe("12:00");
      expect(result.occupiedSlots).toHaveLength(0);
    });

    it("应该正确返回已被预约的时段", async () => {
      const existingReservation = {
        id: "res1",
        startTime: new Date("2025-01-06T09:00:00"),
        endTime: new Date("2025-01-06T11:00:00"),
        status: ReservationStatus.APPROVED,
      };

      (prisma.equipment.findUnique as any).mockResolvedValue(
        mockEquipmentWithSlots
      );
      (prisma.reservation.findMany as any).mockResolvedValue([
        existingReservation,
      ]);

      const result = await getAvailableSlots(
        VALID_EQUIPMENT_ID,
        new Date("2025-01-06")
      );

      expect(result.occupiedSlots).toHaveLength(1);
      expect(result.occupiedSlots[0].start).toBe("09:00");
      expect(result.occupiedSlots[0].end).toBe("11:00");
    });

    it("设备不存在时应该抛出错误", async () => {
      (prisma.equipment.findUnique as any).mockResolvedValue(null);

      await expect(
        getAvailableSlots(VALID_EQUIPMENT_ID, new Date())
      ).rejects.toThrow("设备不存在");
    });

    it("没有时段配置时应该返回全天可用", async () => {
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      const result = await getAvailableSlots(VALID_EQUIPMENT_ID, new Date());

      expect(result.openSlots).toHaveLength(1);
      expect(result.openSlots[0].start).toBe("00:00");
      expect(result.openSlots[0].end).toBe("23:59");
    });
  });

  // ========== 创建预约测试 ==========

  describe("createReservation", () => {
    const validReservationData = {
      equipmentId: VALID_EQUIPMENT_ID,
      date: futureDate,
      startTime: "10:00",
      endTime: "12:00",
      usageDesc: "实验测试",
    };

    it("学生创建预约应该进入待导师审批状态", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const mockTx = {
        reservation: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "new-reservation-id",
            ...validReservationData,
            status: ReservationStatus.PENDING_TEACHER,
          }),
        },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      const result = await createReservation(validReservationData);

      expect(result.success).toBe(true);
      expect(mockTx.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReservationStatus.PENDING_TEACHER,
          }),
        })
      );
    });

    it("教师创建预约应该进入待管理员审批状态", async () => {
      (auth as any).mockResolvedValue(mockTeacherSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockTeacherUser);

      const mockTx = {
        reservation: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "new-reservation-id",
            status: ReservationStatus.PENDING_ADMIN,
          }),
        },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      const result = await createReservation(validReservationData);

      expect(result.success).toBe(true);
      expect(mockTx.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReservationStatus.PENDING_ADMIN,
          }),
        })
      );
    });

    it("时段冲突时应该拒绝创建", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      const mockTx = {
        reservation: {
          findFirst: vi.fn().mockResolvedValue({ id: "conflict-reservation" }),
          create: vi.fn(),
        },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      await expect(createReservation(validReservationData)).rejects.toThrow(
        "该时段已被预约"
      );
    });

    it("未登录时应该抛出错误", async () => {
      (auth as any).mockResolvedValue(null);

      await expect(createReservation(validReservationData)).rejects.toThrow(
        "未登录"
      );
    });

    it("学生未关联导师时应该抛出错误", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockStudentUser,
        student: { tutorId: null },
      });

      await expect(createReservation(validReservationData)).rejects.toThrow(
        "学生未关联导师"
      );
    });

    it("开始时间晚于结束时间应该抛出错误", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);

      const invalidData = {
        ...validReservationData,
        startTime: "14:00",
        endTime: "10:00",
      };

      await expect(createReservation(invalidData)).rejects.toThrow(
        "开始时间必须早于结束时间"
      );
    });
  });

  // ========== 取消预约测试 ==========

  describe("cancelReservation", () => {
    it("用户应该可以取消自己的预约", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours later
      });

      const mockTx = {
        reservation: { update: vi.fn() },
        payment: { update: vi.fn() },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      await cancelReservation(VALID_RESERVATION_ID);

      expect(mockTx.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.CANCELLED },
        })
      );
    });

    it("24小时内取消应该被拒绝（非管理员）", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours later
      });

      await expect(cancelReservation(VALID_RESERVATION_ID)).rejects.toThrow(
        "必须提前24小时以上撤销"
      );
    });

    it("管理员可以在24小时内取消", async () => {
      (auth as any).mockResolvedValue(mockAdminSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        startTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      const mockTx = {
        reservation: { update: vi.fn() },
        payment: { update: vi.fn() },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      await cancelReservation(VALID_RESERVATION_ID);

      expect(mockTx.reservation.update).toHaveBeenCalled();
    });

    it("取消已付款预约应该触发退款", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        payment: { id: "payment1", isRefunded: false },
      });

      const mockTx = {
        reservation: { update: vi.fn() },
        payment: { update: vi.fn() },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      await cancelReservation(VALID_RESERVATION_ID);

      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isRefunded: true },
        })
      );
    });

    it("非所有者/管理员不能取消他人预约", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "other-user", role: Role.STUDENT },
      });
      (prisma.reservation.findUnique as any).mockResolvedValue(mockReservation);

      await expect(cancelReservation(VALID_RESERVATION_ID)).rejects.toThrow(
        "无权操作"
      );
    });
  });

  // ========== 审批预约测试 ==========

  describe("approveReservation", () => {
    it("导师审批学生预约应该流转到待管理员审批", async () => {
      (auth as any).mockResolvedValue(mockTeacherSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_TEACHER,
      });
      (prisma.reservation.update as any).mockResolvedValue({});

      await approveReservation(VALID_RESERVATION_ID, "APPROVE");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.PENDING_ADMIN },
        })
      );
    });

    it("管理员审批内部人员预约应该直接批准", async () => {
      (auth as any).mockResolvedValue(mockAdminSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_ADMIN,
        user: mockStudentUser,
      });
      (prisma.reservation.update as any).mockResolvedValue({});

      await approveReservation(VALID_RESERVATION_ID, "APPROVE");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.APPROVED },
        })
      );
    });

    it("管理员审批外部人员预约应该流转到待负责人审批", async () => {
      (auth as any).mockResolvedValue(mockAdminSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_ADMIN,
        user: mockOutsiderUser,
      });
      (prisma.reservation.update as any).mockResolvedValue({});

      await approveReservation(VALID_RESERVATION_ID, "APPROVE");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.PENDING_HEAD },
        })
      );
    });

    it("负责人审批应该流转到待付款状态", async () => {
      (auth as any).mockResolvedValue(mockHeadSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_HEAD,
        user: mockOutsiderUser,
      });
      (prisma.reservation.update as any).mockResolvedValue({});
      (prisma.equipment.findUnique as any).mockResolvedValue(mockEquipment);
      (prisma.payment.create as any).mockResolvedValue({});

      await approveReservation(VALID_RESERVATION_ID, "APPROVE");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.PENDING_PAYMENT },
        })
      );
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it("驳回预约应该更新状态并记录原因", async () => {
      (auth as any).mockResolvedValue(mockTeacherSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_TEACHER,
      });
      (prisma.reservation.update as any).mockResolvedValue({});

      await approveReservation(VALID_RESERVATION_ID, "REJECT", "时段冲突");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReservationStatus.REJECTED,
            rejectReason: "时段冲突",
          }),
        })
      );
    });

    it("非授权角色不能审批", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_TEACHER,
      });

      await expect(
        approveReservation(VALID_RESERVATION_ID, "APPROVE")
      ).rejects.toThrow("无权操作");
    });

    it("已完成审批的预约不能再次审批", async () => {
      (auth as any).mockResolvedValue(mockAdminSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.APPROVED,
      });

      await expect(
        approveReservation(VALID_RESERVATION_ID, "APPROVE")
      ).rejects.toThrow("当前状态无法审批");
    });
  });

  // ========== 确认支付测试 ==========

  describe("confirmPayment", () => {
    it("应该成功确认支付并批准预约", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_PAYMENT,
        payment: { id: "payment1" },
      });

      const mockTx = {
        payment: { update: vi.fn() },
        reservation: { update: vi.fn() },
      };
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(mockTx));

      await confirmPayment(VALID_RESERVATION_ID);

      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: "ALIPAY_MOCK",
          }),
        })
      );
      expect(mockTx.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReservationStatus.APPROVED },
        })
      );
    });

    it("非待支付状态不能确认支付", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);
      (prisma.reservation.findUnique as any).mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.PENDING_ADMIN,
      });

      await expect(confirmPayment(VALID_RESERVATION_ID)).rejects.toThrow(
        "非待支付状态"
      );
    });
  });

  // ========== 获取待审批列表测试 ==========

  describe("getPendingReservations", () => {
    it("导师应该只看到自己学生的待审批预约", async () => {
      (auth as any).mockResolvedValue(mockTeacherSession);
      (prisma.reservation.findMany as any).mockResolvedValue([mockReservation]);

      const result = await getPendingReservations();

      expect(result.data).toHaveLength(1);
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReservationStatus.PENDING_TEACHER,
          }),
        })
      );
    });

    it("管理员应该看到待管理员审批的预约", async () => {
      (auth as any).mockResolvedValue(mockAdminSession);
      (prisma.reservation.findMany as any).mockResolvedValue([]);

      const result = await getPendingReservations();

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReservationStatus.PENDING_ADMIN,
          }),
        })
      );
    });

    it("学生角色应该返回空列表", async () => {
      (auth as any).mockResolvedValue(mockStudentSession);

      const result = await getPendingReservations();

      expect(result.data).toEqual([]);
    });

    it("未登录应该返回错误", async () => {
      (auth as any).mockResolvedValue(null);

      const result = await getPendingReservations();

      expect(result.error).toBe("未登录");
    });
  });
});

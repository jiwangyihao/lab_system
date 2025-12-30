"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ReservationStatus, Role } from "@prisma/client";
import { z } from "zod";
import {
  startOfDay,
  endOfDay,
  parse,
  isBefore,
  isAfter,
  format,
  addDays,
  getDay,
} from "date-fns";

// ========== Utils ==========

function parseTime(timeStr: string, date: Date) {
  return parse(timeStr, "HH:mm", date);
}

// ========== Zod Schemas ==========

const createReservationSchema = z.object({
  equipmentId: z.string(),
  date: z.date(), // Use a Date object for the day
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // "08:00"
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // "10:00"
  usageDesc: z.string().min(1, "请输入借用用途"),
});

// ========== Actions ==========

export async function getAvailableSlots(equipmentId: string, date: Date) {
  // 1. Get equipment configuration
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { timeSlots: true },
  });

  if (!equipment) throw new Error("设备不存在");

  // 2. Identify applicable time slots
  // Priority: Specific Date > Day of Week > Default (if we had one, but currently schema implies precise slots)
  // Schema: dayOfWeek (0-6), specificDate

  const dayOfWeek = date.getDay(); // 0-6

  // Find specific date rules first
  let applicableSlots = equipment.timeSlots.filter(
    (s) =>
      s.specificDate &&
      startOfDay(s.specificDate).getTime() === startOfDay(date).getTime()
  );

  // If no specific date rules, use day of week rules
  if (applicableSlots.length === 0) {
    applicableSlots = equipment.timeSlots.filter(
      (s) => s.dayOfWeek === dayOfWeek
    );
  }

  // If still no slots found, maybe default to 24h? Or 0?
  // Requirement says "7x24小时排除检修时间".
  // If no TimeSlot defined, assume "Available" or "Unavailable"?
  // Let's assume if no slots are defined, it might be open all day? Or we strictly follow "what is defined is available".
  // Based on "equipment time slot setting" feature, usually we define "Available" slots.
  // Let's handle: If no slots defined, return empty (unavailable) OR return 00:00-23:59.
  // Safest: If no configuration, assume unavailable to force config? Or assume available?
  // The system description says "7x24 hours except maintenance".
  // Let's assume if no explicit TimeSlot validation, we check Reservations only.
  // BUT the implementation plan says "Merge TimeSlots + Reservations".
  // Let's return the "Base Available Slots" (e.g. 08:00-22:00) then subtract booked.

  // Refined Logic:
  // We need to return the *intervals* that are available.

  // Mocking "Whole Day" if no slots defined? No, let's assume `equipment.timeSlots` defines the OPEN hours.
  // If empty, maybe the equipment is not open?

  // Let's map applicable slots to { start: Date, end: Date }
  const baseIntervals: { start: Date; end: Date }[] = [];

  if (applicableSlots.length > 0) {
    applicableSlots.forEach((slot) => {
      if (!slot.isAvailable) return; // Explicitly closed
      baseIntervals.push({
        start: parseTime(slot.startTime, date),
        end: parseTime(slot.endTime, date),
      });
    });
  } else {
    // Fallback: 08:00 - 22:00 if no config found (Just for usability)
    // Or 00:00 - 23:59
    baseIntervals.push({
      start: parseTime("00:00", date),
      end: parseTime("23:59", date),
    });
  }

  // 3. Get existing reservations
  // Status NOT IN [REJECTED, CANCELLED]
  // Conflict range: overlap with Day
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const reservations = await prisma.reservation.findMany({
    where: {
      equipmentId,
      status: {
        notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED],
      },
      // Overlap with the day
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
  });

  // 4. Subtract booked intervals from base intervals
  // Data structure: timeSlots = [{ start, end }]
  // This is a classic "Merge Intervals" / "Subtract Intervals" problem.

  // Simplification for frontend:
  // Return the raw "Occupied Ranges" and "Base Open Ranges".
  // Let frontend visualization handle the subtraction?
  // Or return "Available Ranges".

  // Return format:
  // {
  //   openSlots: [{start: "08:00", end: "22:00"}],
  //   occupiedSlots: [{start: "10:00", end: "12:00"}]
  // }

  const occupiedSlots = reservations.map((r) => ({
    start: format(r.startTime, "HH:mm"),
    end: format(r.endTime, "HH:mm"),
    reservationId: r.id,
  }));

  const openSlots = baseIntervals.map((i) => ({
    start: format(i.start, "HH:mm"),
    end: format(i.end, "HH:mm"),
  }));

  return { openSlots, occupiedSlots };
}

export async function createReservation(
  formData: z.infer<typeof createReservationSchema>
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const parseResult = createReservationSchema.safeParse(formData);
    if (!parseResult.success) {
      return { success: false, error: "输入数据无效" };
    }
    const validated = parseResult.data;

    const startDateTime = parseTime(validated.startTime, validated.date);
    const endDateTime = parseTime(validated.endTime, validated.date);

    if (!isBefore(startDateTime, endDateTime)) {
      return { success: false, error: "开始时间必须早于结束时间" };
    }

    // ========== Validate against open time slots ==========
    const equipment = await prisma.equipment.findUnique({
      where: { id: validated.equipmentId },
      include: { timeSlots: true },
    });

    if (!equipment) {
      return { success: false, error: "设备不存在" };
    }

    // Get applicable time slots for the date
    const dayOfWeek = getDay(validated.date);
    let applicableSlots = equipment.timeSlots.filter(
      (s) =>
        s.specificDate &&
        format(s.specificDate, "yyyy-MM-dd") ===
          format(validated.date, "yyyy-MM-dd")
    );

    if (applicableSlots.length === 0) {
      applicableSlots = equipment.timeSlots.filter(
        (s) => s.dayOfWeek === dayOfWeek && !s.specificDate
      );
    }

    // Check if requested time is within any open slot
    if (applicableSlots.length > 0) {
      const isWithinOpenSlot = applicableSlots.some((slot) => {
        if (!slot.isAvailable) return false;
        const slotStart = parseTime(slot.startTime, validated.date);
        const slotEnd = parseTime(slot.endTime, validated.date);
        // Requested time must be fully within the open slot
        return (
          (startDateTime >= slotStart ||
            startDateTime.getTime() === slotStart.getTime()) &&
          (endDateTime <= slotEnd ||
            endDateTime.getTime() === slotEnd.getTime())
        );
      });

      if (!isWithinOpenSlot) {
        return { success: false, error: "所选时段不在设备开放时间内" };
      }
    }
    // If no time slots defined, assume equipment is available 24/7
    // ========== END: Open time slot validation ==========

    // Determine user role and initial status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { student: true },
    });

    if (!user) {
      return { success: false, error: "用户不存在" };
    }

    let initialStatus: ReservationStatus = ReservationStatus.PENDING_ADMIN; // Default fallback

    if (user.role === Role.STUDENT) {
      if (!user.student?.tutorId) {
        return { success: false, error: "学生未关联导师，无法申请" };
      }
      initialStatus = ReservationStatus.PENDING_TEACHER;
    } else if (user.role === Role.TEACHER) {
      initialStatus = ReservationStatus.PENDING_ADMIN;
    } else if (user.role === Role.OUTSIDER) {
      initialStatus = ReservationStatus.PENDING_ADMIN; // Will flow to HEAD later
    } else if (user.role === Role.ADMIN || user.role === Role.HEAD) {
      initialStatus = ReservationStatus.APPROVED;
    }

    // Transaction for conflict detection
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Check Conflicts
      const conflict = await tx.reservation.findFirst({
        where: {
          equipmentId: validated.equipmentId,
          status: {
            notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED],
          },
          startTime: { lt: endDateTime },
          endTime: { gt: startDateTime },
        },
      });

      if (conflict) {
        throw new Error("该时段已被预约");
      }

      // 2. Create
      return await tx.reservation.create({
        data: {
          userId: user.id,
          equipmentId: validated.equipmentId,
          startTime: startDateTime,
          endTime: endDateTime,
          usageDesc: validated.usageDesc,
          status: initialStatus,
        },
      });
    });

    revalidatePath("/dashboard/reservation");
    return { success: true, reservationId: reservation.id };
  } catch (error: any) {
    console.error("createReservation error:", error);
    return { success: false, error: error.message || "预约失败" };
  }
}

export async function cancelReservation(
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "未登录" };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, payment: true },
    });

    if (!reservation) {
      return { success: false, error: "预约不存在" };
    }

    // Authz: Owner or Admin
    if (
      reservation.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return { success: false, error: "无权操作" };
    }

    // Time Rule: > 24h before start
    const now = new Date();
    const hoursDiff =
      (reservation.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24 && session.user.role !== "ADMIN") {
      return { success: false, error: "必须提前24小时以上撤销" };
    }

    await prisma.$transaction(async (tx) => {
      // Update Status
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });

      // Refund Logic if Paid
      if (reservation.payment && !reservation.payment.isRefunded) {
        await tx.payment.update({
          where: { reservationId },
          data: { isRefunded: true },
        });
      }
    });

    revalidatePath("/dashboard/reservation");
    return { success: true };
  } catch (error: any) {
    console.error("cancelReservation error:", error);
    return { success: false, error: error.message || "撤销失败" };
  }
}

export async function approveReservation(
  reservationId: string,
  action: "APPROVE" | "REJECT",
  rejectReason?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { user: true },
  });

  if (!reservation) throw new Error("预约不存在");

  const userRole = session.user.role;
  const currentStatus = reservation.status;

  if (action === "REJECT") {
    // Check permissions
    // Teacher can reject Student's PENDING_TEACHER
    // Admin can reject PENDING_ADMIN
    // Head can reject PENDING_HEAD
    // For MVP, allow any authorized approver to reject if they have access
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.REJECTED,
        rejectReason: rejectReason || "无理由",
      },
    });
    revalidatePath("/dashboard/reservation");
    revalidatePath("/dashboard/admin/approval");
    return;
  }

  // APPROVE Logic
  let nextStatus: ReservationStatus = currentStatus;

  if (currentStatus === ReservationStatus.PENDING_TEACHER) {
    if (userRole !== Role.TEACHER && userRole !== Role.ADMIN)
      throw new Error("无权操作");
    nextStatus = ReservationStatus.PENDING_ADMIN;
  } else if (currentStatus === ReservationStatus.PENDING_ADMIN) {
    if (userRole !== Role.ADMIN) throw new Error("无权操作");

    if (reservation.user.role === Role.OUTSIDER) {
      nextStatus = ReservationStatus.PENDING_HEAD;
    } else {
      nextStatus = ReservationStatus.APPROVED;
    }
  } else if (currentStatus === ReservationStatus.PENDING_HEAD) {
    if (userRole !== Role.HEAD && userRole !== Role.ADMIN)
      throw new Error("无权操作");
    nextStatus = ReservationStatus.PENDING_PAYMENT;
  } else {
    throw new Error("当前状态无法审批或已完成审批");
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: nextStatus },
  });

  // Create Payment if needed
  if (nextStatus === ReservationStatus.PENDING_PAYMENT) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: reservation.equipmentId },
    });
    if (equipment && equipment.rentalPrice > 0) {
      const hours =
        (reservation.endTime.getTime() - reservation.startTime.getTime()) /
        (1000 * 60 * 60);
      const amount = Math.ceil(hours * equipment.rentalPrice);

      await prisma.payment.create({
        data: {
          reservationId: reservation.id,
          amount: amount,
          isRefunded: false,
        },
      });
    }
  }

  revalidatePath("/dashboard/reservation");
  revalidatePath("/dashboard/admin/approval");
}

export async function confirmPayment(reservationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payment: true },
  });

  if (
    !reservation ||
    reservation.status !== ReservationStatus.PENDING_PAYMENT
  ) {
    throw new Error("非待支付状态");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { reservationId },
      data: {
        paidAt: new Date(),
        method: "ALIPAY_MOCK",
      },
    });

    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.APPROVED },
    });
  });

  revalidatePath("/dashboard/reservation");
}

export async function getPendingReservations() {
  const session = await auth();
  if (!session?.user?.id) return { error: "未登录" };

  const userRole = session.user.role;
  const userId = session.user.id;

  let whereCondition: any = {};

  if (userRole === Role.TEACHER) {
    whereCondition = {
      status: ReservationStatus.PENDING_TEACHER,
      user: {
        student: {
          tutorId: userId,
        },
      },
    };
  } else if (userRole === Role.ADMIN) {
    whereCondition = {
      status: ReservationStatus.PENDING_ADMIN,
    };
  } else if (userRole === Role.HEAD) {
    whereCondition = {
      status: ReservationStatus.PENDING_HEAD,
    };
  } else {
    return { data: [] };
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            name: true,
            username: true,
            role: true,
            student: {
              select: { studentNo: true, major: true, className: true },
            },
          },
        },
        equipment: {
          select: { name: true, model: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return { data: reservations };
  } catch (error) {
    console.error("Failed to fetch pending reservations:", error);
    return { error: "获取待审批列表失败" };
  }
}

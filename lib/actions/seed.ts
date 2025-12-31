"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { faker } from "@faker-js/faker/locale/zh_CN"; // Use Chinese locale
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const hash = async (pwd: string, salt: number) => bcrypt.hash(pwd, salt);

// ========== 权限检查 ==========
async function checkHeadPermission() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  return user?.role === "HEAD";
}

// ========== Seeding Action ==========
export async function seedDatabaseAction(
  shouldClear: boolean = true,
  customSeed: number = 123
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    // 1. 获取预览数据
    const { data: seedData } = await previewSeedDataAction(customSeed);
    if (!seedData) {
      return { success: false, message: "预览数据生成失败" };
    }

    // 2. 清理数据 (保留当前 HEAD 用户)
    if (shouldClear) {
      await prisma.payment.deleteMany();
      await prisma.checkIn.deleteMany();
      await prisma.incident.deleteMany();
      await prisma.experimentPlan.deleteMany();
      await prisma.maintenanceLog.deleteMany();
      await prisma.report.deleteMany();
      await prisma.reservation.deleteMany();
      await prisma.scrapRequest.deleteMany();
      await prisma.purchaseRequest.deleteMany();
      try {
        await prisma.equipmentTimeSlot.deleteMany();
      } catch {}

      await prisma.equipment.deleteMany();
      await prisma.regulation.deleteMany();
      await prisma.systemConfig.deleteMany();
      await prisma.ipWhitelist.deleteMany();

      // 先删除用户关联的 profile 表（外键约束）
      await prisma.teacher.deleteMany({
        where: { userId: { not: currentUserId } },
      });
      await prisma.student.deleteMany();
      await prisma.outsider.deleteMany();

      // 删除除当前用户外的所有用户
      await prisma.user.deleteMany({
        where: {
          id: { not: currentUserId },
        },
      });
    }

    const hashedPassword = await bcrypt.hash("123456", 10);

    // 3. 执行数据插入 (按依赖顺序)

    // 3.1 配置类
    if (seedData.systemConfigs)
      await prisma.systemConfig.createMany({
        data: seedData.systemConfigs,
        skipDuplicates: true,
      });
    if (seedData.ipWhitelists) {
      const ips = seedData.ipWhitelists.map((ip: any) => ({
        id: ip.id,
        ipAddress: ip.ip,
        desc: ip.label,
        createdAt: new Date(),
      }));
      await prisma.ipWhitelist.createMany({ data: ips, skipDuplicates: true });
    }
    if (seedData.regulations) {
      await prisma.regulation.createMany({
        data: seedData.regulations,
        skipDuplicates: true,
      });
    }
    // (Incident moved to bottom)
    if (seedData.experimentPlans) {
      for (const plan of seedData.experimentPlans) {
        const { targetUsers, ...rest } = plan;
        await prisma.experimentPlan.create({
          data: {
            ...rest,
            startDate: new Date(plan.startDate),
            endDate: new Date(plan.endDate),
            targetUsers: JSON.stringify(targetUsers),
          },
        });
      }
    }

    // 3.2 用户
    console.log(`[Seed] Processing ${seedData.users.length} users...`);
    const formattedUsers = [];
    for (const u of seedData.users) {
      const userData: any = {
        id: u.id,
        username: u.username,
        name: u.name,
        password: hashedPassword,
        role: u.role,
        email: u.email,
        phone: u.phone,
      };
      if (u.role === "TEACHER") {
        userData.teacher = {
          create: {
            teacherNo: u.teacherNo,
            title: u.jobTitle,
            department: u.department,
          },
        };
      } else if (u.role === "STUDENT") {
        userData.student = {
          create: {
            studentNo: u.studentNo,
            major: u.major,
            className: u.className,
            tutorId: u.tutorId,
          },
        };
      } else if (u.role === "OUTSIDER") {
        userData.outsider = {
          create: {
            idCard: u.idCard,
            company: u.company,
            balance: u.balance || 0,
          },
        };
      }
      formattedUsers.push(userData);
    }
    const userResult = await prisma.user.createMany({
      data: formattedUsers.map(
        ({ teacher, student, outsider, ...rest }) => rest
      ), // Exclude nested creates for createMany
      skipDuplicates: true,
    });
    console.log(`[Seed] Created ${userResult.count} users.`);

    // [New] Fetch all users to create a mapping of username -> id
    // This handles cases where we "skipped" creation but still need the ID for relationships
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true },
    });
    const userMap = new Map(allUsers.map((u) => [u.username, u.id]));
    console.log(
      `[Seed] Loaded ${userMap.size} users for relationship mapping.`
    );

    // For users with nested creates (teacher/student/outsider profiles), we need to create them individually
    for (const u of formattedUsers) {
      try {
        if (u.teacher) {
          await prisma.teacher.create({
            data: { ...u.teacher.create, userId: u.id },
          });
        }
        if (u.student) {
          await prisma.student.create({
            data: { ...u.student.create, userId: u.id },
          });
        }
        if (u.outsider) {
          await prisma.outsider.create({
            data: { ...u.outsider.create, userId: u.id },
          });
        }
      } catch (error) {
        // Ignore duplicate key errors for existing profiles
        console.log(`Skipping existing profile for user ${u.username}`);
      }
    }

    // 3.3 采购申请
    for (const pr of seedData.purchaseRequests) {
      try {
        const {
          applicantUsername,
          targetAdminUsername,
          applicant,
          targetAdmin,
          ...prData
        } = pr;
        // Resolve IDs from Map
        const applicantId = userMap.get(applicantUsername) || pr.applicantId;
        const targetAdminId =
          userMap.get(targetAdminUsername) || pr.targetAdminId;

        if (!applicantId) {
          console.warn(
            `Skipping PR ${pr.name}: Applicant ${applicantUsername} not found in DB`
          );
          continue;
        }

        await prisma.purchaseRequest.create({
          data: {
            ...prData,
            applicantId,
            targetAdminId,
            status: pr.status as any,
            budget: parseFloat(String(prData.budget)),
            createdAt: new Date(prData.createdAt),
          },
        });
      } catch (e) {
        console.warn(`Skipping PurchaseRequest ${pr.name}:`, e);
      }
    }

    // 3.4 设备
    if (seedData.equipments) {
      for (const eq of seedData.equipments) {
        try {
          const {
            adminUsername,
            admin,
            purchaseRequestName,
            purchaseRequestId,
            ...eqData
          } = eq;

          const adminId = userMap.get(adminUsername);
          if (!adminId) {
            console.warn(
              `Skipping Equipment ${eq.name}: Admin ${adminUsername} not found`
            );
            continue;
          }

          await prisma.equipment.create({
            data: {
              ...eqData,
              purchaseDate: new Date(eqData.purchaseDate),
              adminId,
            },
          });
        } catch (e) {
          console.warn(`Skipping equipment ${eq.name}:`, e);
        }
      }
    }

    // 3.5 预约（批量插入优化）
    console.log(
      `[Seed] Processing ${seedData.reservations.length} reservations...`
    );

    // 预处理预约数据，过滤无效用户
    const validReservations = seedData.reservations
      .map((res) => {
        const { userUsername, user, equipment, equipmentStatus, ...resData } =
          res;
        const userId = userMap.get(userUsername);
        if (!userId) return null;
        return {
          ...resData,
          userId,
          startTime: new Date(resData.startTime),
          endTime: new Date(resData.endTime),
          createdAt: new Date(),
          status: res.status as any,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // 批量插入（每批 500 条）
    const BATCH_SIZE = 500;
    for (let i = 0; i < validReservations.length; i += BATCH_SIZE) {
      const batch = validReservations.slice(i, i + BATCH_SIZE);
      await prisma.reservation.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
    console.log(`[Seed] Created ${validReservations.length} reservations.`);

    // 3.6 签到 (CheckIns) - 批量插入优化
    if (seedData.checkIns && seedData.checkIns.length > 0) {
      console.log(`[Seed] Processing ${seedData.checkIns.length} checkIns...`);
      const validCheckIns = seedData.checkIns
        .map((ci) => {
          const {
            user,
            equipment,
            reservationTime,
            status,
            userUsername,
            ...ciData
          } = ci;
          const userId = userMap.get(userUsername);
          if (!userId) return null;
          return {
            ...ciData,
            userId,
            checkInTime: ciData.checkInTime
              ? new Date(ciData.checkInTime)
              : null,
            checkOutTime: ciData.checkOutTime
              ? new Date(ciData.checkOutTime)
              : null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      // 批量插入
      for (let i = 0; i < validCheckIns.length; i += BATCH_SIZE) {
        const batch = validCheckIns.slice(i, i + BATCH_SIZE);
        await prisma.checkIn.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }
      console.log(`[Seed] Created ${validCheckIns.length} checkIns.`);
    }

    // 3.6 衍生记录
    for (const log of seedData.maintenanceLogs) {
      try {
        const { equipment, ...logData } = log;
        await prisma.maintenanceLog.create({
          data: {
            ...logData,
            logDate: new Date(logData.logDate),
          },
        });
      } catch (e) {
        console.warn(`Skipping maintenance log ${log.id}:`, e);
      }
    }

    for (const sr of seedData.scrapRequests) {
      try {
        const {
          applicantUsername,
          applicant,
          equipment,
          rejectReason,
          ...scrapData
        } = sr;
        const applicantId = userMap.get(applicantUsername);
        if (!applicantId) {
          console.warn(
            `Skipping scrap request: Applicant ${applicantUsername} not found`
          );
          continue;
        }

        await prisma.scrapRequest.create({
          data: {
            ...scrapData,
            applicantId,
            status: sr.status as any,
            createdAt: new Date(scrapData.createdAt),
          },
        });
      } catch (e) {
        console.warn(
          `Skipping scrap request for equipment ${sr.equipmentId}:`,
          e
        );
      }
    }

    // 3.9 事故 (Incidents)
    if (seedData.incidents) {
      for (const inc of seedData.incidents) {
        try {
          const {
            reporterUsername,
            reporter,
            equipment,
            reporterId,
            ...incData
          } = inc;

          const userId = userMap.get(reporterUsername);
          if (!userId) {
            console.warn(
              `Skipping incident: Reporter ${reporterUsername} not found`
            );
            continue;
          }

          await prisma.incident.create({
            data: {
              ...incData,
              userId,
              createdAt: new Date(incData.createdAt),
              status: inc.status as any,
            },
          });
        } catch (e) {
          console.warn(`Skipping incident ${inc.title}:`, e);
        }
      }
    }

    return { success: true, message: `数据库重置成功！即将在3秒后刷新...` };
  } catch (error) {
    console.error("Seeding error:", error);
    return {
      success: false,
      message: "初始化失败: " + (error as Error).message,
    };
  }
}

// ========== Preview Action ==========
export async function previewSeedDataAction(customSeed: number = Date.now()) {
  try {
    const isHead = await checkHeadPermission();
    if (!isHead) {
      return { success: false, error: "无权执行此操作" };
    }

    // Use specific seed for reproducibility between Preview and Execute
    faker.seed(customSeed);
    console.log(`[Preview] Generating data with seed: ${customSeed}`);

    // Generate a short suffix from the seed for unique usernames
    const seedSuffix = String(customSeed).slice(-4);

    // 1. Users (不包含 HEAD)
    const hashedPassword = await hash("password123", 10);
    const departments = ["物理系", "电子系", "计算机系", "材料系", "化学系"];
    const titles = ["讲师", "副教授", "教授", "研究员"];
    const majors = ["物理学", "电子工程", "计算机科学", "材料科学", "应用化学"];

    const admins = [
      {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `admin_${seedSuffix}`,
        role: "ADMIN",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
      },
    ];
    const teachers = [
      {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `teacher_${seedSuffix}`,
        role: "TEACHER",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
        teacherNo: `T${seedSuffix}001`,
        jobTitle: faker.helpers.arrayElement(titles),
        department: faker.helpers.arrayElement(departments),
      },
      {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `teacher2_${seedSuffix}`,
        role: "TEACHER",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
        teacherNo: `T${seedSuffix}002`,
        jobTitle: faker.helpers.arrayElement(titles),
        department: faker.helpers.arrayElement(departments),
      },
    ];
    const students: any[] = [
      {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `student_${seedSuffix}`,
        role: "STUDENT",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
        studentNo: `S${seedSuffix}001`,
        major: faker.helpers.arrayElement(majors),
        className: `${faker.helpers
          .arrayElement(departments)
          .replace("系", "")}240${faker.number.int({ min: 1, max: 3 })}班`,
        tutorId: teachers[0]?.id,
        tutorName: teachers[0]?.name,
      },
    ];
    for (let i = 0; i < 50; i++) {
      const dept = faker.helpers.arrayElement(departments);
      const tutor = faker.helpers.arrayElement(teachers);
      students.push({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `stu${seedSuffix}_${i}`,
        role: "STUDENT",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
        studentNo: `S${seedSuffix}${String(i + 2).padStart(3, "0")}`,
        major: faker.helpers.arrayElement(majors),
        className: `${dept.replace("系", "")}240${faker.number.int({
          min: 1,
          max: 3,
        })}班`,
        tutorId: tutor.id,
        tutorName: tutor.name,
      });
    }

    // 校外人员 (OUTSIDER)
    const companies = [
      "华为技术有限公司",
      "阿里巴巴集团",
      "腾讯科技",
      "中科院计算所",
      "清华大学",
      "北京大学",
      "中国电子科技集团",
    ];
    const outsiders: any[] = [];
    for (let i = 0; i < 15; i++) {
      outsiders.push({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        username: `outsider${seedSuffix}_${i}`,
        role: "OUTSIDER",
        email: faker.internet.email(),
        phone: faker.phone.number({ style: "national" }),
        idCard: `${faker.number.int({ min: 110000, max: 659000 })}${faker.date
          .birthdate({ min: 1970, max: 2000, mode: "year" })
          .toISOString()
          .slice(2, 10)
          .replace(/-/g, "")}${faker.number.int({ min: 1000, max: 9999 })}`,
        company: faker.helpers.arrayElement(companies),
        balance: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
      });
    }

    const users = [...admins, ...teachers, ...students, ...outsiders];

    // 2. 设备类型定义（用于采购和设备）
    const equipmentTypes = [
      "示波器",
      "显微镜",
      "离心机",
      "光谱仪",
      "3D打印机",
      "万用表",
      "恒温箱",
    ];

    // 3. Purchase Requests (先生成采购申请，申请人可以是教师或管理员)
    const purchaseRequests = [];
    const applicants = [...teachers, ...admins]; // 教师和管理员都可以申请
    for (let i = 0; i < 60; i++) {
      const applicant = faker.helpers.arrayElement(applicants);
      const targetAdmin = faker.helpers.arrayElement(admins);
      const model = faker.string.alphanumeric(6).toUpperCase();
      const equipType = faker.helpers.arrayElement(equipmentTypes);
      purchaseRequests.push({
        id: faker.string.uuid(),
        name: "高性能" + equipType,
        model: model,
        applicant: applicant.name,
        applicantId: applicant.id,
        applicantUsername: applicant.username,
        targetAdmin: targetAdmin.name,
        targetAdminId: targetAdmin.id,
        targetAdminUsername: targetAdmin.username,
        quantity: faker.number.int({ min: 1, max: 3 }),
        budget: faker.commerce.price({ min: 10000, max: 100000 }),
        status: faker.helpers.weightedArrayElement([
          { value: "APPROVED", weight: 6 }, // 更多已批准的用于生成设备
          { value: "PENDING", weight: 2 },
          { value: "REJECTED", weight: 2 },
        ]),
        createdAt: faker.date.past({ years: 1 }).toISOString(),
        reason: faker.helpers.arrayElement([
          "教学实验需要",
          "科研项目需求",
          "替换老旧设备",
          "扩充实验室设备",
        ]),
      });
    }

    // 4. Equipment (从已批准的采购申请生成设备)
    const approvedPurchases = purchaseRequests.filter(
      (p) => p.status === "APPROVED"
    );
    const equipments: any[] = [];
    for (const purchase of approvedPurchases) {
      const admin = faker.helpers.arrayElement(admins);
      // 根据采购数量生成对应数量的设备
      for (let q = 0; q < purchase.quantity; q++) {
        equipments.push({
          id: faker.string.uuid(),
          name:
            purchase.name.replace("高性能", "") +
            " " +
            faker.string.alpha(3).toUpperCase(),
          model: purchase.model,
          manufacturer: faker.company.name(),
          purchaseDate: purchase.createdAt,
          status: "AVAILABLE",
          rentalPrice: faker.number.float({
            min: 10,
            max: 200,
            fractionDigits: 2,
          }),
          maintenanceCycle: faker.number.int({ min: 15, max: 90 }),
          // 关系字段 (对应 Schema: adminId -> User)
          admin: admin.name,
          adminId: admin.id,
          adminUsername: admin.username,
          // 采购来源
          purchaseRequestName: purchase.name,
          purchaseRequestId: purchase.id,
        });
      }
    }

    // 5. Maintenance Logs (部分设备正在维修)
    const maintenanceLogs = [];
    // 选取部分设备进行维修
    const maintenanceEquipments = faker.helpers.arrayElements(
      equipments,
      Math.min(10, equipments.length)
    );
    for (const eq of maintenanceEquipments) {
      eq.status = "MAINTENANCE"; // 更新设备状态
      const admin = faker.helpers.arrayElement(admins);
      maintenanceLogs.push({
        id: faker.string.uuid(),
        equipment: eq.name,
        equipmentId: eq.id,
        content: faker.helpers.arrayElement([
          "定期校准",
          "更换保险丝",
          "清洁镜头",
          "固件升级",
          "更换配件",
        ]),
        logDate: faker.date.recent({ days: 7 }).toISOString(),
        operator: admin.name,
      });
    }
    // 过去的维修记录（已完成）
    for (let i = 0; i < 150; i++) {
      const eq = faker.helpers.arrayElement(equipments);
      const admin = faker.helpers.arrayElement(admins);
      maintenanceLogs.push({
        id: faker.string.uuid(),
        equipment: eq.name,
        equipmentId: eq.id,
        content: faker.helpers.arrayElement([
          "定期校准",
          "更换保险丝",
          "清洁镜头",
          "固件升级",
        ]),
        logDate: faker.date.past({ years: 0.5 }).toISOString(),
        operator: admin.name,
      });
    }

    // 6. Scrap Requests (部分设备申请报废)
    const scrapRequests = [];
    // 选取状态为 AVAILABLE 的设备申请报废
    const availableForScrap = equipments.filter(
      (e) => e.status === "AVAILABLE"
    );
    const scrapEquipments = faker.helpers.arrayElements(
      availableForScrap,
      Math.min(3, availableForScrap.length)
    );
    for (const eq of scrapEquipments) {
      const isApproved = faker.datatype.boolean();
      if (isApproved) {
        eq.status = "SCRAPPED";
      } else {
        eq.status = "SCRAP_REQUESTED";
      }
      const admin = faker.helpers.arrayElement(admins);
      scrapRequests.push({
        id: faker.string.uuid(),
        // 关系字段 (对应 Schema: equipmentId -> Equipment, applicantId -> User)
        equipment: eq.name,
        equipmentId: eq.id,
        applicant: admin.name,
        applicantId: admin.id,
        applicantUsername: admin.username,
        reason: faker.helpers.arrayElement([
          "设备老化，性能不达标",
          "多次维修无效",
          "已超出使用年限",
        ]),
        status: isApproved ? "APPROVED" : "PENDING_HEAD",
        rejectReason: null, // Schema field
        createdAt: faker.date.recent({ days: 30 }).toISOString(),
      });
    }

    // 7. Reservations (仅预约可用设备)
    const availableEquipments = equipments.filter(
      (e) => e.status === "AVAILABLE"
    );
    const reservations = [];
    for (let i = 0; i < 5000; i++) {
      if (availableEquipments.length === 0) break;
      const isPast = faker.datatype.boolean();
      const startDate = isPast
        ? faker.date.past({ years: 1 })
        : faker.date.future({ years: 0.1 });
      const eq = faker.helpers.arrayElement(availableEquipments);
      const userList = faker.helpers.weightedArrayElement([
        { weight: 70, value: students },
        { weight: 20, value: teachers },
        { weight: 10, value: outsiders },
      ]);
      const user = faker.helpers.arrayElement(userList);
      // 随机使用时长 3-8 小时
      const durationHours = faker.number.int({ min: 3, max: 8 });

      reservations.push({
        id: faker.string.uuid(),
        user: user.name,
        userId: user.id,
        userUsername: user.username,
        equipment: eq.name,
        equipmentId: eq.id,
        equipmentStatus: eq.status, // 显示预约时设备状态
        startTime: startDate.toISOString(),
        endTime: new Date(
          startDate.getTime() + durationHours * 60 * 60 * 1000
        ).toISOString(),
        status: isPast
          ? faker.helpers.weightedArrayElement([
              { value: "COMPLETED", weight: 7 }, // 更多已完成的预约
              { value: "CANCELLED", weight: 3 },
            ])
          : faker.helpers.arrayElement(["PENDING_TEACHER", "APPROVED"]),
        usageDesc: faker.lorem.sentence(),
      });
    }

    // 7. Regulations (title, content, order, isActive, updatedAt)
    const regulations = [
      {
        title: "实验室安全管理条例",
        order: 1,
        isActive: true,
        content: [
          {
            type: "paragraph",
            children: [{ text: "1. 进入实验室必须穿戴防护装备" }],
          },
          { type: "paragraph", children: [{ text: "2. 禁止带入食物和饮料" }] },
          {
            type: "paragraph",
            children: [{ text: "3. 实验结束后必须清理现场" }],
          },
        ],
      },
      {
        title: "仪器设备借用守则",
        order: 2,
        isActive: true,
        content: [
          {
            type: "paragraph",
            children: [{ text: "1. 借用设备需提前3天预约" }],
          },
          { type: "paragraph", children: [{ text: "2. 归还时需进行验收" }] },
        ],
      },
      {
        title: "实验室卫生值日制度",
        order: 3,
        isActive: true,
        content: [
          { type: "paragraph", children: [{ text: "每日安排值日生打扫卫生" }] },
        ],
      },
      {
        title: "紧急事故处理预案",
        order: 4,
        isActive: true,
        content: [
          {
            type: "paragraph",
            children: [{ text: "1. 发生火灾立即切断电源并报警" }],
          },
          {
            type: "paragraph",
            children: [{ text: "2. 化学品泄漏应穿戴防化服处理" }],
          },
        ],
      },
    ];

    // 8. Experiment Plans
    const experimentPlans = [
      {
        title: "物理实验教学计划-2024春",
        description: "面向物理系大二学生",
        startDate: "2024-03-01",
        endDate: "2024-06-30",
        targetUsers: ["STUDENT"],
      },
      {
        title: "暑期科研实训",
        description: "开放性实验项目",
        startDate: "2024-07-15",
        endDate: "2024-08-20",
        targetUsers: ["STUDENT", "TEACHER"],
      },
    ];

    // 9. Incidents (引用真实学生和设备)
    const incidents = [];
    for (let i = 0; i < 5; i++) {
      const student = faker.helpers.arrayElement(students);
      const eq = faker.helpers.arrayElement(equipments);
      incidents.push({
        id: faker.string.uuid(),
        title: "设备故障报告-" + faker.string.alphanumeric(4).toUpperCase(),
        reporter: student.name,
        reporterId: student.id,
        reporterUsername: student.username,
        equipment: eq.name,
        equipmentId: eq.id,
        description: faker.helpers.arrayElement([
          "使用过程中突发异常响声",
          "设备无法启动",
          "显示屏故障",
          "读数不准确",
        ]),
        severity: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
        status: faker.helpers.arrayElement(["OPEN", "IN_PROGRESS", "RESOLVED"]),
        createdAt: faker.date.recent().toISOString(),
      });
    }

    // 10. CheckIns (所有 COMPLETED 预约必须有签到记录)
    const completedReservations = reservations.filter(
      (r) => r.status === "COMPLETED"
    );
    const approvedReservations = reservations.filter(
      (r) => r.status === "APPROVED"
    );
    const checkIns = [];

    // 为所有已完成的预约生成完整签到记录
    for (const res of completedReservations) {
      const checkInDate = new Date(res.startTime);
      const checkOutDate = new Date(res.endTime);
      checkIns.push({
        id: faker.string.uuid(),
        reservationId: res.id,
        reservationTime: res.startTime,
        user: res.user, // Legacy
        userUsername: res.userUsername, // [Added] For FK resolution
        userId: res.userId,
        equipment: res.equipment,
        equipmentId: res.equipmentId,
        checkInTime: checkInDate.toISOString(),
        checkOutTime: checkOutDate.toISOString(),
        status: "COMPLETED", // Assuming completed checkin does not need status field in model if inferred
        notes: faker.helpers.arrayElement([
          "正常使用",
          "设备状态良好",
          "已完成实验",
        ]),
      });
    }

    // 为部分已批准的预约生成进行中的签到记录
    const inProgressReservations = approvedReservations.slice(0, 3);
    for (const res of inProgressReservations) {
      checkIns.push({
        id: faker.string.uuid(),
        user: res.user,
        userUsername: res.userUsername,
        userId: res.userId,
        equipment: res.equipment,
        equipmentId: res.equipmentId,
        reservationId: res.id,
        reservationTime: `${new Date(
          res.startTime
        ).toLocaleString()} - ${new Date(res.endTime).toLocaleString()}`,
        checkInTime: new Date(res.startTime).toLocaleString(),
        checkOutTime: null,
        status: "使用中",
        notes: "",
      });
    }

    // 12. System Config
    const systemConfigs = [
      {
        id: faker.string.uuid(),
        key: "lab_name",
        value: "先进光电实验室",
        desc: "实验室显示名称",
      },
      {
        id: faker.string.uuid(),
        key: "maintenance_interval",
        value: "30",
        desc: "默认维护周期(天)",
      },
      {
        id: faker.string.uuid(),
        key: "max_reservation_duration",
        value: "4",
        desc: "最大预约时长(小时)",
      },
    ];

    // 13. IP Whitelist
    const ipWhitelists = [
      {
        id: faker.string.uuid(),
        ip: "192.168.1.100",
        label: "管理员电脑",
        active: true,
      },
      {
        id: faker.string.uuid(),
        ip: "10.0.0.1/24",
        label: "实验室局域网",
        active: true,
      },
      {
        id: faker.string.uuid(),
        ip: "127.0.0.1",
        label: "本地测试",
        active: true,
      },
    ];

    const previewData = {
      users,
      equipments,
      reservations,
      maintenanceLogs,
      purchaseRequests,
      scrapRequests,
      regulations,
      experimentPlans,
      incidents,
      checkIns,

      systemConfigs, // New
      ipWhitelists, // New
      note: "保留当前负责人账号，重置其他所有数据。所有生成用户的初始密码均为 123456。",
    };

    return { success: true, data: previewData };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

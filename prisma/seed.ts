import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 数据库种子脚本
 *
 * 用途：初始化系统默认管理员账号
 * 运行方式：pnpm prisma db seed
 *
 * 默认账号：
 * - 实验室负责人（HEAD）: admin / admin123
 * - 设备管理员（ADMIN）: manager / manager123
 */
async function main() {
  console.log("🌱 开始初始化数据库种子数据...\n");

  // ========== 创建实验室负责人 (HEAD) ==========
  const headPassword = await bcrypt.hash("admin123", 12);
  const head = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: headPassword,
      name: "系统管理员",
      phone: "13800000001",
      email: "admin@lab.edu.cn",
      role: "HEAD",
      isActive: true,
    },
  });
  console.log(`✅ 实验室负责人已创建: ${head.username} (${head.name})`);

  // ========== 创建设备管理员 (ADMIN) ==========
  const adminPassword = await bcrypt.hash("manager123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      password: adminPassword,
      name: "设备管理员",
      phone: "13800000002",
      email: "manager@lab.edu.cn",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ 设备管理员已创建: ${admin.username} (${admin.name})`);

  // ========== 创建示例教师 (TEACHER) ==========
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const teacher = await prisma.user.upsert({
    where: { username: "teacher1" },
    update: {},
    create: {
      username: "teacher1",
      password: teacherPassword,
      name: "张教授",
      phone: "13800000003",
      email: "teacher1@lab.edu.cn",
      role: "TEACHER",
      isActive: true,
      teacher: {
        create: {
          teacherNo: "T2024001",
          title: "教授",
          department: "计算机科学与技术学院",
        },
      },
    },
  });
  console.log(`✅ 示例教师已创建: ${teacher.username} (${teacher.name})`);

  // ========== 创建示例学生 (STUDENT) ==========
  const studentPassword = await bcrypt.hash("student123", 12);
  const student = await prisma.user.upsert({
    where: { username: "student1" },
    update: {},
    create: {
      username: "student1",
      password: studentPassword,
      name: "李同学",
      phone: "13800000004",
      email: "student1@lab.edu.cn",
      role: "STUDENT",
      isActive: true,
      student: {
        create: {
          studentNo: "S2024001",
          major: "软件工程",
          className: "软工2401",
          tutorId: teacher.id, // 关联教师
        },
      },
    },
  });
  console.log(`✅ 示例学生已创建: ${student.username} (${student.name})`);

  // ========== 创建示例设备 ==========
  const equipment1 = await prisma.equipment.upsert({
    where: { id: "demo-equipment-001" },
    update: {},
    create: {
      id: "demo-equipment-001",
      name: "高性能计算服务器",
      model: "Dell PowerEdge R750",
      manufacturer: "戴尔科技",
      purchaseDate: new Date("2024-01-15"),
      status: "AVAILABLE",
      rentalPrice: 50.0,
      maintenanceCycle: 90,
    },
  });
  console.log(`✅ 示例设备1已创建: ${equipment1.name}`);

  const equipment2 = await prisma.equipment.upsert({
    where: { id: "demo-equipment-002" },
    update: {},
    create: {
      id: "demo-equipment-002",
      name: "示波器",
      model: "Tektronix DPO4104B",
      manufacturer: "泰克科技",
      purchaseDate: new Date("2023-06-20"),
      status: "AVAILABLE",
      rentalPrice: 30.0,
      maintenanceCycle: 180,
    },
  });
  console.log(`✅ 示例设备2已创建: ${equipment2.name}`);

  const equipment3 = await prisma.equipment.upsert({
    where: { id: "demo-equipment-003" },
    update: {},
    create: {
      id: "demo-equipment-003",
      name: "3D打印机",
      model: "Ultimaker S5",
      manufacturer: "Ultimaker",
      purchaseDate: new Date("2024-03-10"),
      status: "MAINTENANCE",
      rentalPrice: 100.0,
      maintenanceCycle: 30,
    },
  });
  console.log(`✅ 示例设备3已创建: ${equipment3.name}`);

  // ========== 为示例设备创建可用时段 ==========
  // 先删除旧的时段数据，再创建新的
  await prisma.equipmentTimeSlot.deleteMany({
    where: {
      equipmentId: { in: [equipment1.id, equipment2.id] },
    },
  });

  const timeSlots = [
    {
      equipmentId: equipment1.id,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "12:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment1.id,
      dayOfWeek: 1,
      startTime: "14:00",
      endTime: "18:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment1.id,
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "12:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment1.id,
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "18:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment1.id,
      dayOfWeek: 3,
      startTime: "08:00",
      endTime: "12:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment2.id,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment2.id,
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    },
    {
      equipmentId: equipment2.id,
      dayOfWeek: 5,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
    },
  ];

  await prisma.equipmentTimeSlot.createMany({
    data: timeSlots,
  });
  console.log(`✅ 已创建 ${timeSlots.length} 个可用时段`);

  console.log("\n🎉 数据库种子数据初始化完成！");
  console.log("\n========== 默认账号信息 ==========");
  console.log("实验室负责人 (HEAD):  用户名: admin    密码: admin123");
  console.log("设备管理员 (ADMIN):   用户名: manager  密码: manager123");
  console.log("示例教师 (TEACHER):   用户名: teacher1 密码: teacher123");
  console.log("示例学生 (STUDENT):   用户名: student1 密码: student123");
  console.log("===================================\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ 种子数据初始化失败:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

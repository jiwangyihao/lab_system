"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

interface ActionResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

interface StudentInfo {
  studentNo: string;
  name: string;
  major: string;
  className: string;
}

// ========== 获取教师的学生列表 ==========

export async function getMyStudentsAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      studentNo: string;
      name: string;
      major: string;
      className: string;
      phone: string | null;
      email: string | null;
    }>
  >
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 验证是否为教师
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, message: "仅教师可以访问此功能" };
    }

    // 获取该教师的所有学生
    const students = await prisma.student.findMany({
      where: { tutorId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "获取成功",
      data: students.map((s) => ({
        id: s.userId,
        studentNo: s.studentNo,
        name: s.user.name,
        major: s.major,
        className: s.className,
        phone: s.user.phone,
        email: s.user.email,
      })),
    };
  } catch (error) {
    return { success: false, message: "获取学生列表失败" };
  }
}

// ========== 解析 Excel 文件 ==========

export async function parseStudentExcelAction(
  formData: FormData
): Promise<ActionResult<StudentInfo[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 验证是否为教师
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, message: "仅教师可以访问此功能" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, message: "请选择文件" };
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const jsonData =
      XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

    if (jsonData.length === 0) {
      return { success: false, message: "Excel 文件为空" };
    }

    // 解析数据
    const students: StudentInfo[] = [];
    const errors: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Excel 行号（第一行是标题）

      // 支持多种列名格式
      const studentNo = row["学号"] || row["studentNo"] || row["StudentNo"];
      const name = row["姓名"] || row["name"] || row["Name"];
      const major = row["专业"] || row["major"] || row["Major"];
      const className =
        row["班级"] || row["className"] || row["ClassName"] || row["class"];

      if (!studentNo) {
        errors.push(`第 ${rowNum} 行：缺少学号`);
        continue;
      }
      if (!name) {
        errors.push(`第 ${rowNum} 行：缺少姓名`);
        continue;
      }
      if (!major) {
        errors.push(`第 ${rowNum} 行：缺少专业`);
        continue;
      }
      if (!className) {
        errors.push(`第 ${rowNum} 行：缺少班级`);
        continue;
      }

      students.push({
        studentNo: String(studentNo).trim(),
        name: String(name).trim(),
        major: String(major).trim(),
        className: String(className).trim(),
      });
    }

    if (students.length === 0) {
      return {
        success: false,
        message: errors.length > 0 ? errors.join("\n") : "未找到有效数据",
      };
    }

    return {
      success: true,
      message: `成功解析 ${students.length} 条记录${
        errors.length > 0 ? `，${errors.length} 条记录无效` : ""
      }`,
      data: students,
    };
  } catch (error) {
    console.error("Excel 解析错误:", error);
    return { success: false, message: "Excel 文件解析失败" };
  }
}

// ========== 批量导入学生关联 ==========

export async function importStudentsAction(
  students: StudentInfo[]
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 验证是否为教师
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, message: "仅教师可以访问此功能" };
    }

    let imported = 0;
    let skipped = 0;

    for (const student of students) {
      // 查找该学号对应的学生
      const existingStudent = await prisma.student.findUnique({
        where: { studentNo: student.studentNo },
      });

      if (existingStudent) {
        // 更新导师关联
        await prisma.student.update({
          where: { studentNo: student.studentNo },
          data: { tutorId: session.user.id },
        });
        imported++;
      } else {
        // 学生不存在，跳过（需要学生先注册）
        skipped++;
      }
    }

    revalidatePath("/dashboard/users/students");

    return {
      success: true,
      message: `导入完成：${imported} 个学生已关联，${skipped} 个学生未找到（需先注册）`,
      data: { imported, skipped },
    };
  } catch (error) {
    console.error("导入错误:", error);
    return { success: false, message: "导入失败，请稍后重试" };
  }
}

// ========== 移除学生关联 ==========

export async function removeStudentAction(
  studentUserId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "请先登录" };
    }

    // 验证是否为教师
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return { success: false, message: "仅教师可以访问此功能" };
    }

    // 验证该学生是否属于该教师
    const student = await prisma.student.findFirst({
      where: {
        userId: studentUserId,
        tutorId: session.user.id,
      },
    });

    if (!student) {
      return { success: false, message: "学生不存在或不属于您" };
    }

    // 移除关联
    await prisma.student.update({
      where: { userId: studentUserId },
      data: { tutorId: null },
    });

    revalidatePath("/dashboard/users/students");

    return { success: true, message: "已移除学生关联" };
  } catch (error) {
    return { success: false, message: "操作失败，请稍后重试" };
  }
}

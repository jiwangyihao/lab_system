"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  getMyStudentsAction,
  parseStudentExcelAction,
  importStudentsAction,
  removeStudentAction,
} from "@/lib/actions/students";

interface Student {
  id: string;
  studentNo: string;
  name: string;
  major: string;
  className: string;
  phone: string | null;
  email: string | null;
}

interface ParsedStudent {
  studentNo: string;
  name: string;
  major: string;
  className: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 导入相关状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // 加载学生列表
  const loadStudents = async () => {
    setIsLoading(true);
    const result = await getMyStudentsAction();
    if (result.success && result.data) {
      setStudents(result.data);
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseMessage(null);
    setParsedStudents([]);

    const formData = new FormData();
    formData.append("file", file);

    const result = await parseStudentExcelAction(formData);

    if (result.success && result.data) {
      setParsedStudents(result.data);
      setParseMessage(result.message);
    } else {
      setParseMessage(result.message);
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (parsedStudents.length === 0) return;

    setIsImporting(true);
    const result = await importStudentsAction(parsedStudents);

    if (result.success) {
      setMessage({ type: "success", text: result.message });
      setIsImportDialogOpen(false);
      setParsedStudents([]);
      setParseMessage(null);
      loadStudents();
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setIsImporting(false);
  };

  // 移除学生
  const handleRemoveStudent = async () => {
    if (!studentToDelete) return;

    const result = await removeStudentAction(studentToDelete.id);

    if (result.success) {
      setMessage({ type: "success", text: result.message });
      loadStudents();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的学生</h1>
          <p className="text-muted-foreground">管理您指导的学生名单</p>
        </div>
        <Button onClick={() => setIsImportDialogOpen(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          导入学生
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>学生列表</CardTitle>
          <CardDescription>
            共 {students.length} 名学生在您的指导下
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-muted-foreground mb-2">暂无学生</p>
              <p className="text-sm text-muted-foreground">
                点击"导入学生"按钮添加学生
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>专业</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">
                      {student.studentNo}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.major}</TableCell>
                    <TableCell>{student.className}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {student.phone && <div>{student.phone}</div>}
                        {student.email && (
                          <div className="text-muted-foreground">
                            {student.email}
                          </div>
                        )}
                        {!student.phone && !student.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setStudentToDelete(student);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        移除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 导入对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入学生名单</DialogTitle>
            <DialogDescription>
              上传 Excel
              文件批量导入学生。文件需包含以下列：学号、姓名、专业、班级。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>

            {parseMessage && (
              <Alert>
                <AlertDescription>{parseMessage}</AlertDescription>
              </Alert>
            )}

            {parsedStudents.length > 0 && (
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>班级</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedStudents.map((student, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {student.studentNo}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.major}</TableCell>
                        <TableCell>{student.className}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Excel 格式说明</h4>
              <p className="text-sm text-muted-foreground mb-2">
                请确保 Excel 文件包含以下列（支持中英文列名）：
              </p>
              <div className="flex gap-2">
                <Badge variant="outline">学号</Badge>
                <Badge variant="outline">姓名</Badge>
                <Badge variant="outline">专业</Badge>
                <Badge variant="outline">班级</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                注意：只有已在系统中注册的学生才会被关联。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setParsedStudents([]);
                setParseMessage(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedStudents.length === 0 || isImporting}
            >
              {isImporting
                ? "导入中..."
                : `导入 ${parsedStudents.length} 条记录`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认移除</DialogTitle>
            <DialogDescription>
              确定要移除学生 {studentToDelete?.name}（
              {studentToDelete?.studentNo}
              ）的关联吗？此操作不会删除学生账号。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setStudentToDelete(null);
              }}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleRemoveStudent}>
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

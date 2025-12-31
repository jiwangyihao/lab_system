"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconDatabase,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { seedDatabaseAction, previewSeedDataAction } from "@/lib/actions/seed";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconEye } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DatabaseSettingsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [currentTab, setCurrentTab] = useState("users");

  // New State for Append Mode
  const [shouldClear, setShouldClear] = useState(true);
  // Use random seed by default for "Append" mode scenarios
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 100000));

  const toggleMode = (reset: boolean) => {
    setShouldClear(reset);
    // If Reset (true) -> Seed 123. If Append (false) -> Random Seed.
    setSeed(reset ? 123 : Math.floor(Math.random() * 900000 + 100000));
  };

  // Effect to refresh preview when seed changes?
  // Better to let user click "Refresh" or just refresh automatically if dialog is open.
  // We'll call handlePreview manually after toggle.

  // Reset page when preview opens
  const onPreviewOpenChange = (open: boolean) => {
    if (open) {
      setPage(1);
      setCurrentTab("users");
    }
    setPreviewOpen(open);
  };

  // Refresh preview when seed changes (if dialog is open)
  // This ensures that toggling the switch immediately updates the data
  useEffect(() => {
    if (previewOpen) {
      handlePreview();
    }
  }, [seed]);

  // ... (handleSeed remains same)

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      // Pass the current seed to ensure server generates matching data
      const result = await previewSeedDataAction(seed);
      if (result.success) {
        setPreviewData(result.data);
        setPreviewOpen(true);
      } else {
        toast.error(result.error || "获取预览失败");
      }
    } catch (error) {
      toast.error("操作失败");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSeed = async (skipConfirm = false) => {
    // Only require RESET confirmation if clearing data AND not skipping explicit check
    if (shouldClear && !skipConfirm && confirmText !== "RESET") {
      toast.error("请输入 RESET 以确认");
      return;
    }

    setLoading(true);
    try {
      const result = await seedDatabaseAction(shouldClear, seed);
      if (result.success) {
        toast.success(result.message);

        // Only redirect logout if we cleared data (which deleted current user)
        if (shouldClear) {
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          // If refreshing/appending, just close dialog and maybe refresh lists?
          // We can trigger a refresh if we had a data context, but full page reload is safer or just let user know.
          setPreviewOpen(false);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">数据库管理</h3>
        <p className="text-sm text-muted-foreground">
          管理系统数据，仅限负责人使用。
        </p>
      </div>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconEye className="h-5 w-5" />
            数据预览
          </CardTitle>
          <CardDescription>
            在执行重置前，您可以预览将要生成的测试数据结构和样本。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={loadingPreview}
          >
            {loadingPreview ? (
              <IconRefresh className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <IconEye className="h-4 w-4 mr-2" />
            )}
            生成预览数据
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>测试数据预览</DialogTitle>
            <DialogDescription>
              以下是即将生成的模拟数据摘要。您可以点击表格中的“详情”按钮查看完整数据。
            </DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Switch
                id="mode-switch"
                checked={shouldClear}
                onCheckedChange={(checked) => toggleMode(checked)}
              />
              <Label htmlFor="mode-switch" className="font-medium">
                {shouldClear
                  ? "重置数据库 (生成固定数据)"
                  : "追加模式 (生成随机数据)"}
              </Label>
              {!shouldClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Generate new random seed and refresh
                    setSeed(Math.floor(Math.random() * 100000));
                  }}
                  className="h-6 text-xs"
                >
                  <IconRefresh className="w-3 h-3 mr-1" /> 刷新随机种子
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[65vh] min-h-[500px] w-full border rounded-md p-4 bg-background">
            <Tabs
              value={currentTab}
              className="w-full"
              onValueChange={(val) => {
                setCurrentTab(val);
                setPage(1);
              }}
            >
              <div className="flex flex-col gap-2">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                  <TabsTrigger value="users">用户</TabsTrigger>
                  <TabsTrigger value="equipments">设备</TabsTrigger>
                  <TabsTrigger value="reservations">预约</TabsTrigger>
                  <TabsTrigger value="purchaseRequests">采购</TabsTrigger>
                  <TabsTrigger value="scrapRequests">报废</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-5 h-auto">
                  <TabsTrigger value="maintenanceLogs">维修</TabsTrigger>
                  <TabsTrigger value="regulations">规章</TabsTrigger>
                  <TabsTrigger value="experimentPlans">教学计划</TabsTrigger>
                  <TabsTrigger value="incidents">事故</TabsTrigger>
                  <TabsTrigger value="checkIns">签到</TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-muted-foreground ml-2">
                  当前分类总数: {previewData?.[currentTab]?.length || 0}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <span>第 {page} 页</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={
                      page * 10 >= (previewData?.[currentTab]?.length || 0)
                    }
                  >
                    下一页
                  </Button>
                </div>
              </div>

              {/* Render Helper */}
              {[
                "users",
                "equipments",
                "reservations",
                "purchaseRequests",
                "scrapRequests",
                "maintenanceLogs",
                "regulations",
                "experimentPlans",
                "incidents",
                "checkIns",
                "payments",
                "systemConfigs",
                "ipWhitelists",
              ].map((tabKey) => (
                <TabsContent key={tabKey} value={tabKey} className="mt-1">
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* Dynamic Header based on key */}
                          {tabKey === "users" && (
                            <>
                              <TableHead>姓名</TableHead>
                              <TableHead>用户名</TableHead>
                              <TableHead>角色</TableHead>
                              <TableHead>电话</TableHead>
                              <TableHead>详细信息</TableHead>
                            </>
                          )}
                          {tabKey === "equipments" && (
                            <>
                              <TableHead>名称</TableHead>
                              <TableHead>型号</TableHead>
                              <TableHead>管理员</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>租赁价格</TableHead>
                            </>
                          )}
                          {tabKey === "reservations" && (
                            <>
                              <TableHead>申请人</TableHead>
                              <TableHead>设备</TableHead>
                              <TableHead>开始时间</TableHead>
                              <TableHead>结束时间</TableHead>
                              <TableHead>状态</TableHead>
                            </>
                          )}
                          {tabKey === "purchaseRequests" && (
                            <>
                              <TableHead>名称</TableHead>
                              <TableHead>申请人</TableHead>
                              <TableHead>数量</TableHead>
                              <TableHead>预算</TableHead>
                              <TableHead>状态</TableHead>
                            </>
                          )}
                          {tabKey === "scrapRequests" && (
                            <>
                              <TableHead>设备</TableHead>
                              <TableHead>申请人</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>日期</TableHead>
                            </>
                          )}
                          {tabKey === "maintenanceLogs" && (
                            <>
                              <TableHead>设备</TableHead>
                              <TableHead>内容</TableHead>
                              <TableHead>日期</TableHead>
                              <TableHead>操作人</TableHead>
                            </>
                          )}
                          {tabKey === "regulations" && (
                            <>
                              <TableHead>标题</TableHead>
                              <TableHead>排序</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>摘要</TableHead>
                            </>
                          )}
                          {tabKey === "experimentPlans" && (
                            <>
                              <TableHead>标题</TableHead>
                              <TableHead>描述</TableHead>
                              <TableHead>开始日期</TableHead>
                              <TableHead>目标用户</TableHead>
                            </>
                          )}
                          {tabKey === "incidents" && (
                            <>
                              <TableHead>标题</TableHead>
                              <TableHead>上报人</TableHead>
                              <TableHead>严重程度</TableHead>
                              <TableHead>状态</TableHead>
                            </>
                          )}
                          {tabKey === "checkIns" && (
                            <>
                              <TableHead>用户</TableHead>
                              <TableHead>设备</TableHead>
                              <TableHead>预约时段</TableHead>
                              <TableHead>签到时间</TableHead>
                              <TableHead>备注</TableHead>
                            </>
                          )}
                          {tabKey === "payments" && (
                            <>
                              <TableHead>关联预约</TableHead>
                              <TableHead>金额</TableHead>
                              <TableHead>支付时间</TableHead>
                              <TableHead>方式</TableHead>
                              <TableHead>已退款</TableHead>
                            </>
                          )}
                          {tabKey === "systemConfigs" && (
                            <>
                              <TableHead>配置项</TableHead>
                              <TableHead>配置值</TableHead>
                              <TableHead>描述</TableHead>
                            </>
                          )}
                          {tabKey === "ipWhitelists" && (
                            <>
                              <TableHead>IP地址</TableHead>
                              <TableHead>描述</TableHead>
                            </>
                          )}
                          <TableHead className="w-[80px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData?.[tabKey]
                          ?.slice((page - 1) * 10, page * 10)
                          .map((item: any, i: number) => (
                            <TableRow key={i}>
                              {tabKey === "users" && (
                                <>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.username}</TableCell>
                                  <TableCell>{item.role}</TableCell>
                                  <TableCell>{item.phone || "-"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {item.role === "STUDENT"
                                      ? `${item.studentNo} / ${item.major}`
                                      : item.role === "TEACHER"
                                      ? `${item.teacherNo} / ${item.jobTitle}`
                                      : item.email}
                                  </TableCell>
                                </>
                              )}
                              {tabKey === "equipments" && (
                                <>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.model}</TableCell>
                                  <TableCell>{item.admin || "-"}</TableCell>
                                  <TableCell>{item.status}</TableCell>
                                  <TableCell>¥{item.rentalPrice}</TableCell>
                                </>
                              )}
                              {tabKey === "reservations" && (
                                <>
                                  <TableCell>{item.user}</TableCell>
                                  <TableCell>{item.equipment}</TableCell>
                                  <TableCell>
                                    {new Date(item.startTime).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(item.endTime).toLocaleString()}
                                  </TableCell>
                                  <TableCell>{item.status}</TableCell>
                                </>
                              )}
                              {tabKey === "purchaseRequests" && (
                                <>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.applicant}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{item.budget}</TableCell>
                                  <TableCell>{item.status}</TableCell>
                                </>
                              )}
                              {tabKey === "scrapRequests" && (
                                <>
                                  <TableCell>{item.equipment}</TableCell>
                                  <TableCell>{item.applicant}</TableCell>
                                  <TableCell>{item.status}</TableCell>
                                  <TableCell>
                                    {new Date(
                                      item.createdAt
                                    ).toLocaleDateString()}
                                  </TableCell>
                                </>
                              )}
                              {tabKey === "maintenanceLogs" && (
                                <>
                                  <TableCell>{item.equipment}</TableCell>
                                  <TableCell>{item.content}</TableCell>
                                  <TableCell>
                                    {new Date(
                                      item.logDate
                                    ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>{item.operator}</TableCell>
                                </>
                              )}
                              {tabKey === "regulations" && (
                                <>
                                  <TableCell>{item.title}</TableCell>
                                  <TableCell>{item.order}</TableCell>
                                  <TableCell>
                                    {item.isActive ? "启用" : "禁用"}
                                  </TableCell>
                                  <TableCell className="truncate max-w-[150px]">
                                    {Array.isArray(item.content)
                                      ? item.content
                                          .map(
                                            (p: any) =>
                                              p.children?.[0]?.text || ""
                                          )
                                          .join(" ")
                                      : typeof item.content === "string"
                                      ? item.content
                                      : JSON.stringify(item.content)}
                                  </TableCell>
                                </>
                              )}
                              {tabKey === "experimentPlans" && (
                                <>
                                  <TableCell>{item.title}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>{item.startDate}</TableCell>
                                  <TableCell>
                                    {item.targetUsers?.join(", ")}
                                  </TableCell>
                                </>
                              )}
                              {tabKey === "incidents" && (
                                <>
                                  <TableCell>{item.title}</TableCell>
                                  <TableCell>{item.reporter}</TableCell>
                                  <TableCell>{item.severity}</TableCell>
                                  <TableCell>{item.status}</TableCell>
                                </>
                              )}
                              {tabKey === "checkIns" && (
                                <>
                                  <TableCell>{item.user}</TableCell>
                                  <TableCell>{item.equipment}</TableCell>
                                  <TableCell className="text-xs">
                                    {item.reservationTime}
                                  </TableCell>
                                  <TableCell>
                                    {item.checkInTime
                                      ? new Date(
                                          item.checkInTime
                                        ).toLocaleString()
                                      : "-"}
                                  </TableCell>
                                  <TableCell>{item.notes}</TableCell>
                                </>
                              )}
                              {tabKey === "payments" && (
                                <>
                                  <TableCell className="text-xs">
                                    {item.reservation}
                                  </TableCell>
                                  <TableCell>¥{item.amount}</TableCell>
                                  <TableCell>
                                    {item.paidAt
                                      ? new Date(item.paidAt).toLocaleString()
                                      : "-"}
                                  </TableCell>
                                  <TableCell>{item.method || "-"}</TableCell>
                                  <TableCell>
                                    {item.isRefunded ? "是" : "否"}
                                  </TableCell>
                                </>
                              )}
                              {tabKey === "systemConfigs" && (
                                <>
                                  <TableCell>{item.key}</TableCell>
                                  <TableCell>{item.value}</TableCell>
                                  <TableCell>{item.desc || "-"}</TableCell>
                                </>
                              )}
                              {tabKey === "ipWhitelists" && (
                                <>
                                  <TableCell>{item.ipAddress}</TableCell>
                                  <TableCell>{item.desc || "-"}</TableCell>
                                </>
                              )}
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setDetailOpen(true);
                                  }}
                                >
                                  <IconEye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <p className="text-sm text-muted-foreground mt-4">
              {previewData?.note || "* 注：所有生成用户的初始密码均为 123456。"}
            </p>
          </ScrollArea>
          <DialogFooter className="gap-3 pt-4 sm:justify-between items-center">
            <div className="flex-1 flex gap-2 items-center">
              {shouldClear ? (
                <>
                  <span className="text-destructive text-sm font-bold whitespace-nowrap">
                    警告: 将清空现有数据!
                  </span>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="输入 RESET"
                    className="w-32 h-8 text-xs"
                  />
                </>
              ) : (
                <span className="text-muted-foreground text-sm">
                  追加模式：将生成并插入新的随机测试数据，保留现有数据。
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                取消
              </Button>
              <Button
                onClick={async () => {
                  // setPreviewOpen(false); // Do not close immediately to show loading state
                  await handleSeed();
                }}
                variant={shouldClear ? "destructive" : "default"}
                disabled={(shouldClear && confirmText !== "RESET") || loading}
              >
                {loading ? (
                  <>
                    <IconRefresh className="animate-spin h-4 w-4 mr-2" />
                    处理中...
                  </>
                ) : shouldClear ? (
                  "确认重置并应用"
                ) : (
                  "确认追加数据"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>详细信息</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {selectedItem &&
                  Object.entries(selectedItem).map(([key, value]) => {
                    // 字段名中英文映射
                    const fieldLabels: Record<string, string> = {
                      name: "名称",
                      username: "用户名",
                      role: "角色",
                      email: "邮箱",
                      phone: "电话",
                      studentNo: "学号",
                      major: "专业",
                      className: "班级",
                      teacherNo: "工号",
                      jobTitle: "职称",
                      department: "院系",
                      model: "型号",
                      status: "状态",
                      manufacturer: "制造商",
                      location: "位置",
                      purchaseDate: "采购日期",
                      price: "价格",
                      maintenanceCycle: "维护周期(天)",
                      adminName: "管理员",
                      user: "用户",
                      equipment: "设备",
                      startTime: "开始时间",
                      endTime: "结束时间",
                      project: "项目",
                      usageDesc: "使用说明",
                      description: "描述",
                      date: "日期",
                      applicant: "申请人",
                      quantity: "数量",
                      budget: "预算",
                      reason: "原因",
                      title: "标题",
                      content: "内容",
                      startDate: "开始日期",
                      endDate: "结束日期",
                      targetUsers: "目标用户",
                      reporter: "上报人",
                      severity: "严重程度",
                      checkInTime: "签到时间",
                      checkOutTime: "签退时间",
                      notes: "备注",
                      amount: "金额",
                      method: "方式",
                      key: "配置项",
                      value: "配置值",
                      desc: "描述",
                      ipAddress: "IP地址",
                      // Schema 对齐字段
                      rentalPrice: "租赁价格",
                      operator: "操作人",
                      logDate: "记录日期",
                      order: "排序",
                      isActive: "启用状态",
                      paidAt: "支付时间",
                      isRefunded: "已退款",
                      reservation: "关联预约",
                      reservationTime: "预约时段",
                      equipmentStatus: "设备状态",
                      purchaseRequestName: "来源采购",
                      targetAdmin: "目标管理员",
                      admin: "管理员",
                      adminUsername: "管理员账号",
                      createdAt: "创建时间",
                      rejectReason: "驳回原因",
                    };
                    const label = fieldLabels[key] || key;

                    // 特殊处理 content 字段（Lexical JSON 格式）
                    let displayValue: string;
                    if (key === "content" && Array.isArray(value)) {
                      displayValue = (value as any[])
                        .map((p: any) => p.children?.[0]?.text || "")
                        .filter(Boolean)
                        .join("\n");
                    } else if (typeof value === "object" && value !== null) {
                      displayValue = JSON.stringify(value, null, 2);
                    } else {
                      displayValue = String(value);
                    }

                    return (
                      <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          {label}:
                        </span>
                        <span className="col-span-2 break-all whitespace-pre-wrap">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </Dialog>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">危险区域</CardTitle>
          </div>
          <CardDescription>
            以下操作将导致数据丢失，请谨慎操作。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="space-y-1">
              <h4 className="font-medium flex items-center gap-2">
                <IconDatabase className="h-4 w-4" />
                初始化/重置数据库
              </h4>
              <p className="text-sm text-muted-foreground">
                清空所有数据并生成测试数据 (用户/设备/记录)。
                <br />
                默认创建账号: head/admin/teacher/student (密码: 123456)
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger
                className={buttonVariants({ variant: "destructive" })}
              >
                重置系统数据
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认绝对重置？</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      此操作将 <strong>永久删除</strong>{" "}
                      所有现有数据（用户、设备、预约等），且无法恢复。
                    </p>
                    <p>操作完成后，您将被强制登出。</p>
                    <p className="mt-2 text-sm font-semibold">
                      请输入 &quot;RESET&quot; 确认操作：
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="RESET"
                      className="mt-2"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "RESET" || loading}
                    onClick={(e) => {
                      e.preventDefault(); // Prevent close until async finish? No, implementation handles verify
                      handleSeed();
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {loading ? (
                      <IconRefresh className="animate-spin h-4 w-4" />
                    ) : (
                      "确认重置"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

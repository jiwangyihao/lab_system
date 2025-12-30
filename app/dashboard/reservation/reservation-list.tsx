"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ReservationStatus } from "@prisma/client";
import { toast } from "sonner";
import {
  IconDotsVertical,
  IconLoader2,
  IconAlertCircle,
  IconEye,
  IconX,
  IconLogin,
  IconLogout,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cancelReservation, confirmPayment } from "@/lib/actions/reservation";
import { checkIn, checkOut } from "@/lib/actions/monitoring";
import { IconCash } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReservationDisplay {
  id: string;
  equipment: {
    name: string;
    model: string;
  };
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  rejectReason?: string | null;
  payment?: {
    amount: number;
    paidAt: Date | null;
  } | null;
}

const statusMap: Record<ReservationStatus, { label: string; color: string }> = {
  PENDING_TEACHER: {
    label: "待导师审批",
    color: "bg-yellow-100 text-yellow-800",
  },
  PENDING_ADMIN: {
    label: "待管理员审批",
    color: "bg-orange-100 text-orange-800",
  },
  PENDING_HEAD: {
    label: "待负责人审批",
    color: "bg-purple-100 text-purple-800",
  },
  PENDING_PAYMENT: { label: "待缴费", color: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已批准", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已驳回", color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "已撤销", color: "bg-gray-100 text-gray-800" },
  IN_USE: { label: "使用中", color: "bg-teal-100 text-teal-800" },
  COMPLETED: { label: "已完成", color: "bg-gray-200 text-gray-600" },
};

export function ReservationList({ data }: { data: ReservationDisplay[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [paymentItem, setPaymentItem] = useState<ReservationDisplay | null>(
    null
  );
  // Keep a ref to preserve content during close animation
  const lastPaymentItemRef = React.useRef<ReservationDisplay | null>(null);
  if (paymentItem) {
    lastPaymentItemRef.current = paymentItem;
  }
  const displayedPaymentItem = paymentItem || lastPaymentItemRef.current;

  const handleCancel = async () => {
    if (!cancelId) return;

    startTransition(async () => {
      const result = await cancelReservation(cancelId);
      if (result.success) {
        toast.success("撤销成功", { description: "预约已取消" });
        setCancelId(null);
        router.refresh();
      } else {
        toast.error("撤销失败", { description: result.error });
      }
    });
  };

  const handlePayment = async () => {
    if (!paymentItem) return;

    startTransition(async () => {
      try {
        await confirmPayment(paymentItem.id);
        toast.success("缴费成功", { description: "预约已生效" });
        setPaymentItem(null);
        router.refresh();
      } catch (error: any) {
        toast.error("缴费失败", { description: error.message || "请稍后重试" });
      }
    });
  };

  const handleCheckIn = (id: string) => {
    startTransition(async () => {
      const result = await checkIn(id);
      if (result.success) {
        toast.success("签到成功", { description: "设备已标记为使用中" });
        router.refresh();
      } else {
        toast.error("签到失败", { description: result.error });
      }
    });
  };

  const handleCheckOut = (id: string) => {
    startTransition(async () => {
      const result = await checkOut(id);
      if (result.success) {
        toast.success("签退成功", { description: "本次借用已结束" });
        router.refresh();
      } else {
        toast.error("签退失败", { description: result.error });
      }
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>设备名称</TableHead>
              <TableHead>借用时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  暂无预约记录
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const statusConfig = statusMap[item.status] || {
                  label: item.status,
                  color: "bg-gray-100",
                };
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.equipment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.equipment.model}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          {format(new Date(item.startTime), "yyyy-MM-dd")}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(item.startTime), "HH:mm")} -{" "}
                          {format(new Date(item.endTime), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={statusConfig.color + " border-0"}
                        >
                          {statusConfig.label}
                        </Badge>
                        {item.status === "REJECTED" && item.rejectReason && (
                          <div title={item.rejectReason}>
                            <IconAlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0" />
                          }
                        >
                          <span className="sr-only">打开菜单</span>
                          <IconDotsVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/reservation/${item.id}`)
                            }
                          >
                            <IconEye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>

                          {item.status === "APPROVED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-green-600 focus:text-green-600"
                                onClick={() => handleCheckIn(item.id)}
                              >
                                <IconLogin className="mr-2 h-4 w-4" />
                                签到使用
                              </DropdownMenuItem>
                            </>
                          )}

                          {item.status === "IN_USE" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-orange-600 focus:text-orange-600"
                                onClick={() => handleCheckOut(item.id)}
                              >
                                <IconLogout className="mr-2 h-4 w-4" />
                                签退结束
                              </DropdownMenuItem>
                            </>
                          )}

                          {item.status === "PENDING_PAYMENT" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-blue-600 focus:text-blue-600"
                                onClick={() => setPaymentItem(item)}
                              >
                                <IconCash className="mr-2 h-4 w-4" />
                                立即缴费
                              </DropdownMenuItem>
                            </>
                          )}

                          {[
                            "PENDING_TEACHER",
                            "PENDING_ADMIN",
                            "PENDING_HEAD",
                            "PENDING_PAYMENT",
                            "APPROVED",
                          ].includes(item.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setCancelId(item.id)}
                              >
                                <IconX className="mr-2 h-4 w-4" />
                                撤销预约
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认撤销预约?</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将取消您的预约。如果是付费预约，退款（95%）将原路退回。
              <br />
              <b>注意：必须提前24小时以上才能撤销。</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认撤销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Confirmation Dialog */}
      <AlertDialog
        open={!!paymentItem}
        onOpenChange={(open) => !open && setPaymentItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconCash className="h-5 w-5 text-blue-600" />
              确认缴费
            </AlertDialogTitle>
            <AlertDialogDescription>
              您正在为以下预约进行缴费：
            </AlertDialogDescription>
            {displayedPaymentItem && (
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">设备：</span>
                  {displayedPaymentItem.equipment.name}
                </div>
                <div>
                  <span className="text-muted-foreground">时间：</span>
                  {format(
                    new Date(displayedPaymentItem.startTime),
                    "yyyy-MM-dd HH:mm"
                  )}{" "}
                  - {format(new Date(displayedPaymentItem.endTime), "HH:mm")}
                </div>
                {displayedPaymentItem.payment && (
                  <div className="text-lg font-bold text-primary">
                    应付金额：¥{displayedPaymentItem.payment.amount.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              * 这是模拟支付，点击确认后将直接完成缴费
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayment}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending && (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认支付
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

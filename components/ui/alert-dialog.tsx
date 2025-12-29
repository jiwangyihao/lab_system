"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * 这是一个基于现有 Dialog 组件封装的 AlertDialog。
 * 如果项目中没有安装 @radix-ui/react-alert-dialog，
 * 这种方式是最稳妥的，UI 也能保持一致。
 */

function AlertDialog({ ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("sm:max-w-[425px]", className)}
      showCloseButton={false}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={className} {...props} />;
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={className} {...props} />;
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={className} {...props} />;
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={className} {...props} />;
}

// AlertDialogAction 通常用于提交/确认
function AlertDialogAction({ className, children, onClick, ...props }: any) {
  // 借用子组件内部的按钮样式或逻辑
  // 在这里简单返回 children，外层通常已经包含了 Button
  return (
    <div
      onClick={onClick}
      className={cn("inline-flex justify-center", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// AlertDialogCancel 通常用于取消，并触发关闭
function AlertDialogCancel({ className, children, ...props }: any) {
  // 这里依赖外层控制 open 状态，或者可以借助 DialogClose
  return (
    <div className={cn("inline-flex justify-center", className)} {...props}>
      {children}
    </div>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};

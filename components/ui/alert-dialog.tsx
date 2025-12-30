"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  return <DialogFooter className={cn("gap-2", className)} {...props} />;
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

// AlertDialogAction 用于提交/确认操作
interface AlertDialogActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function AlertDialogAction({
  className,
  children,
  ...props
}: AlertDialogActionProps) {
  return (
    <Button className={cn(className)} {...props}>
      {children}
    </Button>
  );
}

// AlertDialogCancel 用于取消并关闭对话框
interface AlertDialogCancelProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function AlertDialogCancel({
  className,
  children,
  ...props
}: AlertDialogCancelProps) {
  return (
    <DialogClose
      render={
        <Button variant="outline" className={cn(className)} {...props}>
          {children}
        </Button>
      }
    />
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

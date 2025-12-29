import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-primary"
            >
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            江南大学实验室设备管理系统
          </h1>
          <p className="text-muted-foreground mt-2">
            Laboratory Equipment Management System
          </p>
        </div>

        {/* 认证表单容器 */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          {children}
        </div>

        {/* 底部信息 */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 江南大学. All rights reserved.
        </p>
      </div>
    </div>
  );
}

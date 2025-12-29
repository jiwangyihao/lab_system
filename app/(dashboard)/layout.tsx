import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 获取会话信息
  const session = await auth();

  // 未登录重定向到登录页
  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name || session.user.username || "用户";
  const userRole = session.user.role || "STUDENT";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* 侧边栏 */}
        <Sidebar userRole={userRole} />

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* 顶栏 */}
          <Header userName={userName} userRole={userRole} />

          {/* 页面内容 */}
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

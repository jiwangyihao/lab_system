import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 角色名称映射
const ROLE_NAMES: Record<string, string> = {
  STUDENT: "学生",
  TEACHER: "教师",
  OUTSIDER: "校外人员",
  ADMIN: "设备管理员",
  HEAD: "实验室负责人",
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "用户";
  const userRole = session?.user?.role || "STUDENT";

  return (
    <div className="space-y-6">
      {/* 欢迎标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          欢迎回来，{userName}
        </h1>
        <p className="text-muted-foreground">
          您的身份：{ROLE_NAMES[userRole] || userRole}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备总数</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v4" />
              <path d="m6.8 14-3.5 2" />
              <path d="m20.7 16-3.5-2" />
              <path d="M6.8 10 3.3 8" />
              <path d="m20.7 8-3.5 2" />
              <path d="m9 22 3-8 3 8" />
              <path d="M8 22h8" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">待接入设备数据</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">我的预约</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">待接入预约数据</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审批</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8" />
              <path d="m22 10-7 7-2.5-2.5" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">待接入审批数据</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备利用率</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">待接入统计数据</p>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作区 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>近期预约</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              暂无预约记录
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              功能开发中，敬请期待...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

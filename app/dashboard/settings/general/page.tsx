import { auth } from "@/lib/auth";
import { getAllSystemConfigs } from "@/lib/actions/system-config";
import { SystemConfigForm } from "@/components/business/settings/system-config-form";

export default async function GeneralSettingsPage() {
  const session = await auth();

  // Basic role check on page level as well
  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return <div className="p-4 text-destructive">无权访问此页面</div>;
  }

  const { data: configs } = await getAllSystemConfigs();

  const configMap: Record<string, string> = {};
  if (configs) {
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">通用设置</h3>
        <p className="text-sm text-muted-foreground">
          管理系统全局参数，如检修周期、预约限制等。
        </p>
      </div>
      <SystemConfigForm initialData={configMap} />
    </div>
  );
}

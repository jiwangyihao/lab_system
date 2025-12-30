import { auth } from "@/lib/auth";
import { getIpWhitelists } from "@/lib/actions/ip-whitelist";
import { IpWhitelistManager } from "@/components/business/settings/ip-whitelist-manager";

export default async function NetworkSettingsPage() {
  const session = await auth();

  if (session?.user?.role !== "HEAD" && session?.user?.role !== "ADMIN") {
    return <div className="p-4 text-destructive">无权访问此页面</div>;
  }

  const { data: list } = await getIpWhitelists();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">网络安全设置</h3>
        <p className="text-sm text-muted-foreground">
          管理允许访问后台管理功能的 IP 白名单。配置仅对 ADMIN 和 HEAD
          角色生效。
        </p>
      </div>
      {/* Cast standard Prisma type to component interface if needed, but structure matches */}
      <IpWhitelistManager items={list || []} />
    </div>
  );
}

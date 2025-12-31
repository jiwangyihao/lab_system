import { auth } from "@/lib/auth";
import { getRegulations } from "@/lib/actions/regulation";
import { RegulationViewer } from "@/components/business/settings/regulation-viewer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";

interface Regulation {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export default async function RulesPage() {
  const session = await auth();
  const { data: regulations } = (await getRegulations()) as {
    data: Regulation[] | undefined;
  };

  const isHead =
    session?.user?.role === "HEAD" || session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">管理制度</h2>
          <p className="text-muted-foreground">
            实验室各项安全、使用及管理管理规定。
          </p>
        </div>
        {isHead && (
          <Link
            href="/dashboard/settings/rules/manage"
            className={buttonVariants()}
          >
            <IconSettings className="mr-2 h-4 w-4" />
            管理制度
          </Link>
        )}
      </div>

      <div className="grid gap-6">
        {regulations?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <CardTitle>{rule.title}</CardTitle>
              <CardDescription>
                更新于 {new Date(rule.updatedAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegulationViewer content={rule.content} />
            </CardContent>
          </Card>
        ))}
        {(!regulations || regulations.length === 0) && (
          <div className="text-center py-10 text-muted-foreground">
            暂无规章制度
          </div>
        )}
      </div>
    </div>
  );
}

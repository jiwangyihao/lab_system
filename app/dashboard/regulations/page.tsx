import { getRegulations } from "@/lib/actions/regulation";
import { RegulationViewer } from "@/components/business/settings/regulation-viewer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理制度",
};

export default async function RegulationsPage() {
  const { data: regulations } = await getRegulations();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">管理制度</h2>
        <p className="text-muted-foreground">
          实验室各项安全、使用及管理规定。
        </p>
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
          <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed bg-muted/20">
            暂无规章制度
          </div>
        )}
      </div>
    </div>
  );
}

import { RegulationForm } from "@/components/business/settings/regulation-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewRegulationPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">新增规章制度</h2>
        <p className="text-muted-foreground">创建新的实验室管理规章制度。</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <RegulationForm />
        </CardContent>
      </Card>
    </div>
  );
}

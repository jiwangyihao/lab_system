import { getRegulation } from "@/lib/actions/regulation";
import { RegulationForm } from "@/components/business/settings/regulation-form";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRegulationPage({ params }: PageProps) {
  const { id } = await params;
  const { data: regulation, error } = await getRegulation(id);

  if (error || !regulation) {
    // In production we might want to distinguish 404 vs 500
    if (error === "未找到规章制度") notFound();
    return (
      <div className="text-destructive p-4">
        Error loading regulation: {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">编辑规章制度</h2>
        <p className="text-muted-foreground">编辑现有规章制度及其条款。</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <RegulationForm initialData={regulation} />
        </CardContent>
      </Card>
    </div>
  );
}

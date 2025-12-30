"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteRegulation } from "@/lib/actions/regulation";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export function DeleteRegulationButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm("确定要删除这条规章制度吗？")) return;

    startTransition(async () => {
      const result = await deleteRegulation(id);
      if (result.success) {
        toast.success("删除成功");
        router.refresh();
      } else {
        toast.error(result.error || "删除失败");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <IconTrash className="h-4 w-4" />
    </Button>
  );
}

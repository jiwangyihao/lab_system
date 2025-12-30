import { getAllRegulationsForAdmin } from "@/lib/actions/regulation";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconPlus, IconEdit, IconArrowLeft } from "@tabler/icons-react";
import { DeleteRegulationButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";

export default async function ManageRulesPage() {
  const { data: regulations, error } = await getAllRegulationsForAdmin();

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/settings/rules"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <IconArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">规章制度管理</h2>
        </div>
        <Link
          href="/dashboard/settings/rules/manage/new"
          className={buttonVariants()}
        >
          <IconPlus className="mr-2 h-4 w-4" />
          新增规章
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">排序</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regulations?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.order}</TableCell>
                <TableCell className="font-medium">{rule.title}</TableCell>
                <TableCell>
                  {rule.isActive ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      已启用
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      已禁用
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(rule.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Link
                    href={`/dashboard/settings/rules/manage/${rule.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon",
                    })}
                  >
                    <IconEdit className="h-4 w-4" />
                  </Link>
                  <DeleteRegulationButton id={rule.id} />
                </TableCell>
              </TableRow>
            ))}
            {(!regulations || regulations.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  暂无规章制度
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

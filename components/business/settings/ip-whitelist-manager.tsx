"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  createIpWhitelist,
  deleteIpWhitelist,
} from "@/lib/actions/ip-whitelist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconPlus, IconTrash } from "@tabler/icons-react";

interface IpWhitelistItem {
  id: string;
  ipAddress: string;
  desc: string | null;
  createdAt: Date;
}

const formSchema = z.object({
  ipAddress: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
      "请输入有效的 IP 地址 (IPv4 或 IPv6)"
    ),
  desc: z.string().optional(),
});

export function IpWhitelistManager({ items }: { items: IpWhitelistItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipAddress: "",
      desc: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await createIpWhitelist({
      ipAddress: values.ipAddress,
      desc: values.desc,
    });

    if (result.success) {
      toast.success("IP 白名单添加成功");
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个 IP 吗？删除后该 IP 可能无法访问管理后台。"))
      return;
    const result = await deleteIpWhitelist(id);
    if (result.success) {
      toast.success("删除成功");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <IconPlus className="mr-2 h-4 w-4" />
            添加 IP
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加允许访问的 IP</DialogTitle>
              <DialogDescription>
                仅将管理员或负责人常用的固定 IP 加入白名单。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.ipAddress}>
                  <FieldLabel htmlFor="ipAddress">IP 地址</FieldLabel>
                  <Input
                    id="ipAddress"
                    placeholder="192.168.1.100"
                    {...form.register("ipAddress")}
                  />
                  <FieldError errors={[form.formState.errors.ipAddress]} />
                </Field>
                <Field data-invalid={!!form.formState.errors.desc}>
                  <FieldLabel htmlFor="desc">备注 (可选)</FieldLabel>
                  <Input
                    id="desc"
                    placeholder="例：实验室 A301 电脑"
                    {...form.register("desc")}
                  />
                  <FieldError errors={[form.formState.errors.desc]} />
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full">
                添加
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP 地址</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>添加时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.ipAddress}</TableCell>
                <TableCell>{item.desc || "-"}</TableCell>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    onClick={() => handleDelete(item.id)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  暂无白名单记录 (未启用时可能允许所有访问，视 Middleware
                  配置而定)
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

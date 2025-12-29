import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import NewEquipmentPage from "./page.client"; // Client component

export default async function Page() {
  const session = await auth();

  // 仅 HEAD 允许直接新增设备
  if (session?.user?.role !== Role.HEAD) {
    redirect("/dashboard/equipment");
  }

  return <NewEquipmentPage />;
}

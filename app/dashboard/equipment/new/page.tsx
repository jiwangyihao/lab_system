import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/lib/enums";
import NewEquipmentPage from "./page.client"; // Client component
import { getEquipmentAdminsAction } from "@/lib/actions/purchase";

export default async function Page() {
  const session = await auth();

  // 仅 HEAD 允许直接新增设备
  if (session?.user?.role !== Role.HEAD) {
    redirect("/dashboard/equipment");
  }

  const adminsResult = await getEquipmentAdminsAction();
  const admins = adminsResult.data || [];

  return <NewEquipmentPage admins={admins} />;
}

import { auth } from "@/lib/auth";
import EditEquipmentPage from "./page.client";
import { getEquipmentAdminsAction } from "@/lib/actions/purchase";

export default async function Page() {
  const session = await auth();
  const role = session?.user?.role || "GUEST";

  const adminsResult = await getEquipmentAdminsAction();
  const admins = adminsResult.data || [];

  return <EditEquipmentPage userRole={role} admins={admins} />;
}

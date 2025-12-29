import { auth } from "@/lib/auth";
import EditEquipmentPage from "./page.client";

export default async function Page() {
  const session = await auth();
  const role = session?.user?.role || "GUEST";

  return <EditEquipmentPage userRole={role} />;
}

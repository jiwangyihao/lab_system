import { auth } from "@/lib/auth";
import EquipmentListPage from "./page.client";

export default async function EquipmentPage() {
  const session = await auth();
  const userRole = session?.user?.role || "STUDENT";
  const userId = session?.user?.id;

  return <EquipmentListPage userRole={userRole} userId={userId} />;
}

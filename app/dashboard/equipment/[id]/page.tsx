import { auth } from "@/lib/auth";
import EquipmentDetailPage from "./page.client";

export default async function Page() {
  const session = await auth();
  const userRole = session?.user?.role || "STUDENT";

  return <EquipmentDetailPage userRole={userRole} />;
}

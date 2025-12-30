import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ReservationList } from "./reservation-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的预约",
};

export default async function ReservationPage() {
  const session = await auth();
  if (!session?.user?.id) return <div>未登录</div>;

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      equipment: {
        select: { name: true, model: true },
      },
      payment: {
        select: { amount: true, paidAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">我的预约</h2>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/reservation/new">
            <Button>
              <IconPlus className="mr-2 h-4 w-4" /> 新建预约
            </Button>
          </Link>
        </div>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <ReservationList data={reservations} />
      </div>
    </div>
  );
}

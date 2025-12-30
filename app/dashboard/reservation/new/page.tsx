import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "./reservation-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "新建预约",
};

export default async function NewReservationPage() {
  const equipmentList = await prisma.equipment.findMany({
    where: {
      status: "AVAILABLE",
      // Maybe also include maintenance cycle check?
      // For now just list all AVAILABLE equipment
    },
    select: {
      id: true,
      name: true,
      model: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">新建预约</h2>
      </div>
      <div className="mx-auto max-w-4xl py-6">
        <Suspense fallback={<div>加载中...</div>}>
          <ReservationForm equipmentList={equipmentList} />
        </Suspense>
      </div>
    </div>
  );
}

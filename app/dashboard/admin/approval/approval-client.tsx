"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconShoppingCart,
  IconTrash,
  IconCalendarEvent,
} from "@tabler/icons-react";
import PurchaseListClient from "../purchase/purchase-list-client";
import ScrapListClient from "../scrap/scrap-list-client";
import { ReservationApprovalClient } from "./reservation-approval-client";

interface ApprovalClientProps {
  purchaseRequests: any[];
  scrapRequests: any[];
  reservationRequests: any[];
  userRole: Role;
  userId: string;
}

export default function ApprovalClient({
  purchaseRequests,
  scrapRequests,
  reservationRequests,
  userRole,
  userId,
}: ApprovalClientProps) {
  // Teachers can only approve student reservations
  const isTeacher = userRole === "TEACHER";
  // ADMIN 和 HEAD 可以看采购和报废
  const canSeePurchase = userRole === "ADMIN" || userRole === "HEAD";
  const canSeeScrap = userRole === "ADMIN" || userRole === "HEAD";

  return (
    <Tabs defaultValue="reservation" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="reservation" className="flex items-center gap-2">
          <IconCalendarEvent className="w-4 h-4" />
          设备预约
        </TabsTrigger>
        {canSeePurchase && (
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <IconShoppingCart className="w-4 h-4" />
            设备采购
          </TabsTrigger>
        )}
        {canSeeScrap && (
          <TabsTrigger
            value="scrap"
            className="flex items-center gap-2 text-destructive data-[active]:text-destructive"
          >
            <IconTrash className="w-4 h-4" />
            设备报废
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="reservation" className="space-y-4">
        <ReservationApprovalClient
          initialData={reservationRequests}
          userRole={userRole}
        />
      </TabsContent>

      {canSeePurchase && (
        <TabsContent value="purchase" className="space-y-4">
          <PurchaseListClient
            initialData={purchaseRequests}
            userRole={userRole}
            userId={userId}
          />
        </TabsContent>
      )}

      {canSeeScrap && (
        <TabsContent value="scrap" className="space-y-4">
          <ScrapListClient initialData={scrapRequests} userRole={userRole} />
        </TabsContent>
      )}
    </Tabs>
  );
}

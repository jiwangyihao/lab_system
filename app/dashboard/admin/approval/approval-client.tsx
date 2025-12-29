"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconShoppingCart, IconTrash } from "@tabler/icons-react";
import PurchaseListClient from "../purchase/purchase-list-client";
import ScrapListClient from "../scrap/scrap-list-client";

interface ApprovalClientProps {
  purchaseRequests: any[];
  scrapRequests: any[];
  userRole: Role;
}

export default function ApprovalClient({
  purchaseRequests,
  scrapRequests,
  userRole,
}: ApprovalClientProps) {
  // ADMIN 和 HEAD 可以看所有，TEACHER 通常只能看采购（作为申请人）
  const canSeeScrap = userRole === "ADMIN" || userRole === "HEAD";

  return (
    <Tabs defaultValue="purchase" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="purchase" className="flex items-center gap-2">
          <IconShoppingCart className="w-4 h-4" />
          设备采购
        </TabsTrigger>
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

      <TabsContent value="purchase" className="space-y-4">
        <PurchaseListClient
          initialData={purchaseRequests}
          userRole={userRole}
        />
      </TabsContent>

      {canSeeScrap && (
        <TabsContent value="scrap" className="space-y-4">
          <ScrapListClient initialData={scrapRequests} userRole={userRole} />
        </TabsContent>
      )}
    </Tabs>
  );
}

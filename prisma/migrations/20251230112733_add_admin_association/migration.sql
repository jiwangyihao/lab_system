-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "adminId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "targetAdminId" TEXT;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_targetAdminId_fkey" FOREIGN KEY ("targetAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN "conversationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_conversationId_key" ON "Dashboard"("conversationId");

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

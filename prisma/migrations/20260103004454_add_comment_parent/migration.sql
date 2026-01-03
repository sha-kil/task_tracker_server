-- AlterTable
ALTER TABLE "IssueComment" ADD COLUMN     "parentId" BIGINT;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IssueComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

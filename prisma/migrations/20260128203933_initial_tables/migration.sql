/*
  Warnings:

  - You are about to drop the column `statusId` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the `IssueStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_statusId_fkey";

-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "statusId",
ADD COLUMN     "projectBoardColumnItemId" BIGINT;

-- DropTable
DROP TABLE "IssueStatus";

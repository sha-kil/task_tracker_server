/*
  Warnings:

  - You are about to drop the column `projectBoardColumnId` on the `Issue` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_projectBoardColumnId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectBoardColumn" DROP CONSTRAINT "ProjectBoardColumn_projectBoardId_fkey";

-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "projectBoardColumnId";

-- CreateTable
CREATE TABLE "ProjectBoardColumnIssue" (
    "id" BIGSERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "projectBoardColumnId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "ProjectBoardColumnIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoardColumnIssue_issueId_key" ON "ProjectBoardColumnIssue"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoardColumnIssue_publicId_key" ON "ProjectBoardColumnIssue"("publicId");

-- AddForeignKey
ALTER TABLE "ProjectBoardColumn" ADD CONSTRAINT "ProjectBoardColumn_projectBoardId_fkey" FOREIGN KEY ("projectBoardId") REFERENCES "ProjectBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBoardColumnIssue" ADD CONSTRAINT "ProjectBoardColumnIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBoardColumnIssue" ADD CONSTRAINT "ProjectBoardColumnIssue_projectBoardColumnId_fkey" FOREIGN KEY ("projectBoardColumnId") REFERENCES "ProjectBoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

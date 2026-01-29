/*
  Warnings:

  - You are about to drop the `ProjectBoardColumnIssue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectBoardColumnIssue" DROP CONSTRAINT "ProjectBoardColumnIssue_issueId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectBoardColumnIssue" DROP CONSTRAINT "ProjectBoardColumnIssue_projectBoardColumnId_fkey";

-- DropTable
DROP TABLE "ProjectBoardColumnIssue";

-- CreateTable
CREATE TABLE "ProjectBoardColumnItem" (
    "id" BIGSERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "projectBoardColumnId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "ProjectBoardColumnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoardColumnItem_issueId_key" ON "ProjectBoardColumnItem"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoardColumnItem_publicId_key" ON "ProjectBoardColumnItem"("publicId");

-- AddForeignKey
ALTER TABLE "ProjectBoardColumnItem" ADD CONSTRAINT "ProjectBoardColumnItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBoardColumnItem" ADD CONSTRAINT "ProjectBoardColumnItem_projectBoardColumnId_fkey" FOREIGN KEY ("projectBoardColumnId") REFERENCES "ProjectBoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

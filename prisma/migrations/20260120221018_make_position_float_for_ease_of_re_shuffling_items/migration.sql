-- DropForeignKey
ALTER TABLE "IssueStatus" DROP CONSTRAINT "IssueStatus_projectBoardId_fkey";

-- AlterTable
ALTER TABLE "ProjectBoardColumn" ALTER COLUMN "position" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProjectBoardColumnIssue" ALTER COLUMN "position" SET DATA TYPE DOUBLE PRECISION;

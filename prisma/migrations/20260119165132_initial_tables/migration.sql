-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'GUEST');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('EPIC', 'STORY', 'TASK');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- CreateTable
CREATE TABLE "UserCredential" (
    "email" TEXT NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "addressId" BIGINT,
    "coverImageId" BIGINT,
    "department" TEXT,
    "firstName" TEXT NOT NULL DEFAULT '',
    "homePhone" TEXT,
    "id" BIGSERIAL NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastName" TEXT NOT NULL DEFAULT '',
    "organization" TEXT,
    "position" TEXT,
    "profilePictureId" BIGINT,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "teamId" BIGINT,
    "workPhone" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "assigneeId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "id" BIGSERIAL NOT NULL,
    "parentId" BIGINT,
    "priority" "IssuePriority" NOT NULL,
    "projectId" BIGINT NOT NULL,
    "projectBoardColumnId" BIGINT,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "startDate" TIMESTAMP(3),
    "statusId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueComment" (
    "authorId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" BIGSERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentId" BIGINT,

    CONSTRAINT "IssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "apartmentNumber" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "state" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueHistory" (
    "authorId" BIGINT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change" JSONB NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "IssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "description" TEXT NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLabel" (
    "color" TEXT NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "IssueLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBoard" (
    "id" BIGSERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" BIGINT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "ProjectBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBoardColumn" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectBoardId" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "ProjectBoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueStatus" (
    "color" TEXT,
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectBoardId" BIGINT,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),

    CONSTRAINT "IssueStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" BIGSERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "publicId" UUID NOT NULL DEFAULT uuidv7(),
    "s3Key" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" BIGINT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IssueToIssueLabel" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_IssueToIssueLabel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_IssueCommentLikes" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_IssueCommentLikes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectToTeam" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_ProjectToTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectToUserProfile" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_ProjectToUserProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_email_key" ON "UserCredential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_homePhone_key" ON "UserProfile"("homePhone");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_publicId_key" ON "UserProfile"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_workPhone_key" ON "UserProfile"("workPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_publicId_key" ON "Issue"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueComment_publicId_key" ON "IssueComment"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_publicId_key" ON "Address"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_publicId_key" ON "Team"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueHistory_publicId_key" ON "IssueHistory"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicId_key" ON "Project"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueLabel_publicId_key" ON "IssueLabel"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoard_publicId_key" ON "ProjectBoard"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBoardColumn_publicId_key" ON "ProjectBoardColumn"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueStatus_publicId_key" ON "IssueStatus"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueStatus_name_projectBoardId_key" ON "IssueStatus"("name", "projectBoardId");

-- CreateIndex
CREATE UNIQUE INDEX "File_publicId_key" ON "File"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "File_s3Key_key" ON "File"("s3Key");

-- CreateIndex
CREATE INDEX "_IssueToIssueLabel_B_index" ON "_IssueToIssueLabel"("B");

-- CreateIndex
CREATE INDEX "_IssueCommentLikes_B_index" ON "_IssueCommentLikes"("B");

-- CreateIndex
CREATE INDEX "_ProjectToTeam_B_index" ON "_ProjectToTeam"("B");

-- CreateIndex
CREATE INDEX "_ProjectToUserProfile_B_index" ON "_ProjectToUserProfile"("B");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_profilePictureId_fkey" FOREIGN KEY ("profilePictureId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_id_fkey" FOREIGN KEY ("id") REFERENCES "UserCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "IssueStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectBoardColumnId_fkey" FOREIGN KEY ("projectBoardColumnId") REFERENCES "ProjectBoardColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IssueComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLabel" ADD CONSTRAINT "IssueLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBoard" ADD CONSTRAINT "ProjectBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBoardColumn" ADD CONSTRAINT "ProjectBoardColumn_projectBoardId_fkey" FOREIGN KEY ("projectBoardId") REFERENCES "ProjectBoard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueStatus" ADD CONSTRAINT "IssueStatus_projectBoardId_fkey" FOREIGN KEY ("projectBoardId") REFERENCES "ProjectBoard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueToIssueLabel" ADD CONSTRAINT "_IssueToIssueLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueToIssueLabel" ADD CONSTRAINT "_IssueToIssueLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "IssueLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueCommentLikes" ADD CONSTRAINT "_IssueCommentLikes_A_fkey" FOREIGN KEY ("A") REFERENCES "IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueCommentLikes" ADD CONSTRAINT "_IssueCommentLikes_B_fkey" FOREIGN KEY ("B") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTeam" ADD CONSTRAINT "_ProjectToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTeam" ADD CONSTRAINT "_ProjectToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUserProfile" ADD CONSTRAINT "_ProjectToUserProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUserProfile" ADD CONSTRAINT "_ProjectToUserProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

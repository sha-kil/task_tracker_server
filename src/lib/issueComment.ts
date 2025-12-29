import prisma from "src/lib/prisma.js"

export async function getIssueComment(publicId: string) {
  return await prisma.issueComment.findUnique({
    where: { publicId },
  })
}

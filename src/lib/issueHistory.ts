import prisma from "src/lib/prisma.js"

export async function getIssueHistory(publicId: string) {
  return await prisma.issueHistory.findUnique({
    where: { publicId },
  })
}

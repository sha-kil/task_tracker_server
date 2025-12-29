import prisma from "src/lib/prisma.js"

export async function getIssueLabel(publicId: string) {
  return await prisma.issueLabel.findUnique({
    where: { publicId },
  })
}

import prisma from "src/lib/prisma.js"

export async function getIssue(publicId: string) {
  const issue = await prisma.issue.findUnique({
    where: { publicId },
  })

  return issue
}

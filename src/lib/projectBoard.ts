import prisma from "src/lib/prisma.js"

export async function getProjectBoard(publicId: string) {
  return await prisma.projectBoard.findUnique({
    where: { publicId },
  })
}

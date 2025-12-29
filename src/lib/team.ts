import prisma from "src/lib/prisma.js"

export async function getTeam(publicId: string) {
  return await prisma.team.findUnique({
    where: { publicId },
  })
}

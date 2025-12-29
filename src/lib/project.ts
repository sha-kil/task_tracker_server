import prisma from "src/lib/prisma.js"

export async function getProject(publicId: string) {
  return await prisma.project.findUnique({
    where: { publicId },
  })
}

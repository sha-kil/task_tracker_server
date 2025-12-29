import prisma from "src/lib/prisma.js"

export async function hasProjectAccess(userId: bigint, projectId: bigint) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      user: {
        some: { id: userId },
      },
    },
  })

  return project !== null
}

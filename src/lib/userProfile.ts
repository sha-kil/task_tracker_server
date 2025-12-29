import prisma from "src/lib/prisma.js"

export async function getUserProfile(publicId: string) {
  return await prisma.userProfile.findUnique({
    where: { publicId },
  })
}

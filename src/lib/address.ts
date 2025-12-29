import prisma from "src/lib/prisma.js"

export async function getAddress(publicId: string) {
  const address = await prisma.address.findUnique({
    where: { publicId },
  })

  return address
}

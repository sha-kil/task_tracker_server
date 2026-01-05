import prisma from "src/lib/prisma.js"
import { UserGETSchema } from "src/schema/user.js"

export async function userWithAddress(
  args: { userId: string },
  context: { userId?: bigint }
) {
  if (context.userId === undefined) {
    throw new Error("Unauthorized")
  }

  const userId = args.userId
  const userWithAddress = await prisma.userProfile.findUnique({
    where: {
      publicId: userId,
    },
    include: {
      userCredential: true,
      address: true,
      team: true,
    },
  })

  if (userWithAddress === null || userWithAddress.userCredential === null) {
    console.error("User not found for ID:", userId)
    throw new Error("User not found")
  }

  const { userCredential, address, team, ...rest } = userWithAddress
  const fetchedUser = {
    ...rest,
    id: rest.publicId,
    email: userCredential.email,
    lastActive: rest.lastActive.toISOString(),
    addressId: address ? address.publicId : null,
    teamId: team ? team.publicId : null,
  }

  const { data: user, success, error } = UserGETSchema.safeParse(fetchedUser)
  if (!success) {
    console.error("User data validation error:", error)
    throw new Error("Validation failed")
  }

  const response = {
    user: {
      addressId: user.addressId,
      coverImageUrl: user.coverImageUrl,
      department: user.department,
      email: userCredential.email,
      firstName: user.firstName,
      homePhone: user.homePhone,
      id: user.id,
      lastName: user.lastName,
      lastActive: user.lastActive,
      organization: user.organization,
      position: user.position,
      profilePictureUrl: user.profilePictureUrl,
      teamId: user.teamId ? user.teamId : null,
      workPhone: user.workPhone,
    },
    address: address
      ? {
          id: address.publicId,
          apartmentNumber: address.apartmentNumber,
          houseNumber: address.houseNumber,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
        }
      : null,
  }

  return response
}

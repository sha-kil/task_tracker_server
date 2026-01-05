import prisma from "src/lib/prisma.js"
import { UserGETSchema } from "src/schema/user.js"
import { z } from "zod"
import type { Request, Response } from "express"

export async function updateUserWithAddress(
  args: { inputData: any },
  context: { userId?: bigint; req: Request; res: Response }
) {
  if (context.userId === undefined) {
    throw new Error("Unauthorized")
  }

  const userId = args.inputData.id
  const userProfile = await prisma.userProfile.findUnique({
    where: { publicId: userId },
    include: {
      address: true,
      userCredential: true,
    },
  })

  if (userProfile === null) {
    console.error("User not found for ID:", userId)
    throw new Error("User not found")
  }

  if (context.userId !== userProfile.userCredential.id) {
    throw new Error("Forbidden")
  }

  const input = UserWithAddressSchema.safeParse(args.inputData)
  if (!input.success) {
    console.error("Invalid input data:", input.error)
    throw new Error("Invalid input data")
  }

  const {
    id,
    firstName,
    lastName,
    profilePictureUrl,
    position,
    department,
    organization,
    teamId,
    ...addressInput
  } = input.data

  const addressInputData = {
        ...(addressInput.apartmentNumber !== undefined && {
          apartmentNumber: addressInput.apartmentNumber,
        }),
        ...(addressInput.houseNumber !== undefined && {
          houseNumber: addressInput.houseNumber,
        }),
        ...(addressInput.street !== undefined && {
          street: addressInput.street,
        }),
        ...(addressInput.city !== undefined && {
          city: addressInput.city,
        }),
        ...(addressInput.state !== undefined && {
          state: addressInput.state,
        }),
        ...(addressInput.zipCode !== undefined && {
          zipCode: addressInput.zipCode,
        }),
        ...(addressInput.country !== undefined && {
          country: addressInput.country,
        }),
      }

  const hasAddressInput = Object.keys(addressInputData).length > 0
  if (userProfile.address !== null) {
    await prisma.address.update({
      where: { id: userProfile.address.id },
      data: addressInputData,
    })
  } else if (hasAddressInput) {
    throw new Error("Address data provided but no existing address found") 
  }

  const userWithAddress = await prisma.userProfile.update({
    where: {
      publicId: userId,
    },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
      ...(position !== undefined && { position }),
      ...(department !== undefined && { department }),
      ...(organization !== undefined && { organization }),
      ...(teamId !== undefined && {
        team: { connect: { publicId: teamId } },
      }),
      lastActive: new Date(),
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

const UserWithAddressSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    profilePictureUrl: z.url(),
    position: z.string(),
    department: z.string(),
    organization: z.string(),
    teamId: z.uuidv7(),
    apartmentNumber: z.string(),
    houseNumber: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  })
  .partial()
  .extend({
    id: z.uuidv7(),
  })

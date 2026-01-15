import prisma from "src/lib/prisma.js"
import { HttpError } from "src/lib/httpError.js"
import { UserGETSchema } from "src/schema/user.js"
import type { UserCredential, UserProfile } from "@prismaClient/client.js"
import { getFileUrlById } from "./file.js"

export async function getUserProfile(publicId: string) {
  return await prisma.userProfile.findUnique({
    where: { publicId },
  })
}

export async function getUserByCredentialId(userId: bigint) {
  const user = await prisma.userCredential.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          team: true,
          address: true,
          profilePicture: true,
          coverImage: true,
        },
      },
    },
  })

  if (user === null || user.profile === null) {
    throw new HttpError(404, "User not found")
  }

  const { profile, ...credential } = user
  const team = profile.team
  const address = profile.address
  let coverImageUrl: string | null = null
  if (profile.coverImage !== null) {
    coverImageUrl = await getFileUrlById(profile.coverImage.publicId)
  }
  let profilePictureUrl: string | null = null
  if (profile.profilePicture !== null) {
    profilePictureUrl = await getFileUrlById(profile.profilePicture.publicId)
  }

  try {
    return parseUser(
      credential,
      profile,
      address?.publicId ?? null,
      team?.publicId ?? null,
      coverImageUrl,
      profilePictureUrl
    )
  } catch (error) {
    throw new HttpError(500, "Failed to parse user data: " + error)
  }
}

export function parseUser(
  credential: UserCredential,
  profile: UserProfile,
  addressId: string | null,
  teamId: string | null,
  coverImageUrl: string | null,
  profilePictureUrl: string | null
) {
  const parsedUser = UserGETSchema.safeParse({
    addressId: addressId,
    coverImageUrl: coverImageUrl,
    department: profile.department,
    email: credential.email,
    firstName: profile.firstName,
    homePhone: profile.homePhone,
    id: profile.publicId,
    lastActive: profile.lastActive.toISOString(),
    lastName: profile.lastName,
    organization: profile.organization,
    position: profile.position,
    profilePictureUrl: profilePictureUrl,
    role: profile.role,
    teamId: teamId,
    workPhone: profile.workPhone,
  })

  if (!parsedUser.success) {
    throw new HttpError(500, parsedUser.error.message)
  }

  return parsedUser.data
}

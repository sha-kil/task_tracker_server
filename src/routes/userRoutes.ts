import express from "express"
import { getAddress } from "src/lib/address.js"
import prisma from "src/lib/prisma.js"
import { UserPATCHSchema } from "src/schema/user.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import { getUserByCredentialId, parseUser } from "src/lib/userProfile.js"
import { getFileUrlById } from "src/lib/file.js"

const router = express.Router()

// user is create in authRoutes.ts through registration

export async function getUserByProfilePublicId(publicId: string) {
  const userProfile = await prisma.userProfile.findUnique({
    where: { publicId },
    include: {
      userCredential: true,
      team: true,
      address: true,
      profilePicture: true,
      coverImage: true,
    },
  })

  if (userProfile === null || userProfile.userCredential === null) {
    throw new HttpError(404, "User not found")
  }

  const { userCredential, address, team, ...profile } = userProfile

  try {
    return parseUser(
      userCredential,
      profile,
      address?.publicId ?? null,
      team?.publicId ?? null,

      profile.coverImage
        ? await getFileUrlById(profile.coverImage.publicId)
        : null,
      profile.profilePicture
        ? await getFileUrlById(profile.profilePicture.publicId)
        : null
    )
  } catch (error) {
    throw new HttpError(500, "Failed to parse user data: " + error)
  }
}

router.get("/:userId", async (req, res) => {
  try {
    if (req.userId === undefined) throw new HttpError(403, "Unauthorized")
    await getUserByCredentialId(req.userId)

    if (req.params.userId === undefined)
      throw new HttpError(400, "User ID is undefined")
    const userData = await getUserByProfilePublicId(req.params.userId)
    res.json(userData)
  } catch (error: HttpError | unknown) {
    console.error(
      "Error fetching user: ",
      error instanceof Error ? error.message : error
    )
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to fetch user" })
  }
})

router.get("/", async (req, res) => {
  try {
    if (req.userId === undefined) throw new HttpError(403, "Unauthorized")
    const user = await getUserByCredentialId(req.userId)
    res.json(user)
  } catch (error: HttpError | unknown) {
    console.error(
      "Error fetching user: ",
      error instanceof Error ? error.message : error
    )
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to fetch user" })
  }
})

router.get("/project/:projectId", async (req, res) => {
  try {
    if (req.userId === undefined) throw new HttpError(403, "Unauthorized")
    await getUserByCredentialId(req.userId)

    if (req.params.projectId === undefined)
      throw new HttpError(400, "Project ID is undefined")
    const usersData = await prisma.userProfile.findMany({
      where: {
        project: {
          some: { publicId: req.params.projectId },
        },
      },
      include: {
        team: true,
        address: true,
        userCredential: true,
        profilePicture: true,
        coverImage: true,
      },
    })

    const responseData = []
    for (const userData of usersData) {
      const { userCredential, address, team, ...profile } = userData
      try {
        const parsedUser = parseUser(
          userCredential,
          profile,
          address?.publicId ?? null,
          team?.publicId ?? null,

          profile.coverImage
            ? await getFileUrlById(profile.coverImage.publicId)
            : null,
          profile.profilePicture
            ? await getFileUrlById(profile.profilePicture.publicId)
            : null
        )

        responseData.push(parsedUser)
      } catch (error) {
        console.error("Failed to parse user data: ", error)
        continue
      }
    }

    res.json(responseData)
  } catch (error: HttpError | unknown) {
    console.error("Error fetching users by project: ", error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to fetch users" })
  }
})

// Update user by ID
router.patch("/:userId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) throw new HttpError(403, "Unauthorized")
    await getUserByCredentialId(req.userId)

    if (req.params.userId === undefined)
      throw new HttpError(400, "User ID is undefined")

    const validatedUserInput = UserPATCHSchema.safeParse(req.body)
    if (!validatedUserInput.success) {
      throw new HttpError(400, "Invalid user data")
    }

    const address = validatedUserInput.data.addressId
      ? await getAddress(validatedUserInput.data.addressId)
      : null
    const team = validatedUserInput.data.teamId
      ? await prisma.team.findUnique({
          where: { publicId: validatedUserInput.data.teamId },
        })
      : null
    const profilePicture = validatedUserInput.data.profilePictureId
      ? await prisma.file.findUnique({
          where: { publicId: validatedUserInput.data.profilePictureId },
        })
      : null
    if (validatedUserInput.data.profilePictureId && !profilePicture) {
      throw new HttpError(404, "Profile picture file not found")
    }
    const coverImage = validatedUserInput.data.coverImageId
      ? await prisma.file.findUnique({
          where: { publicId: validatedUserInput.data.coverImageId },
        })
      : null
    if (validatedUserInput.data.coverImageId && !coverImage) {
      throw new HttpError(404, "Cover image file not found")
    }
    const currentProfile = await prisma.userProfile.findUnique({
      where: { publicId: req.params.userId },
    })
    if (currentProfile === null) {
      throw new HttpError(404, "User not found")
    }

    if (
      currentProfile.profilePictureId !== null &&
      profilePicture !== null &&
      currentProfile.profilePictureId !== profilePicture.id
    ) {
      // Delete old profile picture file record
      await prisma.file.delete({
        where: { id: currentProfile.profilePictureId },
      })
    }

    if (
      currentProfile.coverImageId !== null &&
      coverImage !== null &&
      currentProfile.coverImageId !== coverImage.id
    ) {
      // Delete old cover image file record
      await prisma.file.delete({
        where: { id: currentProfile.coverImageId },
      })
    }

    await prisma.userProfile.update({
      where: { publicId: req.params.userId },
      data: {
        ...(validatedUserInput.data.addressId !== undefined && {
          addressId: address?.id ?? null,
        }),
        ...(validatedUserInput.data.coverImageId !== undefined && {
          coverImageId: coverImage === null ? null : coverImage.id,
        }),
        ...(validatedUserInput.data.department !== undefined && {
          department: validatedUserInput.data.department,
        }),
        ...(validatedUserInput.data.firstName !== undefined && {
          firstName: validatedUserInput.data.firstName,
        }),
        ...(validatedUserInput.data.homePhone !== undefined && {
          homePhone: validatedUserInput.data.homePhone,
        }),
        ...(validatedUserInput.data.lastActive !== undefined && {
          lastActive: new Date(validatedUserInput.data.lastActive),
        }),
        ...(validatedUserInput.data.lastName !== undefined && {
          lastName: validatedUserInput.data.lastName,
        }),
        ...(validatedUserInput.data.organization !== undefined && {
          organization: validatedUserInput.data.organization,
        }),
        ...(validatedUserInput.data.position !== undefined && {
          position: validatedUserInput.data.position,
        }),
        ...(validatedUserInput.data.profilePictureId !== undefined && {
          profilePictureId: profilePicture === null ? null : profilePicture.id,
        }),
        ...(validatedUserInput.data.role !== undefined && {
          role: validatedUserInput.data.role,
        }),
        ...(validatedUserInput.data.teamId !== undefined && {
          teamId: team?.id ?? null,
        }),
        ...(validatedUserInput.data.workPhone !== undefined && {
          workPhone: validatedUserInput.data.workPhone,
        }),
      },
    })

    const updatedUserData = await getUserByProfilePublicId(req.params.userId)
    res.json(updatedUserData)
  } catch (error: HttpError | unknown) {
    console.error("Error updating user: ", error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to update user" })
  }
})

// Delete user by ID
router.delete("/", async (req, res) => {
  try {
    if (req.userId === undefined) throw new HttpError(403, "Unauthorized")

    // Delete UserCredential - will cascade to UserProfile
    await prisma.userCredential.delete({
      where: { id: req.userId },
    })

    res.status(204).send()
  } catch (error: HttpError | unknown) {
    console.error("Error deleting user: ", error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to delete user" })
  }
})

export default router

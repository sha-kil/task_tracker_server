import express from "express"
import { getAddress } from "src/lib/address.js"
import prisma from "src/lib/prisma.js"
import { UserGETSchema, UserPATCHSchema } from "src/schema/user.js"
import type { Request, Response } from "express"

const router = express.Router()

// user is create in authRoutes.ts through registration

export async function getUser(userId: bigint) {
  const user = await prisma.userCredential.findUnique({
    where: { id: userId },
    include: { profile: { include: { team: true, address: true } } },
  })

  if (user === null || user.profile === null) {
    return {
      success: false,
      data: null,
      error: "User not found",
    }
  }

  const profile = user.profile
  const team = user.profile.team
  const address = user.profile.address

  return UserGETSchema.safeParse({
    addressId: address?.publicId ?? null,
    coverImageUrl: profile.coverImageUrl,
    department: profile.department,
    email: user.email,
    firstName: profile.firstName,
    homePhone: profile.homePhone,
    id: profile.publicId,
    lastActive: profile.lastActive.toISOString(),
    lastName: profile.lastName,
    organization: profile.organization,
    position: profile.position,
    profilePictureUrl: profile.profilePictureUrl,
    teamId: team?.publicId ?? null,
    workPhone: profile.workPhone,
  })
}

export async function getUserByProfilePublicId(publicId: string) {
  const userProfile = await prisma.userProfile.findUnique({
    where: { publicId },
    include: { userCredential: true },
  })

  if (userProfile === null) {
    return null
  }

  return await getUser(userProfile.userCredential.id)
}

router.get("/:userId", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to get user")
    return res.status(403).json({ error: "Forbidden" })
  }

  const userIdParam = req.params.userId
  if (userIdParam === undefined) {
    console.error("User ID is required")
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    const userData = await getUserByProfilePublicId(userIdParam)
    if (!userData?.success || userData.data === null) {
      console.error("User not found: ", userData?.error)
      return res.status(404).json({ error: "User not found" })
    }

    res.json(userData.data)
  } catch (error) {
    console.error("Error fetching user: ", error)
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

// get current user
router.get("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to get current user")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const { success, data: user, error } = await getUser(req.userId)
    if (!success) {
      console.error("Error fetching current user: ", error)
      return res.status(500).json({ error: "Failed to fetch user" })
    }

    res.json(user)
  } catch (error) {
    console.error("Error fetching current user: ", error)
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

router.get("/project/:projectId", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to get users by project")
    return res.status(403).json({ error: "Forbidden" })
  }

  const projectId = req.params.projectId
  if (projectId === undefined) {
    console.error("Bad Request: Missing or invalid projectId query parameter")
    return res.status(400).json({
      error: "Bad Request: Missing or invalid projectId query parameter",
    })
  }

  try {
    const currentUser = await prisma.userCredential.findUnique({
      where: { id: req.userId },
      include: { profile: { include: { project: true } } },
    })

    if (
      currentUser === null ||
      currentUser.profile === null ||
      currentUser.profile.project === null
    ) {
      console.error("User profile or projects not found")
      return res.status(404).json({ error: "User not found" })
    }

    const usersData = await prisma.userProfile.findMany({
      where: {
        project: {
          some: { publicId: projectId },
        },
      },
      include: { team: true, address: true, userCredential: true },
    })

    const responseData = []

    for (const profile of usersData) {
      const team = profile.team
      const address = profile.address
      const parsedUser = UserGETSchema.safeParse({
        addressId: address?.publicId ?? null,
        coverImageUrl: profile.coverImageUrl,
        department: profile.department,
        email: profile.userCredential.email,
        firstName: profile.firstName,
        homePhone: profile.homePhone,
        id: profile.publicId,
        lastActive: profile.lastActive.toISOString(),
        lastName: profile.lastName,
        organization: profile.organization,
        position: profile.position,
        profilePictureUrl: profile.profilePictureUrl,
        teamId: team?.publicId ?? null,
        workPhone: profile.workPhone,
      })

      if (parsedUser.success) {
        responseData.push(parsedUser.data)
      }
    }

    res.json(responseData)
  } catch (error) {
    console.error("Error fetching users by project: ", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

// Update user by ID
router.patch("/:userId", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to update user")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const currentUser = await getUser(req.userId)
    if (!currentUser.success || currentUser.data === null) {
      console.error("Current user not found")
      return res.status(404).json({ error: "User not found" })
    }

    // Authorization check: ensure user can only update their own profile
    if (currentUser.data.id !== req.params.userId) {
      console.error(
        "Forbidden: User attempted to update another user's profile"
      )
      return res
        .status(403)
        .json({ error: "Forbidden: You can only update your own profile" })
    }

    const validatedUserInput = UserPATCHSchema.safeParse(req.body)
    if (!validatedUserInput.success) {
      console.error("Invalid user data: ", validatedUserInput.error)
      return res.status(400).json({ error: "Invalid user data" })
    }

    const address = validatedUserInput.data.addressId
      ? await getAddress(validatedUserInput.data.addressId)
      : null

    const { addressId, ...rest } = validatedUserInput.data
    const profileCreationData = {
      ...rest,
      ...(address !== null ? { addressId: address.id } : {}),
    }
    await prisma.userProfile.update({
      where: { publicId: currentUser.data.id },
      data: profileCreationData,
    })

    const updatedUserData = await getUserByProfilePublicId(req.params.userId)
    if (
      updatedUserData === null ||
      updatedUserData.data === null ||
      !updatedUserData.success
    ) {
      console.error("Error fetching updated user: ", updatedUserData?.error)
      return res.status(500).json({ error: "Failed to fetch updated user" })
    }

    res.json(updatedUserData.data)
  } catch (error) {
    console.error("Error updating user: ", error)
    res.status(500).json({ error: "Failed to update user" })
  }
})

// Delete user by ID
router.delete("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to delete user")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const userId = req.userId

    // Delete UserCredential - will cascade to UserProfile
    await prisma.userCredential.delete({
      where: { id: userId },
    })

    res.status(204).send()
  } catch (error) {
    console.error("Error deleting user: ", error)
    res.status(500).json({ error: "Failed to delete user" })
  }
})

export default router

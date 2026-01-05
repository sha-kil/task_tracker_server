import { Router } from "express"
import prisma from "src/lib/prisma.js"
import { getUserProfile } from "src/lib/userProfile.js"
import {
  AddressCreateSchema,
  AddressGETSchema,
  AddressUpdateSchema,
} from "src/schema/address.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"

const router = Router()

router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const addressCreationData = AddressCreateSchema.safeParse(req.body)
    if (!addressCreationData.success) {
      console.error(addressCreationData.error)
      return res.status(400).json({
        error: "Invalid address data",
      })
    }

    const user = await getUserProfile(addressCreationData.data.userId)
    if (user === null) {
      console.error("User not found:", addressCreationData.data.userId)
      return res.status(400).json({ error: "User not found" })
    }

    const { userId, ...addressData } = addressCreationData.data
    const { id, publicId, ...newAddress } = await prisma.address.create({
      data: {
        ...addressData,
        users: {
          connect: { id: user.id },
        },
      },
    })

    const responseData = AddressGETSchema.safeParse({
      ...newAddress,
      id: publicId,
    })

    if (!responseData.success) {
      console.error("Failed to parse created address:", responseData.error)
      return res.status(500).json({
        error: "Failed to parse created address",
      })
    }

    return res.status(201).json(responseData.data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/:id", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const addressData = await prisma.address.findUnique({
      where: { publicId: req.params.id },
    })

    if (addressData === null) {
      console.error("Address not found:", req.params.id)
      return res.status(404).json({ error: "Address not found" })
    }

    const responseData = AddressGETSchema.safeParse({
      ...addressData,
      id: addressData.publicId,
    })

    if (!responseData.success) {
      console.error("Failed to parse address:", responseData.error)
      return res.status(500).json({
        error: "Failed to parse address",
      })
    }

    res.json(responseData.data)
  } catch (error) {
    console.error("Error fetching address:", error)
    res.status(500).json({ error: "Failed to fetch address" })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const addressId = req.params.id
    if (addressId === undefined) {
      throw new HttpError(400, "Address ID is required")
    }

    const addressUpdateData = AddressUpdateSchema.safeParse(req.body)
    if (!addressUpdateData.success) {
      throw new HttpError(400, "Invalid address update data")
    }

    const filteredData = Object.fromEntries(
      Object.entries(addressUpdateData.data).filter(
        ([_, value]) => value !== undefined
      )
    )

    const { id, publicId, ...updatedAddress } = await prisma.address.update({
      where: { publicId: addressId, users: { some: { id: req.userId } } },
      data: filteredData,
    })

    const responseData = AddressGETSchema.safeParse({
      ...updatedAddress,
      id: publicId,
    })
    if (!responseData.success) {
      throw new HttpError(500, "Failed to parse updated address")
    }

    res.json(responseData.data)
  } catch (error: HttpError | unknown) {
    const showDetailedError = error instanceof HttpError
    console.error(showDetailedError ? error.message : error)
    res
      .status(showDetailedError ? error.statusCode : 500)
      .json(showDetailedError ? error.message : "Failed to update address")
  }
})

export default router

import bcrypt from "bcryptjs"
import express from "express"
import jwt from "jsonwebtoken"
import { env } from "src/config/env.js"
import prisma from "src/lib/prisma.js"
import { clearAuthCookie, setAuthCookie } from "src/lib/token.js"
import { UserCreateSchema } from "src/schema/user.js"
import { getUser } from "src/routes/userRoutes.js"
import type { Request, Response } from "express"
import { getAddress } from "src/lib/address.js"
import { getTeam } from "src/lib/team.js"

const router = express.Router()

const PASSWORD_SALT_ROUNDS = env.PASSWORD_SALT_ROUNDS

router.post("/register", async (req: Request, res: Response) => {
  const {
    success,
    data: userPostInput,
    error,
  } = UserCreateSchema.safeParse(req.body)
  if (!success) {
    console.error("User registration validation error:", error)
    return res.status(400).json({ error: "Invalid user data" })
  }

  try {
    const { email, password, ...profile } = userPostInput

    const address = profile.addressId
      ? await getAddress(profile.addressId)
      : null
    const team = profile.teamId ? await getTeam(profile.teamId) : null

    const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS)
    const { id } = await prisma.userCredential.create({
      data: {
        email,
        password: hashedPassword,
        profile: {
          create: {
            ...profile,
            addressId: address ? address.id : null,
            teamId: team ? team.id : null,
          },
        },
      },
    })

    const { success, error } = await getUser(id)
    if (!success) {
      return res
        .status(500)
        .json({ error: "Failed to fetch newly created user", details: error })
    }

    const token = jwt.sign({ id: String(id) }, env.JWT_SECRET, {
      expiresIn: "1h",
    })
    setAuthCookie(res, token)
  } catch (error) {
    console.error("Error during user registration:", error)
    return res.status(500).json({ error: "Failed to register user" })
  }
})

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    console.error("Email or password not provided")
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    const user = await prisma.userCredential.findUnique({
      where: { email },
    })

    if (user === null) {
      console.error("User not found during login attempt")
      return res.status(401).json({ error: "user does not exist" })
    }
    const passwordIsValid = await bcrypt.compare(password, user.password)
    if (!passwordIsValid) {
      console.error("Invalid password for user ID:", user.id)
      return res.status(401).json({ error: "Invalid credentials" })    }
    const { success, error, data: userData } = await getUser(user.id)
    if (!success) {
      return res
        .status(500)
        .json({ error: "Failed to fetch user data", details: error })
    }

    const token = jwt.sign({ id: String(user.id) }, env.JWT_SECRET, {
      expiresIn: "1h",
    })
    setAuthCookie(res, token)

    res.status(200).json(userData)
  } catch (error) {
    console.error("Error during user login:", error)
    res.status(500).json({ error: "Failed to login" })
  }
})

router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res)
  res.status(200).end()
})

export default router

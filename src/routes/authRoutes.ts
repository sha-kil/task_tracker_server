import bcrypt from "bcryptjs"
import express from "express"
import jwt from "jsonwebtoken"
import { env } from "src/config/env.js"
import prisma from "src/lib/prisma.js"
import { clearAuthCookie, setAuthCookie } from "src/lib/token.js"
import { UserCreateSchema } from "src/schema/user.js"
import type { Request, Response } from "express"
import { getAddress } from "src/lib/address.js"
import { getTeam } from "src/lib/team.js"
import { HttpError } from "src/lib/httpError.js"
import { getUserByCredentialId } from "src/lib/userProfile.js"

const router = express.Router()

const PASSWORD_SALT_ROUNDS = env.PASSWORD_SALT_ROUNDS

router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      success,
      data: userPostInput,
      error,
    } = UserCreateSchema.safeParse(req.body)
    if (!success) {
      throw new HttpError(400, "Invalid user data: " + error.message)
    }
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

    const token = jwt.sign({ id: String(id) }, env.JWT_SECRET, {
      expiresIn: "1h",
    })
    setAuthCookie(res, token)
    const userData = await getUserByCredentialId(id)
    res.status(201).json(userData)
  } catch (error: HttpError | unknown) {
    console.error("Error during user registration:", error)
    return res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({
        error:
          error instanceof HttpError
            ? error.message
            : "Failed to register user",
      })
  }
})

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      throw new HttpError(400, "Email and password are required")
    }
    const user = await prisma.userCredential.findUnique({
      where: { email },
    })

    if (user === null) {
      throw new HttpError(401, "User does not exist")
    }
    const passwordIsValid = await bcrypt.compare(password, user.password)
    if (!passwordIsValid) {
      throw new HttpError(401, "Invalid credentials")
    }
    const userData = await getUserByCredentialId(user.id)
    const token = jwt.sign({ id: String(user.id) }, env.JWT_SECRET, {
      expiresIn: "1h",
    })
    setAuthCookie(res, token)

    res.status(200).json(userData)
  } catch (error: HttpError | unknown) {
    console.error("Error during user login: ", error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error: error instanceof HttpError ? error.message : "Failed to login",
    })
  }
})

router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res)
  res.status(200).end()
})

export default router

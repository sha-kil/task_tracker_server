import bcrypt from "bcryptjs"
import express from "express"
import jwt from "jsonwebtoken"
import { env } from "src/config/env.js"
import prisma from "src/lib/prisma.js"
import { clearAuthCookie, setAuthCookie } from "src/lib/token.js"
import { UserCreateSchema } from "src/schema/user.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import { getUserByCredentialId } from "src/lib/userProfile.js"
import { Prisma } from "@prismaClient/client.js"

const router = express.Router()

const PASSWORD_SALT_ROUNDS = env.PASSWORD_SALT_ROUNDS

router.post("/register", async (req: Request, res: Response) => {
  try {
    if (req.userId) {
      throw new HttpError(400, "Logged in users cannot register new users")
    }

    const creationData = UserCreateSchema.safeParse(req.body)
    if (!creationData.success) {
      throw new HttpError(400, "Invalid user data")
    }

    const hashedPassword = await bcrypt.hash(
      creationData.data.password,
      PASSWORD_SALT_ROUNDS,
    )

    let newUser
    try {
      newUser = await prisma.userCredential.create({
        data: {
          email: creationData.data.email,
          password: hashedPassword,
          profile: {
            create: {
              firstName: creationData.data.firstName,
              lastName: creationData.data.lastName,
              project: {
                create: {
                  name: `${creationData.data.firstName}'s Project`,
                  description: `Default project for ${creationData.data.firstName}`,
                  projectBoard: {
                    create: {
                      name: "Default Board",
                      description: "This is your default project board",
                      columns: {
                        create: [
                          {
                            name: "To Do",
                            position: 1,
                          },
                          {
                            name: "In Progress",
                            position: 2,
                          },
                          { name: "Done", position: 3 },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          profile: true,
        },
      })
    } catch (createError: unknown) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        throw new HttpError(409, "Email already in use")
      }
      throw createError
    }

    const token = jwt.sign({ id: String(newUser.id) }, env.JWT_SECRET, {
      expiresIn: "1h",
    })
    setAuthCookie(res, token)
    const userData = await getUserByCredentialId(newUser.id)
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

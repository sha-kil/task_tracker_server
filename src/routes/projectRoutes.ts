import express, { type Request, type Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import { ProjectGETSchema, ProjectPOSTSchema } from "src/schema/project.js"

const router = express.Router()

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }
    const { userId } = req.params
    if (userId === undefined) {
      throw new HttpError(400, "User ID is required")
    }

    const projects = await prisma.project.findMany({
      where: {
        user: {
          some: {
            publicId: userId,
          },
        },
      },
      include: {
        projectBoard: true
      }
    })

    const responseData = projects.map((project) => {
      const { id, publicId, projectBoard, ...projectWithoutId } = project
      const parsedProject = ProjectGETSchema.safeParse({
        ...projectWithoutId,
        id: publicId,
        boards: projectBoard.map((board) => ({
          id: board.publicId,
          name: board.name,
          description: board.description,
        })),
      })
      if (!parsedProject.success) {
        console.error(
          "Error validating project data for response: ",
          parsedProject.error,
        )
        throw new HttpError(500, "Failed to process project data for response")
      }
      return parsedProject.data
    })

    res.status(200).json(responseData)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
  }
})

// Create a new project
router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create project")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const {
      success,
      data: projectPostData,
      error,
    } = ProjectPOSTSchema.safeParse(req.body)
    if (!success) {
      return res
        .status(400)
        .json({ error: "Invalid project data", details: error })
    }

    const { name, description } = projectPostData
    const newProject = await prisma.project.create({
      data: { name, description },
    })

    const { id, publicId, ...projectWithoutId } = newProject
    const responseData = ProjectGETSchema.safeParse({
      ...projectWithoutId,
      id: publicId,
    })

    if (!responseData.success) {
      console.error(
        "Error validating project data for response: ",
        responseData.error,
      )
      return res
        .status(500)
        .json({ error: "Failed to process project data for response" })
    }

    res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Error creating project: ", error)
    res.status(500).json({ error: "Failed to create project" })
  }
})

export default router

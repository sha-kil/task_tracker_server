import express, { type Request, type Response } from "express"
import { handleError } from "src/lib/handleError.js"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import {
  ProjectBoardColumnCreateSchema,
  ProjectBoardColumnGetSchema,
} from "src/schema/projectBoardColumn.js"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const parsedPostData = ProjectBoardColumnCreateSchema.safeParse(req.body)
    if (!parsedPostData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const postData = parsedPostData.data
    const projectBoard = await prisma.projectBoard.findUnique({
      where: {
        publicId: postData.projectBoardId,
        project: {
          user: {
            some: {
              userCredential: {
                id: req.userId,
              },
            },
          },
        },
      },
      include: { project: true },
    })
    if (projectBoard === null) {
      throw new HttpError(404, "Project board not found")
    }

    const newColumn = await prisma.projectBoardColumn.create({
      data: {
        name: postData.name,
        description: postData.description,
        projectBoardId: projectBoard.id,
        position: postData.position,
      },
    })

    res.status(201).json({
      id: newColumn.publicId,
      name: newColumn.name,
      description: newColumn.description,
      position: newColumn.position,
      projectBoardId: projectBoard.publicId,
    })
  } catch (error: HttpError | unknown) {
    console.error(
      error instanceof HttpError ? error.message : "Internal server error",
    )
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      message:
        error instanceof HttpError ? error.message : "Internal server error",
    })
  }
})

router.patch("/:columnId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const { columnId } = req.params
    if (columnId === undefined) {
      throw new HttpError(400, "Column ID is required")
    }

    const projectBoardColumn = await prisma.projectBoardColumn.findUnique({
      where: {
        publicId: columnId,
        projectBoard: {
          project: {
            user: {
              some: {
                userCredential: {
                  id: req.userId,
                },
              },
            },
          },
        },
      },
    })
    if (projectBoardColumn === null) {
      throw new HttpError(404, "Project board column not found")
    }

    const parsedUpdateData = ProjectBoardColumnCreateSchema.partial().safeParse(
      req.body,
    )
    if (!parsedUpdateData.success) {
      throw new HttpError(400, "Invalid request data")
    }
    const updateData = parsedUpdateData.data
    const updatedColumn = await prisma.projectBoardColumn.update({
      where: {
        id: projectBoardColumn.id,
      },
      data: {
        ...(updateData.name !== undefined ? { name: updateData.name } : {}),
        ...(updateData.description !== undefined
          ? { description: updateData.description }
          : {}),
        ...(updateData.position !== undefined
          ? { position: updateData.position }
          : {}),
      },
      include: {
        projectBoard: true,
      },
    })

    const responseDataParsed = ProjectBoardColumnGetSchema.safeParse({
      id: updatedColumn.publicId,
      name: updatedColumn.name,
      description: updatedColumn.description,
      position: updatedColumn.position,
      projectBoardId: updatedColumn.projectBoard.publicId,
    })
    if (!responseDataParsed.success) {
      console.error("Failed to parse response data: ", responseDataParsed.error)
      throw new HttpError(500, "Failed to parse response data")
    }

    res.status(200).json(responseDataParsed.data)
  } catch (error: HttpError | unknown) {
    console.error(
      error instanceof HttpError ? error.message : "Internal server error",
    )
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      message:
        error instanceof HttpError ? error.message : "Internal server error",
    })
  }
})

router.delete("/:columnId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const { columnId } = req.params
    if (columnId === undefined) {
      throw new HttpError(400, "Column ID is required")
    }

    const projectBoardColumn = await prisma.projectBoardColumn.findUnique({
      where: {
        publicId: columnId,
        projectBoard: {
          project: {
            user: {
              some: {
                userCredential: {
                  id: req.userId,
                },
              },
            },
          },
        },
      },
    })
    if (projectBoardColumn === null) {
      throw new HttpError(404, "Project board column not found")
    }
    // delete column and its items atomically
    await prisma.$transaction([
      prisma.projectBoardColumnItem.deleteMany({
        where: {
          projectBoardColumnId: projectBoardColumn.id,
        },
      }),
      prisma.projectBoardColumn.delete({
        where: {
          id: projectBoardColumn.id,
        },
      }),
    ])
    res.status(204).send()
  } catch(error: HttpError | unknown) {
    return handleError(error, res)
  }
})

export default router

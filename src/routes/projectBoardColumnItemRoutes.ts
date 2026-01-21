import express, { type Request, type Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import {
  ProjectBoardColumnItemCreateSchema,
  ProjectBoardColumnItemUpdateSchema,
} from "src/schema/projectBoardColumnItem.js"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const parsedPostData = ProjectBoardColumnItemCreateSchema.safeParse(
      req.body,
    )
    if (!parsedPostData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const postData = parsedPostData.data
    const issue = await prisma.issue.findUnique({
      where: { publicId: postData.issueId },
      include: { project: true },
    })

    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const projectBoardColumn = await prisma.projectBoardColumn.findUnique({
      where: { publicId: postData.projectBoardColumnId },
      include: { projectBoard: { include: { project: true } } },
    })

    if (projectBoardColumn === null) {
      throw new HttpError(404, "Project board column not found")
    }

    // Verify issue and column belong to the same project
    if (issue.projectId !== projectBoardColumn.projectBoard.projectId) {
      throw new HttpError(
        400,
        "Issue and board column must belong to the same project",
      )
    }

    // Verify user has permission to modify this project
    const project = await prisma.project.findFirst({
      where: {
        id: issue.projectId,
        user: {
          some: {
            userCredential: {
              id: req.userId,
            },
          },
        },
      },
    })

    if (project === null) {
      throw new HttpError(403, "Forbidden")
    }

    const newBoardItem = await prisma.projectBoardColumnItem.create({
      data: {
        issueId: issue.id,
        position: postData.position,
        projectBoardColumnId: projectBoardColumn.id,
      },
    })

    res.status(201).json({ id: newBoardItem.publicId })
  } catch (error: HttpError | unknown) {
    console.error(error instanceof Error ? error.message : error)
    const statusCode = error instanceof HttpError ? error.statusCode : 500
    const message =
      error instanceof HttpError ? error.message : "Internal Server Error"
    res.status(statusCode).json({ message })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const itemId = req.params.id
    if (itemId === undefined) {
      throw new HttpError(400, "Invalid request data")
    }

    const parsedPatchData = ProjectBoardColumnItemUpdateSchema.safeParse(
      req.body,
    )
    if (!parsedPatchData.success) {
      throw new HttpError(400, "Invalid request data")
    }
    const patchData = parsedPatchData.data
    const boardItem = await prisma.projectBoardColumnItem.findUnique({
      where: { publicId: itemId },
      include: {
        projectBoardColumn: {
          include: {
            projectBoard: { include: { project: true } },
          },
        },
      },
    })
    if (boardItem === null) {
      throw new HttpError(404, "Project board item not found")
    }

    const projectBoardColumn = await prisma.projectBoardColumn.findUnique({
      where: { publicId: patchData.projectBoardColumnId },
      include: { projectBoard: true },
    })

    if (projectBoardColumn === null) {
      throw new HttpError(404, "Project board column not found")
    }

    // Verify user has permission to modify this project
    const projectId = boardItem.projectBoardColumn.projectBoard.projectId
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: {
          some: {
            userCredential: {
              id: req.userId,
            },
          },
        },
      },
    })

    if (project === null) {
      throw new HttpError(403, "Forbidden")
    }

    // Verify both columns belong to the same project board
    if (
      boardItem.projectBoardColumn.projectBoardId !==
      projectBoardColumn.projectBoardId
    ) {
      throw new HttpError(
        400,
        "Cannot move item to a column in a different board",
      )
    }

    await prisma.projectBoardColumnItem.update({
      where: { publicId: itemId },
      data: {
        position: patchData.position,
        projectBoardColumnId: projectBoardColumn.id,
      },
    })

    res.sendStatus(200)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof Error ? error.message : error)
    const statusCode = error instanceof HttpError ? error.statusCode : 500
    const message =
      error instanceof HttpError ? error.message : "Internal Server Error"
    res.status(statusCode).send({ message })
  }
})

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const itemId = req.params.id
    if (itemId === undefined) {
      throw new HttpError(400, "Invalid request data")
    }

    const boardItem = await prisma.projectBoardColumnItem.findUnique({
      where: { publicId: itemId },
      include: {
        projectBoardColumn: {
          include: {
            projectBoard: { include: { project: true } },
          },
        },
      },
    })

    if (boardItem === null) {
      throw new HttpError(404, "Project board item not found")
    }

    // Verify user has permission to delete this item
    const projectId = boardItem.projectBoardColumn.projectBoard.projectId
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: {
          some: {
            userCredential: {
              id: req.userId,
            },
          },
        },
      },
    })

    if (project === null) {
      throw new HttpError(403, "Not authorized to delete this board item")
    }

    await prisma.projectBoardColumnItem.delete({
      where: { publicId: itemId },
    })

    res.sendStatus(204)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof Error ? error.message : error)
    const statusCode = error instanceof HttpError ? error.statusCode : 500
    const message =
      error instanceof HttpError ? error.message : "Internal Server Error"
    res.status(statusCode).send({ message })
  }
})

export default router

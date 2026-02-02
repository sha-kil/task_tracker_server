import type { ProjectBoardColumn } from "@prismaClient/client.js"
import express, { type Request, type Response } from "express"
import { handleError } from "src/lib/handleError.js"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import {
  ProjectBoardColumnItemAssigneeSchema,
  ProjectBoardColumnItemCreateSchema,
  ProjectBoardColumnItemGetSchema,
  ProjectBoardColumnItemUpdateSchema,
} from "src/schema/projectBoardColumnItem.js"

const router = express.Router()

router.get("/", async (req: Request, res: Response) => {
  try {
    const issueId = req.query.issueId
    if (typeof issueId !== "string") {
      throw new HttpError(400, "Invalid request data")
    }

    const issue = await prisma.issue.findUnique({
      where: { publicId: issueId },
      include: { project: true },
    })
    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const boardItem = await prisma.projectBoardColumnItem.findUnique({
      where: { issueId: issue.id },
      include: {
        projectBoardColumn: true,
        issue: {
          include: {
            assignee: {
              include: { userCredential: true },
            },
          },
        },
      },
    })
    if (boardItem === null) {
      throw new HttpError(404, "Project board column item not found")
    }

    const assignee = boardItem.issue.assignee
      ? ProjectBoardColumnItemAssigneeSchema.safeParse({
          id: boardItem.issue.assignee.publicId,
          name:
            boardItem.issue.assignee.firstName +
            " " +
            boardItem.issue.assignee.lastName,
          email: boardItem.issue.assignee.userCredential.email,
        })
      : null

    if (assignee !== null && !assignee.success) {
      throw new HttpError(500, "Failed to parse assignee data")
    }

    const parsedResponse = ProjectBoardColumnItemGetSchema.safeParse({
      assignee: assignee?.data ?? null,
      description: boardItem.issue.description,
      dueDate: boardItem.issue.dueDate?.toISOString() ?? null,
      id: boardItem.publicId,
      issueId: issue.publicId,
      title: boardItem.issue.title,
      position: boardItem.position,
    })

    if (!parsedResponse.success) {
      throw new HttpError(500, "Failed to parse response data")
    }

    res.status(200).json(parsedResponse.data)  } catch (error: HttpError | unknown) {
    return handleError(error, res)
  }
})

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

    const projectBoard = await prisma.projectBoard.findUnique({
      where: { publicId: postData.projectBoardId },
      include: { project: true },
    })
    if (projectBoard === null) {
      throw new HttpError(404, "Project board not found")
    }

    let projectBoardColumn: ProjectBoardColumn | null = null
    if (postData.projectBoardColumnId !== null) {
      projectBoardColumn = await prisma.projectBoardColumn.findUnique({
        where: { publicId: postData.projectBoardColumnId },
      })
      if (projectBoardColumn === null) {
        throw new HttpError(404, "Project board column not found")
      }
    } else {
      // If no column ID is provided, default to the first column of the board
      const columns = await prisma.projectBoardColumn.findMany({
        where: { projectBoardId: projectBoard.id },
      })
      if (columns.length < 1) {
        throw new HttpError(400, "Project board has no columns")
      }
      columns.sort((a, b) => a.position - b.position)
      const column = columns[0]
      if (column === undefined) {
        throw new HttpError(400, "Project board has no columns")
      }
      projectBoardColumn = column
    }

    // Verify issue and board belong to the same project
    if (issue.projectId !== projectBoard.projectId) {
      throw new HttpError(
        400,
        "Issue and project board must belong to the same project",
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

    const position = postData.position ?? 1
    await prisma.$transaction(async (prisma) => {
      // Shift positions of existing items in the column
      const newBoardItem = await prisma.projectBoardColumnItem.create({
        data: {
          issueId: issue.id,
          position,
          projectBoardColumnId: projectBoardColumn.id,
        },
        include: {
          issue: {
            include: {
              assignee: {
                include: { userCredential: true },
              },
            },
          },
        },
      })

      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          projectBoardColumnItemId: newBoardItem.id,
        },
      })

      const parsedAssignee = newBoardItem.issue.assignee
        ? ProjectBoardColumnItemAssigneeSchema.safeParse({
            id: newBoardItem.issue.assignee.publicId,
            name:
              newBoardItem.issue.assignee.firstName +
              " " +
              newBoardItem.issue.assignee.lastName,
            email: newBoardItem.issue.assignee.userCredential.email,
          })
        : null
      if (parsedAssignee !== null && !parsedAssignee.success) {
        console.error("Failed to parse assignee data:", parsedAssignee.error)
        throw new HttpError(500, "Failed to parse assignee data")
      }
      const responseData = ProjectBoardColumnItemGetSchema.safeParse({
        assignee: parsedAssignee?.data ?? null,
        description: newBoardItem.issue.description,
        dueDate: newBoardItem.issue.dueDate?.toISOString() ?? null,
        id: newBoardItem.publicId,
        issueId: issue.publicId,
        title: newBoardItem.issue.title,
        position: newBoardItem.position,
      })
      if (!responseData.success) {
        console.error("Failed to parse response data:", responseData.error)
        throw new HttpError(500, "Failed to parse response data")
      }

      res.status(201).json(responseData.data)
    })

    throw new HttpError(500, "Transaction failed to complete")
  } catch (error: HttpError | unknown) {
    return handleError(error, res)
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

router.delete("/", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const issueId = req.query.issueId
    if (issueId === undefined || typeof issueId !== "string") {
      throw new HttpError(400, "Invalid request data")
    }

    const issue = await prisma.issue.findUnique({
      where: { publicId: issueId },
    })
    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const boardItem = await prisma.projectBoardColumnItem.findUnique({
      where: { issueId: issue.id },
    })
    if (boardItem === null) {
      throw new HttpError(404, "Project board column item not found")
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

    await prisma.$transaction(async (prisma) => {
      await prisma.projectBoardColumnItem.delete({
        where: { publicId: boardItem.publicId },
      })

      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          projectBoardColumnItemId: null,
        },
      })
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

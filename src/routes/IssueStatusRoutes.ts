import { Router } from "express"
import prisma from "src/lib/prisma.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import { handleError } from "src/lib/handleError.js"

const router = Router()

router.get("/:issueId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const issueId = req.params.issueId
    if (issueId === undefined || issueId.trim() === "") {
      throw new HttpError(400, "Missing or invalid issue ID")
    }

    const issue = await prisma.issue.findUnique({
      where: {
        publicId: issueId,
      },
      include: {
        project: {
          include: {
            projectBoard: {
              include: {
                columns: true,
              },
            },
          },
        },
      },
    })

    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const projectBoardColumnItemId = issue?.projectBoardColumnItemId
    if (
      projectBoardColumnItemId === null ||
      projectBoardColumnItemId === undefined
    ) {
      return res.status(200).json({ options: [], current: null })
    }
    const projectBoard = await prisma.projectBoard.findFirst({
      where: {
        columns: {
          some: {
            columnIssues: {
              some: {
                id: projectBoardColumnItemId,
              },
            },
          },
        },
      },
      include: {
        columns: {
          include: {
            columnIssues: true
          }
        },
      },
    })
    if (projectBoard === null) {
      return res.status(200).json({ options: [], current: null }) 
    }
    const columns = projectBoard.columns
    const current = columns.find(
      (column) => column.columnIssues.some(issue => issue.id === projectBoardColumnItemId),
    )
    if (current === undefined) {
      throw new HttpError(400, "Invalid current status")
    }
    const options = columns.sort((a, b) => a.position - b.position).map((column) => {
      return {
        id: column.publicId,
        name: column.name,
        projectBoardId: projectBoard.publicId,
      }
    })

    return res.status(200).json({
      options,
      current: {
        id: current.publicId,
        name: current.name,
        projectBoardId: projectBoard.publicId,
      },
    })
  } catch (error: HttpError | unknown) {
    handleError(error, res)
  }
})

router.patch("/:issueId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const issueId = req.params.issueId
    if (issueId === undefined || issueId.trim() === "") {
      throw new HttpError(400, "Missing or invalid issue ID")
    }
    const { statusOptionId } = req.body
    if (
      statusOptionId === undefined ||
      typeof statusOptionId !== "string" ||
      statusOptionId.trim() === ""
    ) {
      throw new HttpError(400, "Missing or invalid status option ID")
    }

    const issue = await prisma.issue.findUnique({
      where: {
        publicId: issueId,
      },
    })
    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const projectBoardColumnItemId = issue.projectBoardColumnItemId
    if (
      projectBoardColumnItemId === null ||
      projectBoardColumnItemId === undefined
    ) {
      throw new HttpError(400, "Issue has no status to update")
    }

    const projectBoardColumnItem =
      await prisma.projectBoardColumnItem.findFirst({
        where: {
          id: projectBoardColumnItemId,
        },
        include: {
          projectBoardColumn: true,
        },
      })
    if (projectBoardColumnItem === null) {
      throw new HttpError(400, "Invalid project board column item")
    }

    const projectBoardColumn = await prisma.projectBoardColumn.findFirst({
      where: {
        publicId: statusOptionId,
      },
    })
    if (projectBoardColumn === null) {
      throw new HttpError(400, "Invalid status option ID")
    }

    // Validate that the target column belongs to the same project board
    if (
      projectBoardColumnItem.projectBoardColumn.projectBoardId !==
      projectBoardColumn.projectBoardId
    ) {
      throw new HttpError(
        400,
        "Invalid status option ID for this project board",
      )
    }

    await prisma.projectBoardColumnItem.update({
      where: {
        id: projectBoardColumnItem.id,
      },
      data: {
        projectBoardColumnId: projectBoardColumn.id,
      },
    })

    const projectBoard = await prisma.projectBoard.findFirst({
      where: {
        columns: {
          some: {
            columnIssues: {
              some: {
                id: projectBoardColumnItemId,
              },
            },
          },
        },
      },
      include: {
        columns: {
          include: {
            columnIssues: true
          }
        },
      },
    })
    if (projectBoard === null) {
      return res.status(200).json({ options: [], current: null })
    }

    const columns = projectBoard.columns
    const current = columns.find(
      (column) => column.columnIssues.some(issue => issue.id === projectBoardColumnItemId),
    )
    if (current === undefined) {
      throw new HttpError(400, "Invalid current status")
    }
    const options = columns.sort((a, b) => a.position - b.position).map((column) => {
      return {
        id: column.publicId,
        name: column.name,
        projectBoardId: projectBoard.publicId,
      }
    })

    return res.status(200).json({
      options,
      current: {
        id: current.publicId,
        name: current.name,
        projectBoardId: projectBoard.publicId,
      },
    })
  } catch (error: HttpError | unknown) {
    handleError(error, res)
  }
})

export default router

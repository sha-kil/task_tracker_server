import express, { type Request, type Response } from "express"
import { handleError } from "src/lib/handleError.js"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import {
  ProjectBoardColumnSchema,
  ProjectBoardCreateSchema,
  ProjectBoardGETSchema,
  ProjectBoardUpdateSchema,
} from "src/schema/projectBoard.js"
import {
  ProjectBoardColumnItemAssigneeSchema,
  ProjectBoardColumnItemGetSchema,
} from "src/schema/projectBoardColumnItem.js"
import type z from "zod"

const router = express.Router()

router.get("/", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const projectId = req.query.projectId
    if (projectId === undefined || typeof projectId !== "string") {
      throw new HttpError(400, "Project ID is undefined or invalid")
    }

    const project = await prisma.project.findUnique({
      where: {
        publicId: projectId,
        user: { some: { userCredential: { id: req.userId } } },
      },
    })
    if (project === null) {
      throw new HttpError(404, "Project not found")
    }

    const projectBoards = await prisma.projectBoard.findMany({
      where: { projectId: project.id },
    })

    const responseData = await Promise.all(projectBoards.map(async (board) => {
      const projectBoard = await getProjectBoardById(board.publicId)
      return projectBoard
    }))

    res.json(responseData)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
  }
})

router.get("/by-issue/:issueId", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const issueId = req.params.issueId
    if (issueId === undefined) {
      throw new HttpError(400, "Issue ID is undefined")
    }

    const issue = await prisma.issue.findUnique({
      where: { publicId: issueId },
    })
    if (issue === null) {
      throw new HttpError(404, "Issue not found")
    }

    const boardColumnItem = await prisma.projectBoardColumnItem.findUnique({
      where: { issueId: issue.id },
      include: {
        projectBoardColumn: {
          include: {
            projectBoard: true,
          },
        },
      },
    })
    if (boardColumnItem === null) {
      return res.status(200).json(null)
    }

    const projectBoard = await getProjectBoardById(
      boardColumnItem.projectBoardColumn.projectBoard.publicId,
    )
    res.status(200).json(projectBoard)
  } catch (error: HttpError | unknown) {
    return handleError(error, res)
  }
})

router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const projectBoardId = req.params.id
    if (projectBoardId === undefined) {
      throw new HttpError(400, "Project Board ID is undefined")
    }

    const projectBoard = await getProjectBoardById(projectBoardId)
    res.json(projectBoard)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
  }
})

router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create project board")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const projectBoardPostData = ProjectBoardCreateSchema.safeParse(req.body)
    if (!projectBoardPostData.success) {
      console.error("Invalid project board data: ", projectBoardPostData.error)
      return res.status(400).json({
        error: "Invalid project board data",
      })
    }

    const project = await prisma.project.findUnique({
      where: { publicId: projectBoardPostData.data.projectId },
    })

    if (project === null) {
      console.error("Project not found: ", projectBoardPostData.data.projectId)
      return res.status(404).json({ error: "Project not found" })
    }

    const { description, name } = projectBoardPostData.data
    const newProjectBoard = await prisma.projectBoard.create({
      data: { description, name, projectId: project.id },
    })

    const responseData = await getProjectBoardById(newProjectBoard.publicId)
    res.status(201).json(responseData)
  } catch (error) {
    console.error("Error creating project board: ", error)
    res.status(500).json({ error: "Failed to create project board" })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const projectBoardId = req.params.id
    if (projectBoardId === undefined) {
      throw new HttpError(400, "Project Board ID is undefined")
    }

    const projectBoardUpdateParsedResult = ProjectBoardUpdateSchema.safeParse(
      req.body,
    )
    if (!projectBoardUpdateParsedResult.success) {
      console.error(
        "Invalid project board update data: ",
        projectBoardUpdateParsedResult.error,
      )
      throw new HttpError(400, "Invalid project board update data")
    }

    const updatedData = projectBoardUpdateParsedResult.data

    // Update column issues positions in a transaction
    await prisma.$transaction(async (tx) => {
      for (const column of updatedData.columns) {
        // Update column itself
        const columnData = await tx.projectBoardColumn.update({
          where: { publicId: column.id },
          data: {
            name: column.name,
            position: column.position,
          },
        })

        // Update issue positions within the column
        for (const [index, issue] of column.issues.entries()) {
          await tx.projectBoardColumnItem.update({
            where: {
              publicId: issue.id,
            },
            data: {
              position: index,
              projectBoardColumnId: columnData.id,
            },
          })
        }
      }
    })

    const updatedProjectBoard = await prisma.projectBoard.update({
      where: { publicId: projectBoardId },
      data: {
        ...(updatedData.description !== undefined && {
          description: updatedData.description,
        }),
        ...(updatedData.name !== undefined && { name: updatedData.name }),
      },
    })

    const responseData = await getProjectBoardById(updatedProjectBoard.publicId)
    res.json(responseData)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
  }
})

async function getProjectBoardById(
  projectBoardId: string,
): Promise<z.infer<typeof ProjectBoardGETSchema>> {
  const projectBoard = await prisma.projectBoard.findUnique({
    where: { publicId: projectBoardId },
    include: {
      project: true,
      columns: {
        include: {
          columnIssues: {
            include: {
              issue: {
                include: {
                  assignee: {
                    include: {
                      userCredential: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  if (projectBoard === null) {
    throw new HttpError(404, "Project Board not found")
  }

  const project = projectBoard.project
  if (project === null || project === undefined) {
    throw new HttpError(404, "Project not found")
  }

  const { description, name, publicId } = projectBoard

  const columns: z.infer<typeof ProjectBoardColumnSchema>[] = []
  for (const column of projectBoard.columns) {
    const issues: z.infer<typeof ProjectBoardColumnItemGetSchema>[] = []
    for (const issue of column.columnIssues) {
      const issueAssignee = issue.issue.assignee
      const parsedAssigneeResult =
        issueAssignee !== null
          ? ProjectBoardColumnItemAssigneeSchema.safeParse({
              id: issueAssignee.publicId,
              name: issueAssignee.firstName + " " + issueAssignee.lastName,
              email: issueAssignee.userCredential.email,
            })
          : null

      let assignee = null
      if (parsedAssigneeResult !== null) {
        if (!parsedAssigneeResult.success) {
          throw new HttpError(
            500,
            "Failed to parse assignee data: " +
              parsedAssigneeResult.error.message,
          )
        }
        assignee = parsedAssigneeResult.data
      }
      const parsedIssueResult = ProjectBoardColumnItemGetSchema.safeParse({
        id: issue.publicId,
        title: issue.issue.title,
        description: issue.issue.description,
        position: issue.position,
        issueId: issue.issue.publicId,
        assignee: assignee,
        dueDate: issue.issue.dueDate?.toISOString() ?? null,
      })

      if (!parsedIssueResult.success) {
        throw new HttpError(
          500,
          "Failed to parse project board issue data: " +
            parsedIssueResult.error.message,
        )
      }

      issues.push(parsedIssueResult.data)
    }
    issues.sort((a, b) => a.position - b.position)

    const parsedColumnResult = ProjectBoardColumnSchema.safeParse({
      id: column.publicId,
      name: column.name,
      position: column.position,
      issues,
    })

    if (!parsedColumnResult.success) {
      throw new HttpError(
        500,
        "Failed to parse project board column data: " +
          parsedColumnResult.error.message,
      )
    }

    columns.push(parsedColumnResult.data)
  }
  columns.sort((a, b) => a.position - b.position)

  const parsedBoard = ProjectBoardGETSchema.safeParse({
    id: publicId,
    description: description,
    name: name,
    projectId: project.publicId,
    columns,
  })
  if (!parsedBoard.success) {
    throw new HttpError(
      500,
      "Failed to parse project board data: " + parsedBoard.error.message,
    )
  }

  return parsedBoard.data
}

export default router

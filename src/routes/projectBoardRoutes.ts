import express, { type Request, type Response } from "express"
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
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const responseData = projectBoards.map((board) => {
      const columns = board.columns.map((column) => {
        const issues = column.columnIssues.map((columnIssue) => {
          const parsedAssigneeResult =
            columnIssue.issue.assignee !== null
              ? ProjectBoardColumnItemAssigneeSchema.safeParse({
                  id: columnIssue.issue.assignee.publicId,
                  name:
                    columnIssue.issue.assignee.firstName +
                    " " +
                    columnIssue.issue.assignee.lastName,
                  email: columnIssue.issue.assignee.userCredential.email,
                })
              : null

          const parsedIssueData = ProjectBoardColumnItemGetSchema.safeParse({
            id: columnIssue.publicId,
            issueId: columnIssue.issue.publicId,
            title: columnIssue.issue.title,
            description: columnIssue.issue.description,
            status: columnIssue.issue.status.name,
            assignee:
              parsedAssigneeResult !== null && parsedAssigneeResult.success
                ? {
                    id: parsedAssigneeResult.data.id,
                    name: parsedAssigneeResult.data.name,
                    email: parsedAssigneeResult.data.email,
                  }
                : null,
            dueDate: columnIssue.issue.dueDate,
            position: columnIssue.position,
          })
          if (!parsedIssueData.success) {
            console.error("Error parsing issue data: ", parsedIssueData.error)
            throw new HttpError(500, "Failed to parse issue data")
          }

          return parsedIssueData.data
        })
        issues.sort((a, b) => a.position - b.position)
        const parsedColumnData = ProjectBoardColumnSchema.safeParse({
          id: column.publicId,
          name: column.name,
          position: column.position,
          issues,
        })
        if (!parsedColumnData.success) {
          console.error("Error parsing column data: ", parsedColumnData.error)
          throw new HttpError(500, "Failed to parse column data")
        }

        return parsedColumnData.data
      })

      columns.sort((a, b) => a.position - b.position)
      const parsedBoard = ProjectBoardGETSchema.safeParse({
        id: board.publicId,
        description: board.description,
        name: board.name,
        projectId: board.project.publicId,
        columns,
      })
      if (!parsedBoard.success) {
        console.error("Error parsing project board: ", parsedBoard.error)
        throw new HttpError(500, "Failed to parse project board data")
      }
      return parsedBoard.data
    })

    res.json(responseData)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
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
                    status: true,
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

    const project = await prisma.project.findUnique({
      where: { id: projectBoard.projectId },
      include: {
        user: {
          where: {
            userCredential: { id: req.userId },
          },
        },
      },
    })
    if (project === null) {
      throw new HttpError(404, "Project not found")
    }

    const { description, name, publicId, columns } = projectBoard

    const parsedBoard = ProjectBoardGETSchema.safeParse({
      id: publicId,
      description: description,
      name: name,
      projectId: project.publicId,
      columns: columns
        .map((column) => {
          return {
            id: column.publicId,
            name: column.name,
            position: column.position,
            issues: column.columnIssues
              .map((columnIssue) => {
                const issue = columnIssue.issue
                const parsedAssigneeResult =
                  issue.assignee !== null
                    ? ProjectBoardColumnItemAssigneeSchema.safeParse({
                        id: issue.assignee.publicId,
                        name:
                          issue.assignee.firstName +
                          " " +
                          issue.assignee.lastName,
                        email: issue.assignee.userCredential.email,
                      })
                    : null
                return {
                  id: columnIssue.publicId,
                  title: issue.title,
                  description: issue.description,
                  position: columnIssue.position,
                  issueId: issue.publicId,
                  assignee:
                    parsedAssigneeResult !== null &&
                    parsedAssigneeResult.success
                      ? {
                          id: parsedAssigneeResult.data.id,
                          name: parsedAssigneeResult.data.name ?? "",
                          email: parsedAssigneeResult.data.email ?? "",
                        }
                      : null,
                  dueDate: issue.dueDate?.toISOString() ?? null,
                }
              })
              .sort((a, b) => a.position - b.position),
          }
        })
        .sort((a, b) => a.position - b.position),
    })
    if (!parsedBoard.success) {
      throw new HttpError(
        500,
        "Failed to parse project board data: " + parsedBoard.error.message,
      )
    }

    res.json(parsedBoard.data)
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
      include: {
        project: true,
      },
    })

    const {
      id,
      publicId,
      project: projectData,
      ...projectBoardWithoutId
    } = newProjectBoard
    const responseData = ProjectBoardGETSchema.safeParse({
      ...projectBoardWithoutId,
      id: newProjectBoard.publicId,
      projectId: projectData.publicId,
    })

    if (!responseData.success) {
      console.error("Error parsing response data: ", responseData.error)
      return res.status(500).json({ error: "Internal server error" })
    }

    res.status(201).json(responseData.data)
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
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const { description, name, project, publicId, columns } =
      updatedProjectBoard
    const parsedBoard = ProjectBoardGETSchema.safeParse({
      id: publicId,
      description: description,
      name: name,
      projectId: project.publicId,
      columns: columns
        .map((column) => {
          return {
            id: column.publicId,
            name: column.name,
            position: column.position,
            issues: column.columnIssues
              .map((columnIssue) => {
                const issue = columnIssue.issue
                const parsedAssigneeResult =
                  issue.assignee !== null
                    ? ProjectBoardColumnItemAssigneeSchema.safeParse({
                        id: issue.assignee.publicId,
                        name:
                          issue.assignee.firstName +
                          " " +
                          issue.assignee.lastName,
                        email: issue.assignee.userCredential.email,
                      })
                    : null
                return {
                  id: columnIssue.publicId,
                  title: issue.title,
                  description: issue.description,
                  position: columnIssue.position,
                  status: issue.status.name,
                  assignee:
                    parsedAssigneeResult !== null &&
                    parsedAssigneeResult.success
                      ? {
                          id: parsedAssigneeResult.data.id,
                          name: parsedAssigneeResult.data.name,
                          email: parsedAssigneeResult.data.email,
                        }
                      : null,
                  dueDate: issue.dueDate?.toISOString() ?? null,
                }
              })
              .sort((a, b) => a.position - b.position),
          }
        })
        .sort((a, b) => a.position - b.position),
    })
    if (!parsedBoard.success) {
      throw new HttpError(500, "Failed to parse updated project board data")
    }

    res.json(parsedBoard.data)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res.status(error instanceof HttpError ? error.statusCode : 500).json({
      error:
        error instanceof HttpError ? error.message : "Internal Server Error",
    })
  }
})

export default router

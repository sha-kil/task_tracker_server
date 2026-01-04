import { Router } from "express"
import { getIssueStatusOptions } from "src/lib/issueStatus.js"
import prisma from "src/lib/prisma.js"
import {
  IssueCreateSchema,
  IssueGETSchema,
  IssueUpdateSchema,
} from "src/schema/Issue.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create issue")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const issueCreateData = IssueCreateSchema.safeParse(req.body)
    if (!issueCreateData.success) {
      console.error("Invalid issue data:", issueCreateData.error)
      return res.status(400).json({ error: "Invalid issue data" })
    }

    let assigneeId: bigint | null = null
    if (issueCreateData.data.assigneeId !== null) {
      const assignee = await prisma.userProfile.findUnique({
        where: { publicId: issueCreateData.data.assigneeId },
      })
      if (assignee === null) {
        console.error("Assignee not found:", issueCreateData.data.assigneeId)
        return res.status(400).json({ error: "Assignee not found" })
      }

      assigneeId = assignee.id
    }

    let parentId: bigint | null = null
    if (issueCreateData.data.parentId !== null) {
      const parentIssue = await prisma.issue.findUnique({
        where: { publicId: issueCreateData.data.parentId },
      })
      if (parentIssue === null) {
        console.error("Parent issue not found:", issueCreateData.data.parentId)
        return res.status(400).json({ error: "Parent issue not found" })
      }
      parentId = parentIssue.id
    }

    const project = await prisma.project.findUnique({
      where: { publicId: issueCreateData.data.projectId },
    })

    if (project === null) {
      console.error("Project not found:", issueCreateData.data.projectId)
      return res.status(400).json({ error: "Project not found" })
    }

    let projectBoardId: bigint | null = null
    if (issueCreateData.data.projectBoardId !== null) {
      const projectBoard = await prisma.projectBoard.findUnique({
        where: { publicId: issueCreateData.data.projectBoardId },
      })
      if (projectBoard === null) {
        console.error(
          "Project board not found:",
          issueCreateData.data.projectBoardId
        )
        return res.status(400).json({ error: "Project board not found" })
      }
      projectBoardId = projectBoard.id
    }

    const status = await prisma.issueStatus.findUnique({
      where: { publicId: issueCreateData.data.statusId },
    })

    if (status === null) {
      console.error("Status not found:", issueCreateData.data.statusId)
      return res.status(400).json({ error: "Status not found" })
    }

    const {
      id,
      assigneeId: _assigneeId,
      parentId: _parentId,
      projectId,
      statusId,
      assignee,
      parent,
      project: _project,
      status: _status,
      creator,
      projectBoard: _projectBoard,
      ...newIssue
    } = await prisma.issue.create({
      data: {
        ...issueCreateData.data,
        assigneeId: assigneeId,
        createdById: req.userId,
        parentId: parentId,
        projectId: project.id,
        statusId: status.id,
        projectBoardId: projectBoardId,
      },
      include: {
        assignee: true,
        parent: true,
        project: true,
        status: true,
        projectBoard: true,
        creator: true,
      },
    })

    const responseData = IssueGETSchema.safeParse({
      ...newIssue,
      id: newIssue.publicId,
      assigneeId: assignee?.publicId || null,
      createdById: creator.publicId,
      parentId: parent?.publicId || null,
      projectId: _project.publicId,
      projectBoardId: _projectBoard?.publicId || null,
      statusId: _status.publicId,
      dueDate: newIssue.dueDate?.toISOString() || null,
      startDate: newIssue.startDate?.toISOString() || null,
      createdAt: newIssue.createdAt.toISOString(),
      updatedAt: newIssue.updatedAt.toISOString(),
    })
    if (!responseData.success) {
      console.error("Failed to parse created issue: ", responseData.error)
      return res.status(500).json({
        error: "Failed to parse created issue",
      })
    }

    res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Failed to create issue: ", error)
    res.status(500).json({ error: "Failed to create issue" })
  }
})

router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized access attempt to fetch issue")
    }

    if (req.params.id === undefined || req.params.id.trim() === "") {
      console.error("Issue ID is required")
      throw new HttpError(400, "Issue ID is required")
    }

    const issueData = await prisma.issue.findUnique({
      where: { publicId: req.params.id },
      include: {
        assignee: true,
        children: true,
        comments: true,
        creator: true,
        labels: true,
        parent: true,
        project: true,
        projectBoard: true,
        status: true,
      },
    })

    if (issueData === null) {
      console.error("Issue not found: ", req.params.id)
      return res.status(404).json({ error: "Issue not found" })
    }

    const {
      assignee,
      children,
      comments,
      creator,
      id,
      labels,
      parent,
      project,
      projectBoard,
      status,
      ...issue
    } = issueData

    const issueStatuses = (await getIssueStatusOptions(issue.publicId)) ?? []

    const responseData = IssueGETSchema.safeParse({
      ...issue,
      assigneeId: assignee?.publicId || null,
      childrenIds: children.map((child) => child.publicId),
      commentIds: comments.map((comment) => comment.publicId),
      createdById: creator.publicId,
      id: issue.publicId,
      labelIds: labels.map((label) => label.publicId),
      parentId: parent?.publicId || null,
      projectId: project.publicId,
      projectBoardId: projectBoard?.publicId || null,
      statusId: status.publicId,
      statusOptionIds: issueStatuses.map((status) => status.id),
      dueDate: issue.dueDate?.toISOString() || null,
      startDate: issue.startDate?.toISOString() || null,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    })

    if (responseData.success === false) {
      console.error("Failed to parse issue data: ", responseData.error)
      return res.status(500).json({
        error: "Failed to parse issue data",
      })
    }

    res.status(200).json(responseData.data)
  } catch (error) {
    console.error("Failed to fetch issue: ", error)
    res.status(500).json({ error: "Failed to fetch issue" })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized access attempt to update issue")
    }

    if (req.params.id === undefined || req.params.id.trim() === "") {
      console.error("Issue ID is required")
      throw new HttpError(400, "Issue ID is required")
    }

    const issueUpdateData = IssueUpdateSchema.safeParse(req.body)
    if (!issueUpdateData.success) {
      throw new HttpError(400, "Invalid issue update data")
    }

    const existingIssue = await prisma.issue.findUnique({
      where: {
        publicId: req.params.id,
        project: { user: { some: { id: req.userId } } },
      },
    })
    if (existingIssue === null) {
      throw new HttpError(404, "Issue not found")
    }

    let projectId: bigint = existingIssue.projectId
    if (issueUpdateData.data.projectId !== undefined) {
      const project = await prisma.project.findUnique({
        where: { publicId: issueUpdateData.data.projectId },
      })
      if (project === null) {
        throw new HttpError(400, "Project not found")
      }
      projectId = project.id
    }

    let assigneeId: bigint | null | undefined = undefined
    if (issueUpdateData.data.assigneeId !== undefined) {
      if (issueUpdateData.data.assigneeId === null) {
        assigneeId = null
      } else {
        const assignee = await prisma.userProfile.findUnique({
          where: {
            publicId: issueUpdateData.data.assigneeId,
            project: { some: { id: projectId } },
          },
        })
        if (assignee === null) {
          throw new HttpError(400, "Assignee not found")
        }
        assigneeId = assignee.id
      }
    }

    let childrenIds: bigint[] | undefined = undefined
    if (issueUpdateData.data.childrenIds !== undefined) {
      if (issueUpdateData.data.childrenIds.includes(req.params.id)) {
        throw new HttpError(400, "Issue cannot be its own child")
      }
      childrenIds = []
      const children = await prisma.issue.findMany({
        where: {
          publicId: { in: issueUpdateData.data.childrenIds },
          project: { id: projectId },
        },
      })

      if (children.length !== issueUpdateData.data.childrenIds.length) {
        throw new HttpError(400, "One or more child issues not found")
      }

      childrenIds = children.map((child) => child.id)
    }
    let labelIds: bigint[] | undefined = undefined
    if (issueUpdateData.data.labelIds !== undefined) {
      labelIds = []
      const labels = await prisma.issueLabel.findMany({
        where: {
          publicId: { in: issueUpdateData.data.labelIds },
          project: { id: projectId },
        },
      })
      if (labels.length !== issueUpdateData.data.labelIds.length) {
        throw new HttpError(400, "One or more labels not found")
      }
      labelIds = labels.map((label) => label.id)
    }

    let parentId: bigint | null | undefined = undefined
    if (issueUpdateData.data.parentId !== undefined) {
      if (issueUpdateData.data.parentId === null) {
        parentId = null
      } else {
        if (issueUpdateData.data.parentId === req.params.id) {
          throw new HttpError(400, "Issue cannot be its own parent")
        }

        const parentIssue = await prisma.issue.findUnique({
          where: {
            publicId: issueUpdateData.data.parentId,
            project: { id: projectId },
          },
        })
        if (parentIssue === null) {
          throw new HttpError(400, "Parent issue not found")
        }

        // Detect circular parent relationship by traversing ancestor chain
        // (assuming existing chain is acyclic)
        let currentAncestor = parentIssue
        while (currentAncestor.parentId !== null) {
          const ancestor = await prisma.issue.findUnique({
            where: { id: currentAncestor.parentId },
          })
          if (ancestor === null) {
            break
          }
          if (ancestor.publicId === req.params.id) {
            throw new HttpError(400, "Circular parent relationship detected")
          }
          currentAncestor = ancestor
        }

        parentId = parentIssue.id
      }
    }

    let projectBoardId: bigint | null | undefined = undefined
    if (issueUpdateData.data.projectBoardId !== undefined) {
      if (issueUpdateData.data.projectBoardId === null) {
        projectBoardId = null
      } else {
        const projectBoard = await prisma.projectBoard.findUnique({
          where: {
            publicId: issueUpdateData.data.projectBoardId,
            project: { id: projectId },
          },
        })
        if (projectBoard === null) {
          throw new HttpError(400, "Project board not found")
        }
        projectBoardId = projectBoard.id
      }
    }

    let statusId: bigint | undefined = undefined
    if (issueUpdateData.data.statusId !== undefined) {
      const status = await prisma.issueStatus.findUnique({
        where: {
          publicId: issueUpdateData.data.statusId,
          projectBoardId: projectBoardId ?? null,
        },
      })
      if (status === null) {
        throw new HttpError(400, "Status not found")
      }
      statusId = status.id
    }

    const {
      assignee,
      children,
      comments,
      creator,
      history,
      labels,
      status,
      parent,
      project,
      projectBoard,
      publicId,
      ...issueRest
    } = await prisma.issue.update({
      where: {
        publicId: req.params.id,
        project: { user: { some: { id: req.userId } } },
      },
      data: {
        ...(assigneeId !== undefined
          ? {
              assignee: {
                ...(assigneeId !== null
                  ? { connect: { id: assigneeId } }
                  : { disconnect: true }),
              },
            }
          : {}),
        ...(childrenIds !== undefined
          ? {
              children: {
                set: childrenIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(issueUpdateData.data.description !== undefined
          ? { description: issueUpdateData.data.description }
          : {}),
        ...(issueUpdateData.data.dueDate !== undefined
          ? { dueDate: issueUpdateData.data.dueDate }
          : {}),
        ...(labelIds !== undefined
          ? {
              labels: {
                set: labelIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(parentId !== undefined
          ? {
              parent: {
                ...(parentId !== null
                  ? { connect: { id: parentId } }
                  : { disconnect: true }),
              },
            }
          : {}),
        ...(issueUpdateData.data.priority !== undefined
          ? { priority: issueUpdateData.data.priority }
          : {}),
        ...(projectId !== undefined
          ? {
              project: {
                connect: { id: projectId },
              },
            }
          : {}),
        ...(projectBoardId !== undefined
          ? {
              projectBoard:
                projectBoardId !== null
                  ? { connect: { id: projectBoardId } }
                  : { disconnect: true },
            }
          : {}),
        ...(statusId !== undefined
          ? {
              status: { connect: { id: statusId } },
            }
          : {}),
        ...(issueUpdateData.data.startDate !== undefined
          ? { startDate: issueUpdateData.data.startDate }
          : {}),
        ...(issueUpdateData.data.title !== undefined
          ? { title: issueUpdateData.data.title }
          : {}),
        updatedAt: new Date(),
      },
      include: {
        assignee: true,
        children: true,
        comments: true,
        creator: true,
        history: true,
        labels: true,
        status: true,
        parent: true,
        project: true,
        projectBoard: {
          include: {
            issueStatuses: true,
          },
        },
      },
    })

    const { success, data, error } = IssueGETSchema.safeParse({
      ...issueRest,
      id: publicId,
      assigneeId: assignee?.publicId || null,
      childrenIds: children.map((child) => child.publicId),
      commentIds: comments.map((comment) => comment.publicId),
      createdById: creator.publicId,
      labelIds: labels.map((label) => label.publicId),
      parentId: parent?.publicId || null,
      projectId: project.publicId,
      projectBoardId: projectBoard?.publicId || null,
      statusId: status.publicId,
      statusOptionIds:
        projectBoard?.issueStatuses.map((status) => status.publicId) || [],
      dueDate: issueRest.dueDate?.toISOString() || null,
      startDate: issueRest.startDate?.toISOString() || null,
      createdAt: issueRest.createdAt.toISOString(),
      updatedAt: issueRest.updatedAt.toISOString(),
    })

    if (!success) {
      throw new HttpError(500, "Failed to parse updated issue: " + error)
    }

    res.status(200).json(data)
  } catch (error: HttpError | unknown) {
    console.error("Failed to update issue: ", error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to update issue" })
  }
})

export default router

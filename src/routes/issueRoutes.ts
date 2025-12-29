import { Router } from "express"
import { getIssueStatusOptions } from "src/lib/issueStatus.js"
import prisma from "src/lib/prisma.js"
import { IssueCreateSchema, IssueGETSchema } from "src/schema/Issue.js"

const router = Router()

router.post("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to fetch issue")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
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
      commentsIds: comments.map((comment) => comment.publicId),
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

export default router

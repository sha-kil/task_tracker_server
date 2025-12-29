import { Router } from "express"
import prisma from "src/lib/prisma.js"
import { getProjectBoard } from "src/lib/projectBoard.js"
import {
  IssueStatusCreateSchema,
  IssueStatusGETSchema,
} from "src/schema/IssueStatus.js"
import type { Request, Response } from "express"
import { getCurrentIssueStatusByIssueId, getDefaultIssueStatuses, getIssueStatusOptions } from "src/lib/issueStatus.js"

const router = Router()

router.get("/", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to issue statuses")
    return res.status(403).json({ error: "Forbidden" })
  }

  const issueId = req.query.issueId
  if (issueId !== undefined && typeof issueId === "string") {
    const issueStatuses = await getCurrentIssueStatusByIssueId(issueId)
    if (issueStatuses === null) {
      console.error("Invalid issue ID:", issueId)
      return res.status(400).json({ error: "Invalid issue ID" })
    }

    return res.status(200).json(issueStatuses)
  }

  const projectBoardId = req.query.projectBoardId
  if (projectBoardId !== undefined && typeof projectBoardId === "string") {
    try {
      const issueStatuses = await getIssueStatusesByProjectBoardId(
        projectBoardId
      )
      return res.status(200).json(issueStatuses)
    } catch (error) {
      console.error(
        "Failed to retrieve issue statuses by project board ID:",
        error
      )
      return res
        .status(500)
        .json({ error: "Failed to retrieve issue statuses" })
    }
  }

  console.error("Missing or invalid query parameters")
  return res.status(400).json({ error: "Missing or invalid query parameters" })
})

router.get("/default", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to default issue statuses")
    return res.status(403).json({ error: "Forbidden" })
  }

  const defaultStatuses = await getDefaultIssueStatuses()
  const parsedResponse = []
  for (const status of defaultStatuses) {
    const parsed = IssueStatusGETSchema.safeParse({
      id: status.publicId,
      name: status.name,
      color: status.color,
      projectBoardId: status.projectBoard?.publicId ?? null,
    })

    if (!parsed.success) {
      console.error("Failed to parse issue status:", parsed.error)
      continue
    }

    parsedResponse.push(parsed.data)
  }

  return res.status(200).json(parsedResponse)
})

router.get("/options/:issueId", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to issue status options")
    return res.status(403).json({ error: "Forbidden" })
  }

  const { issueId } = req.params
  if (issueId === undefined || typeof issueId !== "string") {
    console.error("Missing or invalid issue ID")
    return res.status(400).json({ error: "Missing or invalid issue ID" })
  }

  const response = await getIssueStatusOptions(issueId)
  if (response === null) {
    console.error("Invalid issue ID:", issueId)
    return res.status(400).json({ error: "Invalid issue ID" })
  } 

  return res.status(200).json(response)
})

router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create issue status")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const { success, data, error } = IssueStatusCreateSchema.safeParse(req.body)
    if (!success) {
      console.error("Invalid request data:", error)
      return res.status(400).json({ error: "Invalid request data" })
    }

    // verify project exists and user has access
    const projectBoard = await prisma.projectBoard.findUnique({
      where: {
        publicId: data.projectBoardId,
        project: {
          user: {
            some: { id: req.userId },
          },
        },
      },
    })

    if (projectBoard === null) {
      console.error("Invalid project board ID:", data.projectBoardId)
      return res.status(400).json({ error: "Invalid project board ID" })
    }

    const issueStatus = await prisma.issueStatus.create({
      data: {
        name: data.name,
        color: data.color ?? null,
        projectBoardId: projectBoard.id,
      },
      include: {
        projectBoard: true,
      },
    })

    const {
      id,
      projectBoardId,
      projectBoard: projectBoardData,
      publicId,
      ...statusWithoutId
    } = issueStatus
    const parsedResponse = IssueStatusGETSchema.safeParse({
      ...statusWithoutId,
      id: publicId,
      projectBoardId: projectBoardData?.publicId ?? null,
    })
    if (!parsedResponse.success) {
      console.error(
        "Failed to parse created issue status:",
        parsedResponse.error
      )
      return res.status(500).json({
        error: "Failed to parse created issue status",
      })
    }

    return res.status(201).json(parsedResponse.data)
  } catch (error) {
    console.error("Failed to create issue status: ", error)
    return res.status(500).json({ error: "Failed to create issue status" })
  }
})

async function getIssueStatusesByProjectBoardId(
  projectBoardId: string,
) {
  const projectBoard = await getProjectBoard(projectBoardId)
  if (projectBoard === null) {
    console.error("Invalid project board ID: ", projectBoardId)
    throw new Error("Invalid project board ID")
  }

  const issueStatuses = await prisma.issueStatus.findMany({
    where: {
      projectBoardId: projectBoard.id,
    },
    include: {
      projectBoard: true,
    },
  })

  const parsedResponse = []
  for (const status of issueStatuses) {
    const parsed = IssueStatusGETSchema.safeParse({
      id: status.publicId,
      name: status.name,
      color: status.color,
      projectBoardId: status.projectBoard?.publicId ?? null,
    })

    if (!parsed.success) {
      console.error("Failed to parse issue status:", parsed.error)
      continue
    }

    parsedResponse.push(parsed.data)
  }

  return parsedResponse
}

export default router

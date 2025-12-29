import { Router } from "express"
import prisma from "src/lib/prisma.js"
import {
  IssueLabelCreateSchema,
  IssueLabelGETSchema,
} from "src/schema/IssueLabel.js"
import type { Request, Response } from "express"

const router = Router()

// fetches all labels for a specific issue
router.get("/", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to issue labels")
    return res.status(403).json({ error: "Forbidden" })
  }

  const projectId = req.query.projectId
  if (projectId !== undefined && typeof projectId === "string") {
    return getIssueLabelsByProjectId(projectId, res)
  }

  const issueId = req.query.issueId
  if (issueId !== undefined && typeof issueId === "string") {
    return getIssueLabelsByIssueId(issueId, res)
  }

  console.error("Required parameter missing: projectId or issueId")
  return res.status(400).json({ error: "required parameter missing" })
})

router.post("/", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create issue label")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const createData = IssueLabelCreateSchema.safeParse(req.body)
    if (!createData.success) {
      console.error("Invalid issue label creation data:", createData.error)
      return res.status(400).json({ error: "Invalid request data" })
    }

    const project = await prisma.project.findFirst({
      where: {
        publicId: createData.data.projectId,
      },
    })

    if (project === null) {
      console.error(
        "Project board not found for project: ",
        createData.data.projectId
      )
      return res.status(404).json({ error: "Project board not found" })
    }

    const { id, projectId, ...newIssueLabel } = await prisma.issueLabel.create({
      data: {
        name: createData.data.name,
        color: createData.data.color,
        projectId: project.id,
      },
    })

    const responseData = IssueLabelGETSchema.safeParse({
      ...newIssueLabel,
      projectId: createData.data.projectId,
    })
    if (!responseData.success) {
      console.error("Failed to parse created issue label:", responseData.error)
      return res.status(500).json({
        error: "Failed to parse response data",
      })
    }

    res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Failed to create issue label:", error)
    res.status(500).json({ error: "Failed to create issue label" })
  }
})

async function getIssueLabelsByProjectId(projectId: string, res: Response) {
  try {
    const issueLabels = await prisma.issueLabel.findMany({
      where: {
        project: {
          publicId: projectId,
        },
      },
      include: {
        project: true,
      },
    })

    const responseData = []
    for (const label of issueLabels) {
      const parsedLabel = IssueLabelGETSchema.safeParse({
        id: label.publicId,
        name: label.name,
        color: label.color,
        projectId: label.project.publicId,
      })
      if (parsedLabel.success) {
        responseData.push(parsedLabel.data)
      } else {
        console.error("Parsed Label:", parsedLabel.error)
      }
    }

    res.status(200).json(responseData)
  } catch (error) {
    console.error("Failed to fetch issue labels: ", error)
    res.status(500).json({ error: "Failed to fetch issue labels" })
  }
}

async function getIssueLabelsByIssueId(issueId: string, res: Response) {
  try {
    const issueLabels = await prisma.issueLabel.findMany({
      where: {
        issues: {
          some: {
            publicId: issueId,
          },
        },
      },
      include: {
        project: true,
      },
    })

    const responseData = []
    for (const label of issueLabels) {
      const parsedLabel = IssueLabelGETSchema.safeParse({
        id: label.publicId,
        name: label.name,
        color: label.color,
        projectId: label.project.publicId,
      })
      if (parsedLabel.success) {
        responseData.push(parsedLabel.data)
      } else {
        console.error("Parsed Label:", parsedLabel.error)
      }
    }

    res.status(200).json(responseData)
  } catch (error) {
    console.error("Failed to fetch issue labels: ", error)
    res.status(500).json({ error: "Failed to fetch issue labels" })
  }
}

export default router

import { Router } from "express"
import prisma from "src/lib/prisma.js"
import {
  IssueLabelCreateSchema,
  IssueLabelGETSchema,
  IssueLabelUpdateSchema,
} from "src/schema/IssueLabel.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"

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

router.get("/ids/:ids", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const idsParam = req.params.ids?.trim()
    if (!idsParam) {
      throw new HttpError(400, "Missing 'ids' parameter")
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    if (ids.length === 0) {
      throw new HttpError(400, "No valid IDs provided")
    }

    const issueLabels = await prisma.issueLabel.findMany({
      where: {
        publicId: {
          in: ids,
        },
        project: {
          user: {
            some: {
              id: req.userId,
            },
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

    return res.status(200).json(responseData)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof Error ? error.message : error)
    return res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to fetch issue labels by IDs" })
  }
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

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const issueLabelId = req.params.id
    if (issueLabelId === undefined) {
      throw new HttpError(400, "Missing issue label ID parameter")
    }

    const updateData = IssueLabelUpdateSchema.safeParse(req.body)
    if (!updateData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const updatedIssueLabel = await prisma.issueLabel.update({
      where: {
        publicId: issueLabelId,
        project: {
          user: {
            some: {
              id: req.userId,
            },
          },
        },
      },
      data: {
        ...(updateData.data.name !== undefined && {
          name: updateData.data.name,
        }),
        ...(updateData.data.color !== undefined && {
          color: updateData.data.color,
        }),
      },
      include: {
        project: true,
      },
    })

    const responseData = IssueLabelGETSchema.safeParse({
      id: updatedIssueLabel.publicId,
      name: updatedIssueLabel.name,
      color: updatedIssueLabel.color,
      projectId: updatedIssueLabel.project.publicId,
    })

    if (!responseData.success) {
      throw new HttpError(500, "Failed to parse response data")
    }

    return res.status(200).json(responseData.data)
  } catch (error: HttpError | unknown) {
    const httpError = error instanceof HttpError
    console.error(httpError ? error.message : error)
    return res.status(httpError ? error.statusCode : 500).json({
      error: httpError ? error.message : "Failed to update issue label",
    })
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

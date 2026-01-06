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
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }
    const createData = IssueLabelCreateSchema.safeParse(req.body)
    if (!createData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const project = await prisma.project.findFirst({
      where: {
        publicId: createData.data.projectId,
      },
    })

    if (project === null) {
      throw new HttpError(404, "Project board not found")
    }

    const { id, publicId, projectId, ...newIssueLabel } =
      await prisma.issueLabel.create({
        data: {
          name: createData.data.name,
          color: createData.data.color,
          projectId: project.id,
        },
      })

    const responseData = IssueLabelGETSchema.safeParse({
      ...newIssueLabel,
      id: publicId,
      projectId: createData.data.projectId,
    })
    if (!responseData.success) {
      throw new HttpError(500, "Failed to parse response data")
    }

    res.status(201).json(responseData.data)
  } catch (error: HttpError | unknown) {
    const httpError = error instanceof HttpError
    console.error(httpError ? error.message : error)
    res.status(httpError ? error.statusCode : 500).json({
      error: httpError ? error.message : "Failed to create issue label",
    })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const issueLabelId = req.params.id
    if (issueLabelId === undefined || issueLabelId.trim() === "") {
      throw new HttpError(400, "Missing issue label ID parameter")
    }

    const updateData = IssueLabelUpdateSchema.safeParse(req.body)
    if (!updateData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const dataToUpdate = {
      ...(updateData.data.name !== undefined && {
        name: updateData.data.name,
      }),
      ...(updateData.data.color !== undefined && {
        color: updateData.data.color,
      }),
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new HttpError(400, "No valid fields to update")
    }

    const existingLabel = await prisma.issueLabel.findFirst({
      where: {
        publicId: issueLabelId,
      },
    })
    if (existingLabel === null) {
      throw new HttpError(404, "Issue label not found")
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
      data: dataToUpdate,
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

import { Router } from "express"
import { getIssue } from "src/lib/issue.js"
import prisma from "src/lib/prisma.js"
import {
  IssueHistoryCreateSchema,
  IssueHistoryGETSchema,
} from "src/schema/issueHistory.js"

const router = Router()

router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create issue history")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const historyCreationData = IssueHistoryCreateSchema.safeParse(req.body)
    if (!historyCreationData.success) {
      console.error(
        "Invalid issue history creation data:",
        historyCreationData.error
      )
      return res.status(400).json({
        error: "Invalid request data",
      })
    }

    const issue = await getIssue(historyCreationData.data.issueId)
    if (issue === null) {
      console.error("Issue not found:", historyCreationData.data.issueId)
      return res.status(404).json({ error: "Issue not found" })
    }

    const user = await prisma.userProfile.findUnique({
      where: { publicId: historyCreationData.data.authorId },
    })
    if (user === null) {
      console.error("User not found:", historyCreationData.data.authorId)
      return res.status(404).json({ error: "User not found" })
    }

    const { id, issueId, authorId, publicId, ...issueHistory } =
      await prisma.issueHistory.create({
        data: {
          change: historyCreationData.data.change,
          issueId: issue.id,
          authorId: user.id,
        },
        include: {
          issue: true,
          author: true,
        },
      })

    const responseData = IssueHistoryGETSchema.safeParse({
      ...issueHistory,
      id: publicId,
      issueId: issue.publicId,
      authorId: user.publicId,
      changedAt: issueHistory.changedAt.toISOString(),
    })

    if (!responseData.success) {
      console.error(
        "Failed to parse created issue history:",
        responseData.error
      )
      return res.status(500).json({
        error: "Failed to parse response data",
      })
    }

    res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Error during issue history creation:", error)
    res
      .status(500)
      .json({ error: "Failed to create issue history", details: error })
  }
})

router.get("/:issueId", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to fetch issue history")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const issueHistoryData = await prisma.issueHistory.findMany({
      where: {
        issue: {
          publicId: req.params.issueId,
        },
      },
      include: {
        issue: true,
        author: true,
      },
    })

    const issueHistories = []
    for (const history of issueHistoryData) {
      const responseData = IssueHistoryGETSchema.safeParse({
        ...history,
        id: history.publicId,
        issueId: history.issue.publicId,
        authorId: history.author.publicId,
        changedAt: history.changedAt.toISOString(),
      })

      if (responseData.success) {
        issueHistories.push(responseData.data)
      } else {
        console.error("Failed to parse issue history:", responseData.error)
      }
    }

    res.json(issueHistories)
  } catch (error) {
    console.error("Error fetching issue history:", error)
    res.status(500).json({ error: "Failed to fetch issue history" })
  }
})

export default router

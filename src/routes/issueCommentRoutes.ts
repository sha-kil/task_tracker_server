import { Router } from "express"
import { getIssue } from "src/lib/issue.js"
import prisma from "src/lib/prisma.js"
import {
  IssueCommentCreateSchema,
  IssueCommentGETSchema,
} from "src/schema/issueComment.js"
import type { Request, Response } from "express"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  if (req.userId === undefined) {
    console.error("Unauthorized: userId is undefined")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const commentId = req.params.id
    if (commentId === undefined) {
      console.error("Comment ID is missing in request parameters")
      return res.status(400).json({ error: "Comment ID is required" })
    }

    const issueComment = await prisma.issueComment.findUnique({
      where: { publicId: commentId },
      include: {
        author: true,
        issue: true,
      },
    })

    if (issueComment === null) {
      console.error("Comment not found:", commentId)
      return res.status(404).json({ error: "Comment not found" })
    }

    const responseData = IssueCommentGETSchema.safeParse({
      id: issueComment.publicId,
      issueId: issueComment.issue.publicId,
      authorId: issueComment.author.publicId,
      text: issueComment.text,
      createdAt: issueComment.createdAt.toISOString(),
      updatedAt: issueComment.updatedAt.toISOString(),
    })

    if (!responseData.success) {
      console.error("Failed to parse comment data:", responseData.error)
      return res.status(500).json({ error: "Failed to parse comment data" })
    }

    return res.status(200).json(responseData.data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Create a new comment on an issue
router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized: userId is undefined")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const issueCommentCreationData = IssueCommentCreateSchema.safeParse(req.body)
    if (!issueCommentCreationData.success) {
      return res
        .status(400)
        .json({ error: "Invalid comment data", details: issueCommentCreationData.error })
    }

    const commentIssue = await getIssue(issueCommentCreationData.data.issueId) 
    if (commentIssue === null) {
      console.error("Issue not found:", issueCommentCreationData.data.issueId)
      return res.status(400).json({ error: "Issue not found" })
    }

    const { author, issue, id, ...newIssueComment } = await prisma.issueComment.create({
      data: {
        issueId: commentIssue.id,
        authorId: req.userId,
        text: issueCommentCreationData.data.text,
      },
      include: {
        author: true,
        issue: true
      }
    })

    const responseData = IssueCommentGETSchema.safeParse({
      ...newIssueComment,
      authorId: author.publicId,
      createdAt: newIssueComment.createdAt.toISOString(),
      id: newIssueComment.publicId,
      issueId: issueCommentCreationData.data.issueId,
      updatedAt: newIssueComment.updatedAt.toISOString(),
    })

    if(!responseData.success){
      console.error("Failed to parse created comment:", responseData.error)
      return  res.status(500).json({ error: "Failed to parse created comment" })
    }

    return res.status(201).json(responseData.data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router

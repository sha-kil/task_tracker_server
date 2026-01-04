import { Router } from "express"
import { getIssue } from "src/lib/issue.js"
import prisma from "src/lib/prisma.js"
import {
  IssueCommentCreateSchema,
  IssueCommentGETSchema,
  IssueCommentUpdateSchema,
} from "src/schema/issueComment.js"
import type { Request, Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import { getUserByCredentialId } from "src/lib/userProfile.js"

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
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const currentUser = await getUserByCredentialId(req.userId)

    const issueCommentCreationData = IssueCommentCreateSchema.safeParse(
      req.body
    )
    if (!issueCommentCreationData.success) {
      console.error("Invalid comment data:", issueCommentCreationData.error)
      throw new HttpError(400, "Invalid comment data")
    }

    const commentIssue = await getIssue(issueCommentCreationData.data.issueId)
    if (commentIssue === null) {
      console.error("Issue not found:", issueCommentCreationData.data.issueId)
      throw new HttpError(400, "Issue not found")
    }

    if (issueCommentCreationData.data.parentId !== null) {
      const parentComment = await prisma.issueComment.findUnique({
        where: {
          publicId: issueCommentCreationData.data.parentId,
          issue: {
            publicId: issueCommentCreationData.data.issueId,
          },
        },
      })

      if (parentComment === null) {
        throw new HttpError(400, "Parent comment not found")
      }

      // Check for cyclic parent comment references
      let currentParent = parentComment
      while (currentParent.parentId !== null) {
        const nextParent = await prisma.issueComment.findUnique({
          where: { id: currentParent.parentId },
        })

        if (nextParent === null) {
          break
        }
        if (nextParent.id === parentComment.id) {
          throw new HttpError(400, "Cyclic parent comment reference detected")
        }

        currentParent = nextParent
      }
    }

    const { author, issue, id, parent, ...newIssueComment } =
      await prisma.issueComment.create({
        data: {
          text: issueCommentCreationData.data.text,
          author: {
            connect: { publicId: currentUser.id },
          },
          issue: {
            connect: { publicId: issueCommentCreationData.data.issueId },
          },
          ...(issueCommentCreationData.data.parentId !== null && {
            parent: {
              connect: { publicId: issueCommentCreationData.data.parentId },
            },
          }),
        },
        include: {
          author: true,
          issue: true,
          parent: true,
          likedBy: true,
        },
      })

    const responseData = IssueCommentGETSchema.safeParse({
      authorId: author.publicId,
      createdAt: newIssueComment.createdAt.toISOString(),
      id: newIssueComment.publicId,
      issueId: issueCommentCreationData.data.issueId,
      likedByUserIds: newIssueComment.likedBy.map((user) => user.publicId),
      parentId: parent?.publicId ?? null,
      text: newIssueComment.text,
      updatedAt: newIssueComment.updatedAt.toISOString(),
    })

    if (!responseData.success) {
      console.error("Failed to parse created comment:", responseData.error)
      throw new HttpError(500, "Failed to parse created comment")
    }

    return res.status(201).json(responseData.data)
  } catch (error: HttpError | unknown) {
    console.error(
      error instanceof HttpError ? `HttpError: ${error.message}` : error
    )
    return res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({
        error:
          error instanceof HttpError ? error.message : "Internal server error",
      })
  }
})

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Forbidden")
    }

    const commentId = req.params.id
    if (commentId === undefined) {
      throw new HttpError(400, "Comment ID is required")
    }

    const existingComment = await prisma.issueComment.findUnique({
      where: {
        publicId: commentId,
      },
      include: {
        likedBy: true,
        author: {
          include: {
            userCredential: true,
          },
        },
      },
    })

    if (existingComment === null) {
      throw new HttpError(404, "Comment not found or access denied")
    }

    const commentOwner = existingComment.author.userCredential.id === req.userId

    const updateData = IssueCommentUpdateSchema.safeParse(req.body)
    if (!updateData.success) {
      throw new HttpError(400, "Invalid update data")
    }

    // can only like / unlike when logged in
    const liked = updateData.data.likedByUserIds
      ? updateData.data.likedByUserIds.includes(existingComment.author.publicId)
      : undefined

    const updatedComment = await prisma.issueComment.update({
      where: { publicId: commentId },
      data: {
        // to change text only if the requester is the comment owner
        ...(updateData.data.text !== undefined &&
          commentOwner && {
            text: updateData.data.text,
          }),

        ...(liked !== undefined && {
          likedBy: liked
            ? {
                connect: { id: req.userId },
              }
            : {
                disconnect: { id: req.userId },
              },
        }),
        updatedAt: new Date(),
      },
      include: {
        author: true,
        issue: true,
        likedBy: true,
        parent: true,
      },
    })

    const responseData = IssueCommentGETSchema.safeParse({
      authorId: updatedComment.author.publicId,
      createdAt: updatedComment.createdAt.toISOString(),
      id: updatedComment.publicId,
      issueId: updatedComment.issue.publicId,
      likedByUserIds: updatedComment.likedBy.map((user) => user.publicId),
      parentId: updatedComment.parent?.publicId ?? null,
      text: updatedComment.text,
      updatedAt: updatedComment.updatedAt.toISOString(),
    })
    if (!responseData.success) {
      throw new HttpError(500, "Failed to parse updated comment")
    }

    return res.status(200).json(responseData.data)
  } catch (error: HttpError | unknown) {
    console.error(
      error instanceof HttpError ? `HttpError: ${error.message}` : error
    )
    return res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({
        error:
          error instanceof HttpError ? error.message : "Internal server error",
      })
  }
})

export default router

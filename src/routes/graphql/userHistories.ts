import prisma from "src/lib/prisma.js"
import { IssueHistoryGETSchema } from "src/schema/issueHistory.js"

export async function userHistories(
  args: { userId: string },
  context: { userId?: bigint }
) {
  if (context.userId === undefined) {
    throw new Error("Unauthorized")
  }

  const userId = args.userId
  const user = await prisma.userProfile.findUnique({
    where: { publicId: userId },
  })

  if (user === null) {
    throw new Error("User not found")
  }

  const userHistories = await prisma.issueHistory.findMany({
    where: {
      author: {
        id: user.id,
      },
    },
    include: {
      issue: true,
      author: true,
    },
  })

  const parsedUserHistories = userHistories.map((history) => {
    const parsed = IssueHistoryGETSchema.safeParse({
      changedAt: history.changedAt.toISOString(),
      change: history.change,
      id: history.publicId,
      issueId: history.issue.publicId,
      authorId: history.author.publicId,
    })
    if (!parsed.success) {
      console.error("Failed to parse issue history:", parsed.error)
      throw new Error("Failed to parse issue history")
    }

    return {
      ...parsed.data,
      issue: {
        id: history.issue.publicId,
        title: history.issue.title,
      },
    }
  })

  const response = parsedUserHistories.map((history) => {
    return {
      currentValue: history.change.current,
      id: history.id,
      issue: history.issue,
      topic: history.change.topic,
      updatedAt: history.changedAt,
    }
  })

  return response
}

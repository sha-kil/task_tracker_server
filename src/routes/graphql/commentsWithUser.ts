import { getFileUrlById } from "src/lib/file.js"
import prisma from "src/lib/prisma.js"

export async function commentsWithUser(
  args: { issueId: string },
  context: { userId?: bigint }
) {
  const userId = context.userId
  if (userId === undefined) {
    throw new Error("Unauthorized")
  }

  const comments = await prisma.issueComment.findMany({
    where: {
      issue: {
        publicId: args.issueId,
      },
    },
    include: {
      author: {
        select: {
          publicId: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          lastActive: true,
          userCredential: true,
        },
      },
      likedBy: true,
      parent: true,
    },
  })

  const response = await Promise.all(
    comments.map(async (comment) => {
      const edited = comment.updatedAt > comment.createdAt
      const profilePictureUrl = comment.author.profilePicture
        ? await getFileUrlById(comment.author.profilePicture.publicId)
        : null
      return {
        comment: {
          id: comment.publicId,
          text: comment.text,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          edited: edited,
          likedByUserIds: comment.likedBy.map((user) => user.publicId),
          parentId: comment.parent ? comment.parent.publicId : null,
          authorId: comment.author.publicId,
        },
        user: {
          id: comment.author.publicId,
          firstName: comment.author.firstName,
          lastName: comment.author.lastName,
          email: comment.author.userCredential.email,
          lastActive: comment.author.lastActive.toISOString(),
          profilePictureUrl,
        },
      }
    })
  )

  return response
}

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
      } 
    },
    include: {
      author: {
        select: {
          publicId: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          lastActive: true,
          userCredential: true
        } 
      },
      likedBy: true
    }
  })

  const response = comments.map((comment) => {
    const edited = comment.updatedAt > comment.createdAt
    return {
      comment: {
        id: comment.publicId,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        edited: edited,
        likedByUserIds: comment.likedBy.map((user) => user.publicId),
        parentId: null,
        authorId: comment.author.publicId,
      },
      user: {
        id: comment.author.publicId,
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
        email: comment.author.userCredential.email,
        lastActive: comment.author.lastActive.toISOString(),
        profilePictureUrl: comment.author.profilePictureUrl,
      },
    }
  })

  return response
}
import prisma from "src/lib/prisma.js"

export async function userIssueList(
  args: { userId: string },
  context: { userId?: bigint }
) {
  if (context.userId === undefined) {
    throw new Error("Unauthorized")
  }

  const userId = args.userId
  const userProfile = await prisma.userProfile.findUnique({
    where: { publicId: userId },
  })

  if(userProfile === null) {
    throw new Error("User not found")
  }

  const issues = await prisma.issue.findMany({
    where: {
      OR: [{ createdById: userProfile.id }, { assigneeId: userProfile.id }],
    },
    include: {
      children: true,
      labels: true,
      status: true,
      assignee: true,
    } 
  })

  return issues.map((issue) => {
    const assignee = issue.assignee
      ? [issue.assignee.firstName, issue.assignee.lastName]
          .filter(Boolean)
          .join(" ") || null
      : null
    return {
      assignee,
      childrenIds: issue.children.map((child) => child.publicId),
      createdAt: issue.createdAt.toISOString(),
      createdById: userProfile.publicId,
      id: issue.publicId,
      labels: issue.labels.map((label) => label.name),
      priority: issue.priority,
      status: {
        id: issue.status.publicId,
        name: issue.status.name,
        color: issue.status.color,
      },
      title: issue.title,
    }
  })
}

import prisma from "src/lib/prisma.js"

export async function userIssueList(
  args: { userId: string },
  context: { userId?: bigint },
) {
  if (context.userId === undefined) {
    throw new Error("Unauthorized")
  }

  const userId = args.userId
  const userProfile = await prisma.userProfile.findUnique({
    where: { publicId: userId },
  })

  if (userProfile === null) {
    throw new Error("User not found")
  }

  const issues = await prisma.issue.findMany({
    where: {
      OR: [{ createdById: userProfile.id }, { assigneeId: userProfile.id }],
    },
    include: {
      children: true,
      labels: true,
      projectBoardColumnItem: {
        include: {
          projectBoardColumn: true,
        },
      },
      assignee: true,
    },
  })

  return issues.map((issue) => {
    const assignee = issue.assignee
      ? [issue.assignee.firstName, issue.assignee.lastName]
          .filter(Boolean)
          .join(" ") || null
      : null
    const projectBoardColumn = issue.projectBoardColumnItem?.projectBoardColumn
    return {
      assignee,
      childrenIds: issue.children.map((child) => child.publicId),
      createdAt: issue.createdAt.toISOString(),
      createdById: userProfile.publicId,
      id: issue.publicId,
      labels: issue.labels.map((label) => label.name),
      priority: issue.priority,
      ...(projectBoardColumn !== undefined
        ? {
            status: {
              id: projectBoardColumn.publicId,
              name: projectBoardColumn.name,
            },
          }
        : {}),
      title: issue.title,
    }
  })
}

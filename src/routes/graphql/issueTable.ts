import prisma from "src/lib/prisma.js"

export async function issueTable(
  _args: { ids: string[] },
  context: { userId?: bigint }
) {
  const userId = context.userId
  if (userId === undefined) {
    throw new Error("Unauthorized")
  }

  const issues = await prisma.issue.findMany({
    where: {
      OR: [{ createdById: userId }, { assigneeId: userId }],
    },
    include: {
      status: {
        select: {
          publicId: true,
          name: true,
          color: true,
        },
      },
      project: {
        select: {
          issueLabel: {
            select: {
              name: true,
            },
          },
        },
      },
      assignee: true,
      children: true,
      creator: true,
    },
  })

  const response = issues.map((issue) => {
    return {
      assignee: issue.assignee?.publicId || null,
      childrenIds: issue.children.map((child) => child.publicId),
      createdAt: issue.createdAt.toISOString(),
      createdById: issue.creator.publicId,
      id: issue.publicId,
      labels: issue.project.issueLabel.map((label) => label.name),
      priority: issue.priority,
      status: {
        color: issue.status.color,
        id: issue.status.publicId,
        name: issue.status.name,
      },
      title: issue.title,
    }
  })

  return response
}

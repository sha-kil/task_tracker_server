import prisma from "src/lib/prisma.js"

export async function issueTable(
  args: { ids: string[] | null },
  context: { userId?: bigint }
) {
  const userId = context.userId
  if (userId === undefined) {
    throw new Error("Unauthorized")
  }

  const condition = {
    where: {
      ...(args.ids !== null
        ? { publicId: { in: args.ids } }
        : {
            OR: [{ createdById: userId }, { assigneeId: userId }],
          }),
    },
  }

  const issues = await prisma.issue.findMany({
    ...condition,
    include: {
      status: {
        select: {
          publicId: true,
          name: true,
          color: true,
        },
      },
      labels: {
        select: {
          name: true,
        },
      },
      assignee: true,
      children: true,
      creator: true,
    },
  })

  const response = issues.map((issue) => {
    let assignee: string | null = null
    if (issue.assignee !== null) {
      const assigneeName = [issue.assignee.firstName, issue.assignee.lastName]
        .filter(Boolean)
        .join(" ")
      assignee = assigneeName
    }

    return {
      assignee,
      childrenIds: issue.children.map((child) => child.publicId),
      createdAt: issue.createdAt.toISOString(),
      createdById: issue.creator.publicId,
      id: issue.publicId,
      labels: issue.labels.map((label) => label.name),
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

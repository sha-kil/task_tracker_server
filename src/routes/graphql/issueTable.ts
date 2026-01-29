import prisma from "src/lib/prisma.js"

export async function issueTable(
  args: { ids: string[] | null, projectId: string | null },
  context: { userId?: bigint },
) {
  const userId = context.userId
  if (userId === undefined) {
    throw new Error("Unauthorized")
  }

  const condition = {}
  if( args.ids !== null ) {
    // Fetch by specific issue IDs
    Object.assign(condition, {
      publicId: { in: args.ids },
    })
  } else if( args.projectId !== null ) {
    const project = await prisma.project.findFirst({
      where: {
        publicId: args.projectId,
      }
    })
    if( project === null ) {
      throw new Error("Project not found")
    }
    Object.assign(condition, {
      projectId: project.id,
    })
  } else {
    throw new Error("Either ids or projectId must be provided")
  }

  const issues = await prisma.issue.findMany({
    where: condition,
    include: {
      projectBoardColumnItem: {
        include: {
          projectBoardColumn: true,
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

    const projectBoardColumn = issue.projectBoardColumnItem?.projectBoardColumn

    return {
      assignee,
      childrenIds: issue.children.map((child) => child.publicId),
      createdAt: issue.createdAt.toISOString(),
      createdById: issue.creator.publicId,
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
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return response
}

import prisma from "src/lib/prisma.js"
import { IssueStatusGETSchema } from "src/schema/IssueStatus.js"

export async function getIssueStatus(publicId: string) {
  return await prisma.issueStatus.findUnique({
    where: { publicId },
  })
}

export async function getCurrentIssueStatusByIssueId(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { publicId: issueId },
  })
  if (issue === null) {
    return null
  }

  const status = await prisma.issueStatus.findUnique({
    where: { id: issue.statusId },
    include: { projectBoard: true },
  })

  if (status === null) {
    return null
  }

  const parsed = IssueStatusGETSchema.safeParse({
    id: status.publicId,
    name: status.name,
    color: status.color,
    projectBoardId: status.projectBoard?.publicId ?? null,
  })

  if (!parsed.success) {
    console.error("Failed to parse issue status:", parsed.error)
    return null
  }

  return parsed.data
}

export async function getIssueStatusOptions(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { publicId: issueId },
  })
  if (issue === null) {
    return null
  }

  const defaultStatuses = await getDefaultIssueStatuses()
  const allStatuses = [...defaultStatuses]
  if (issue.projectBoardId !== null) {
    const projectBoardStatuses = await prisma.issueStatus.findMany({
      where: {
        projectBoardId: issue.projectBoardId,
      },
      include: {
        projectBoard: true,
      },
    })

    for(const status of projectBoardStatuses) {
      if(!allStatuses.find(s => s.id === status.id)) {
        allStatuses.push(status)
      }
    }
  }

  const parsedResponse = []
  for (const status of allStatuses) {
    const parsed = IssueStatusGETSchema.safeParse({
      id: status.publicId,
      name: status.name,
      color: status.color,
      projectBoardId: status.projectBoardId
        ? status.projectBoard?.publicId ?? null
        : null,
    })

    if (!parsed.success) {
      console.error("Failed to parse issue status:", parsed.error)
      continue
    }
    parsedResponse.push(parsed.data)
  }

  return parsedResponse
}

export async function getDefaultIssueStatuses() {
  const defaultStatuses = await prisma.issueStatus.findMany({
    where: {
      projectBoardId: null,
    },
    include: {
      projectBoard: true,
    },
  })

  return defaultStatuses
  
}

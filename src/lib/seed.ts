import {
  seed,
  randCompanyName,
  randDepartment,
  randJobTitle,
  randPhoneNumber,
} from "@ngneat/falso"
import bcrypt from "bcryptjs"
import { env } from "src/config/env.js"
import prisma from "src/lib/prisma.js"

const PASSWORD_SALT_ROUNDS = env.PASSWORD_SALT_ROUNDS

seed("task_tracker_seed")

async function main() {
  const project = await prisma.project.create({
    data: {
      name: "Initial Project",
      description: "This is the first project.",
    },
  })

  const address1 = await prisma.address.create({
    data: {
      apartmentNumber: "1A",
      city: "San Francisco",
      country: "USA",
      houseNumber: "456",
      state: "CA",
      street: "Market St",
      zipCode: "94105",
    },
  })

  const email1 = "john@example.com"
  const user1 = await prisma.userCredential.create({
    data: {
      email: email1,
      password: bcrypt.hashSync("pass", PASSWORD_SALT_ROUNDS),
      profile: {
        create: {
          firstName: "John",
          lastName: "Doe",
          position: randJobTitle(),
          department: randDepartment(),
          organization: randCompanyName(),
          homePhone: randPhoneNumber(),
          workPhone: randPhoneNumber(),
          project: {
            connect: { id: project.id },
          },
          address: {
            connect: { id: address1.id },
          },
        },
      },
    },
    include: { profile: true },
  })

  if (user1.profile === null) {
    throw new Error("User profile was not created")
  }

  const address2 = await prisma.address.create({
    data: {
      apartmentNumber: "2B",
      city: "Los Angeles",
      country: "USA",
      houseNumber: "789",
      state: "CA",
      street: "Sunset Blvd",
      zipCode: "90028",
    },
  })

  const email2 = "jane@example.com"
  const user2 = await prisma.userCredential.create({
    data: {
      email: email2,
      password: bcrypt.hashSync("pass", PASSWORD_SALT_ROUNDS),
      profile: {
        create: {
          firstName: "Jane",
          lastName: "Smith",
          position: randJobTitle(),
          department: randDepartment(),
          organization: randCompanyName(),
          homePhone: randPhoneNumber(),
          workPhone: randPhoneNumber(),
          project: {
            connect: { id: project.id },
          },
          address: {
            connect: { id: address2.id },
          },
        },
      },
    },
    include: { profile: true },
  })
  if (user2.profile === null) {
    throw new Error("User profile was not created")
  }

  const defaultProjectBoard = await prisma.projectBoard.create({
    data: {
      description: "Project board to track current sprint tasks.",
      name: "Sprint Board",
      projectId: project.id,
    },
  })

  const labels = await prisma.issueLabel.createManyAndReturn({
    data: [
      { name: "bug", color: "red", projectId: project.id },
      { name: "feature", color: "blue", projectId: project.id },
      { name: "enhancement", color: "green", projectId: project.id },
    ],
    select: { id: true },
  })

  const backlogStatus = await prisma.issueStatus.create({
    data: {
      name: "backlog",
      color: "#808080",
      projectBoardId: null,
    },
  })

  await prisma.issueStatus.create({
    data: {
      name: "To do",
      color: "#0000FF",
    },
  })

  await prisma.issueStatus.create({
    data: {
      name: "In progress",
      color: "#FFA500",
    },
  })

  await prisma.issueStatus.create({
    data: {
      name: "Done",
      color: "#008000",
    },
  })

  const issue = await prisma.issue.create({
    data: {
      createdById: user1.profile.id,
      description: "This is the first issue in the project.",
      priority: "medium",
      projectId: project.id,
      statusId: backlogStatus.id,
      title: "Initial Issue",
      type: "TASK",
      labels: {
        connect: labels.map((label) => ({ id: label.id })),
      },
    },
  })

  const issue2 = await prisma.issue.create({
    data: {
      createdById: user2.profile.id,
      description: "This is the second issue in the project.",
      priority: "high",
      projectId: project.id,
      statusId: backlogStatus.id,
      title: "Second Issue",
      type: "EPIC",
      labels: {
        connect: labels.map((label) => ({ id: label.id })),
      },
    },
  })

  await prisma.projectBoardColumn.create({
    data: {
      name: "To Do",
      projectBoardId: defaultProjectBoard.id,
      position: 1,
      columnIssues: {
        create: [
          {
            issueId: issue.id,
            position: 1,
          },
        ],
      },
    },
  })

  await prisma.projectBoardColumn.create({
    data: {
      name: "In Progress",
      projectBoardId: defaultProjectBoard.id,
      position: 2,
      columnIssues: {
        create: [
          {
            issueId: issue2.id,
            position: 1,
          },
        ],
      },
    },
  })

  await prisma.projectBoardColumn.create({
    data: {
      name: "Done",
      projectBoardId: defaultProjectBoard.id,
      position: 3,
    },
  })

  await prisma.issueComment.create({
    data: {
      issueId: issue.id,
      text: "This is a comment on the initial issue.",
      authorId: user1.profile.id,
      likedBy: {
        connect: [{ id: user1.id }, { id: user2.id }],
      },
    },
  })

  await prisma.issueComment.create({
    data: {
      issueId: issue.id,
      text: "This is another comment on the initial issue.",
      authorId: user1.profile.id,
      likedBy: {
        connect: [{ id: user2.id }],
      },
    },
  })

  await prisma.address.create({
    data: {
      apartmentNumber: "5B",
      city: "New York",
      country: "USA",
      houseNumber: "123",
      state: "NY",
      street: "Main St",
      zipCode: "10001",
      users: {
        connect: { id: user1.profile.id },
      },
    },
  })

  await prisma.team.create({
    data: {
      name: "Development Team",
      description: "Team responsible for software development.",
      members: {
        connect: { id: user1.profile.id },
      },
    },
  })

  await prisma.issueHistory.createMany({
    data: [
      {
        issueId: issue.id,
        authorId: user1.profile.id,
        change: {
          topic: "title",
          previous: "Initial Issue",
          current: "Updated Issue Title",
        },
      },
      {
        issueId: issue.id,
        authorId: user2.id,
        change: {
          topic: "description",
          previous: "old description",
          current: "new description",
        },
      },
    ],
  })
}

try {
  await main()
  await prisma.$disconnect()
} catch (e) {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
}

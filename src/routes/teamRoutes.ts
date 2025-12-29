import { Router } from "express"
import prisma from "src/lib/prisma.js"
import { TeamCreateSchema, TeamGETSchema } from "src/schema/team.js"

const router = Router()

router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create team")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const teamCreationData = TeamCreateSchema.safeParse(req.body)
    if (!teamCreationData.success) {
      return res
        .status(400)
        .json({ error: "Invalid team data", details: teamCreationData.error })
    }

    const { id, publicId, members, ...newTeam } = await prisma.team.create({
      data: {
        name: teamCreationData.data.name,
        description: teamCreationData.data.description,
        members: {
          connect: teamCreationData.data.members.map((memberId) => ({
            publicId: memberId,
          })),
        },
      },
      include: { members: true },
    })

    const responseData = TeamGETSchema.safeParse({
      ...newTeam,
      id: publicId,
      createdAt: newTeam.createdAt.toISOString(),
      updatedAt: newTeam.updatedAt.toISOString(),
      members: members.map((member) => member.publicId),
    })
    if (!responseData.success) {
      return res
        .status(500)
        .json({
          error: "Failed to parse created team",
          details: responseData.error,
        })
    }

    return res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Error creating team: ", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

router.get("/:id", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to get team")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const teamData = await prisma.team.findUnique({
      where: { publicId: req.params.id },
      include: { members: true },
    })
    if (teamData === null) {
      console.error("Team not found: ", req.params.id)
      return res.status(404).json({ error: "Team not found" })
    }

    const responseData = TeamGETSchema.safeParse({
      ...teamData,
      id: teamData.publicId,
      createdAt: teamData.createdAt.toISOString(),
      updatedAt: teamData.updatedAt.toISOString(),
      members: teamData.members.map((member) => member.publicId),
    })

    if (!responseData.success) {
      console.error("Failed to parse team data: ", responseData.error)
      return res.status(500).json({ error: "Failed to parse team data" })
    }

    res.json(responseData.data)
  } catch (error) {
    console.error("Error fetching team: ", error)
    res.status(500).json({ error: "Failed to fetch team" })
  }
})

export default router

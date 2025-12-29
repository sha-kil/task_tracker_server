import express from "express"
import prisma from "src/lib/prisma.js"
import { ProjectBoardCreateSchema } from "src/schema/projectBoard.js"

const router = express.Router()


router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create project board")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const projectBoardPostData = ProjectBoardCreateSchema.safeParse(req.body)
    if (!projectBoardPostData.success) {
      return res
        .status(400)
        .json({
          error: "Invalid project board data",
          details: projectBoardPostData.error,
        })
    }

    const project = await prisma.project.findUnique({
      where: { publicId: projectBoardPostData.data.projectId }
    })

    if(project === null) {
      console.error("Project not found: ", projectBoardPostData.data.projectId)
      return res.status(404).json({ error: "Project not found" })
    }

    const { description, name } = projectBoardPostData.data
    const newProjectBoard = await prisma.projectBoard.create({
      data: { description, name, projectId: project.id },
    })

    const { id, projectId, ...projectBoardWithoutId } = newProjectBoard
    res.status(201).json(projectBoardWithoutId)
  } catch (error) {
    console.error("Error creating project board: ", error)
    res.status(500).json({ error: "Failed to create project board" })
  }
})


export default router
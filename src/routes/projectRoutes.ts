import express from "express"
import prisma from "src/lib/prisma.js"
import { ProjectGETSchema, ProjectPOSTSchema } from "src/schema/project.js"

const router = express.Router()

// Create a new project
router.post("/", async (req, res) => {
  if (req.userId === undefined) {
    console.error("Unauthorized access attempt to create project")
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const {
      success,
      data: projectPostData,
      error,
    } = ProjectPOSTSchema.safeParse(req.body)
    if (!success) {
      return res
        .status(400)
        .json({ error: "Invalid project data", details: error })
    }

    const { name, description } = projectPostData
    const newProject = await prisma.project.create({
      data: { name, description },
    })

    const { id, publicId, ...projectWithoutId } = newProject
    const responseData = ProjectGETSchema.safeParse({
      ...projectWithoutId,
      id: publicId,
    })

    if (!responseData.success) {
      console.error(
        "Error validating project data for response: ",
        responseData.error
      )
      return res
        .status(500)
        .json({ error: "Failed to process project data for response" })
    }

    res.status(201).json(responseData.data)
  } catch (error) {
    console.error("Error creating project: ", error)
    res.status(500).json({ error: "Failed to create project" })
  }
})


export default router
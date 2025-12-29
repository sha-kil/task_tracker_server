import z from "zod"

export const ProjectBoardGETSchema = z.object({
  id: z.uuidv7(),
  description: z.string().max(500),
  name: z.string().min(1).max(50),
  projectId: z.uuidv7(),
})

export const ProjectBoardCreateSchema = ProjectBoardGETSchema.omit({
  id: true,
})

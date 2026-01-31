import z from "zod"

const ProjectBoardSummarySchema = z.object({
  id: z.uuidv7(),
  name: z.string().min(1).max(50),
  description: z.string().max(500),
})


export const ProjectGETSchema = z.object({
  id: z.uuidv7(),
  description: z.string().max(500),
  name: z.string().max(100),
  boards: z.array(ProjectBoardSummarySchema).default([]),
})

export const ProjectPOSTSchema = ProjectGETSchema.omit({ id: true })

import z from "zod"

export const ProjectGETSchema = z.object({
  id: z.uuidv7(),
  description: z.string().max(500),
  name: z.string().max(100),
})

export const ProjectPOSTSchema = ProjectGETSchema.omit({ id: true })

import z from "zod"

export const IssueLabelGETSchema = z.object({
  color: z.string(),
  id: z.uuidv7(),
  name: z.string().min(1).max(50),
  projectId: z.uuidv7(),
})

export const IssueLabelCreateSchema = IssueLabelGETSchema.omit({ id: true })

export const IssueLabelUpdateSchema = IssueLabelCreateSchema.omit({
  projectId: true,
}).partial()

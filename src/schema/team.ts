import { z } from "zod"

export const TeamGETSchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string(),
  id: z.uuidv7(),
  name: z.string(),
  updatedAt: z.iso.datetime(),
})

export const TeamCreateSchema = TeamGETSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
}).extend({
  members: z.array(z.uuidv7()).optional().default([]),
})

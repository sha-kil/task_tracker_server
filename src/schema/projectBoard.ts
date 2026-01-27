import z from "zod"
import { ProjectBoardColumnItemGetSchema } from "src/schema/projectBoardColumnItem.js"

export const ProjectBoardColumnSchema = z.object({
  id: z.uuidv7(),
  name: z.string().min(1).max(50),
  position: z.number(),
  issues: ProjectBoardColumnItemGetSchema.array(),
})

export const ProjectBoardGETSchema = z.object({
  id: z.uuidv7(),
  description: z.string().max(500),
  name: z.string().min(1).max(50),
  projectId: z.uuidv7(),
  columns: ProjectBoardColumnSchema.array(),
})

export const ProjectBoardCreateSchema = ProjectBoardGETSchema.omit({
  id: true,
})

export const ProjectBoardUpdateSchema = ProjectBoardGETSchema.omit({
  id: true,
  projectId: true,
})

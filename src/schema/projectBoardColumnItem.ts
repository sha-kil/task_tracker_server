import z from "zod"

export const ProjectBoardColumnItemAssigneeSchema = z.object({
  id: z.uuidv7(),
  name: z.string().min(1).max(100),
  email: z.string().max(100),
})

export const ProjectBoardColumnItemGetSchema = z.object({
  assignee: ProjectBoardColumnItemAssigneeSchema.nullable(),
  description: z.string().max(1000),
  dueDate: z.date().nullable(),
  id: z.uuidv7(),
  issueId: z.uuidv7(),
  title: z.string().min(1).max(100),
  position: z.number(),
})

export const ProjectBoardColumnItemCreateSchema = z.object({
  issueId: z.uuidv7(),
  position: z.number().nullable(),
  projectBoardColumnId: z.uuidv7().nullable(),
  projectBoardId: z.uuidv7(),
})

export const ProjectBoardColumnItemUpdateSchema = z.object({
  position: z.number(),
  projectBoardColumnId: z.uuidv7(),
})

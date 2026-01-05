import z from "zod"

export const IssueStatusGETSchema = z.object({
  color: z.string().optional(),
  id: z.uuidv7(),
  name: z.string().min(1).max(50),
  projectBoardId: z.uuidv7().nullable().default(null),
})

export const IssueStatusCreateSchema = IssueStatusGETSchema.omit({
  id: true,
}).extend({
  projectBoardId: z.uuidv7(),
})

export const IssueStatusUpdateSchema = IssueStatusCreateSchema.omit({
  projectBoardId: true,
}).partial()

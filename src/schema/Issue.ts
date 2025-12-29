import z from "zod"

export const IssueGETSchema = z.object({
  assigneeId: z.uuidv7().nullable().default(null),
  childrenIds: z.array(z.uuidv7()).default([]),
  commentIds: z.array(z.uuidv7()).default([]),
  createdAt: z.iso.datetime(),
  createdById: z.uuidv7(),
  description: z.string(),
  dueDate: z.iso.datetime({
    message: "Due date must be a valid ISO datetime string",
    offset: true
  }).nullable().default(null),
  id: z.uuidv7(),
  labelIds: z.array(z.uuidv7()).default([]),
  parentId: z.uuidv7().nullable().default(null),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  projectId: z.uuidv7(),
  projectBoardId: z.uuidv7().nullable().default(null),
  startDate: z.iso.datetime().nullable().default(null),
  statusId: z.uuidv7(),
  statusOptionIds: z.array(z.uuidv7()).default([]),
  title: z.string(),
  type: z.enum(["EPIC", "STORY", "TASK"]),
  updatedAt: z.iso.datetime(),
})

export const IssueCreateSchema = IssueGETSchema.omit({
  childrenIds: true,
  commentIds: true,
  createdAt: true,
  createdById: true,
  id: true,
  labelIds: true,
  publicId: true,
  statusOptionIds: true,
  updatedAt: true,
})

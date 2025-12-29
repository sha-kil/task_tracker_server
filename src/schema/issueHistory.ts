import z from "zod"

const IssueHistoryChange = z.object({
  current: z.string().nullable().default(null),
  previous: z.string().nullable().default(null),
  topic: z.string(),
})

export const IssueHistoryGETSchema = z.object({
  changedAt: z.iso.datetime(),
  change: IssueHistoryChange,
  id: z.uuidv7(),
  issueId: z.uuidv7(),
  authorId: z.uuidv7(),
})

export const IssueHistoryCreateSchema = IssueHistoryGETSchema.omit({
  id: true,
  changedAt: true,
})

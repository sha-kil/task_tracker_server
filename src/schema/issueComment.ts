import z from "zod"

export const IssueCommentGETSchema = z.object({
  authorId: z.uuidv7(),
  createdAt: z.iso.datetime(),
  id: z.uuidv7(),
  issueId: z.uuidv7(),
  text: z.string(),
  updatedAt: z.iso.datetime(),
})

export const IssueCommentCreateSchema = IssueCommentGETSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  authorId: true,
})

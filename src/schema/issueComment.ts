import z from "zod"

export const IssueCommentGETSchema = z.object({
  authorId: z.uuidv7(),
  createdAt: z.iso.datetime(),
  id: z.uuidv7(),
  issueId: z.uuidv7(),
  likedByUserIds: z.array(z.uuidv7()).default([]),
  parentId: z.uuidv7().nullable().default(null),
  text: z.string(),
  updatedAt: z.iso.datetime(),
})

export const IssueCommentCreateSchema = IssueCommentGETSchema.omit({
  createdAt: true,
  id: true,
  likedByUserIds: true,
  updatedAt: true,
  authorId: true,
})

export const IssueCommentUpdateSchema = z
  .object({
    text: z.string(),
    likedByUserIds: z.array(z.uuidv7()),
  })
  .partial()


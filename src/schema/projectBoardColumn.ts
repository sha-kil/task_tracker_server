import z from "zod";

export const ProjectBoardColumnCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500),
  projectBoardId: z.uuidv7(),
  position: z.number(),
})

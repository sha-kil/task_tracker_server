import express, { type Request, type Response } from "express"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import { ProjectBoardColumnCreateSchema } from "src/schema/projectBoardColumn.js"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(401, "Unauthorized")
    }

    const parsedPostData = ProjectBoardColumnCreateSchema.safeParse(
      req.body,
    )
    if(!parsedPostData.success) {
      throw new HttpError(400, "Invalid request data")
    }

    const postData = parsedPostData.data
    const projectBoard = await prisma.projectBoard.findUnique({
      where: {
        publicId: postData.projectBoardId,
        project: {
          user: {
            some: {
              userCredential: {
                id: req.userId,
              },
            },
          },
        },
      },
      include: { project: true },
    })
    if(projectBoard === null) {
      throw new HttpError(404, "Project board not found")
    }

    const newColumn = await prisma.projectBoardColumn.create({
      data: {
        name: postData.name,
        description: postData.description,
        projectBoardId: projectBoard.id,
        position: postData.position,
      },
    })

    res.status(201).json({
      id: newColumn.publicId,
      name: newColumn.name,
      description: newColumn.description,
      position: newColumn.position,
      projectBoardId: projectBoard.publicId,
    })
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : "Internal server error")
    res.status(
      error instanceof HttpError ? error.statusCode : 500,
    ).json({
      message:
        error instanceof HttpError
          ? error.message
          : "Internal server error",
    })
  }
})

export default router
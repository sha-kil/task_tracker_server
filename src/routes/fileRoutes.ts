import { Router, type Request, type Response } from "express"
import { env } from "src/config/env.js"
import { getFileUrlById } from "src/lib/file.js"
import { HttpError } from "src/lib/httpError.js"
import prisma from "src/lib/prisma.js"
import { fileExists, generateUploadUrl } from "src/lib/s3Client.js"
import { sanitizeFileName } from "src/lib/sanitize.js"
import { v7 as uuidv7 } from 'uuid'

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const fileId = req.params.id
    if (!fileId || typeof fileId !== "string" || fileId.trim() === "") {
      throw new HttpError(400, "File ID is required")
    }

    const url = await getFileUrlById(fileId)

    res.json({
      downloadUrl: url,
    })
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to fetch file" })
  }
})

router.post("/init", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const { fileName, fileType } = req.body
    if(!fileName || !fileType || typeof fileName !== "string" || typeof fileType !== "string") {
      throw new HttpError(400, "File name and type are required")
    }

    // Sanitize filename: remove path traversal sequences, directory separators, and control characters
    const sanitizedFileName = sanitizeFileName(fileName)
    if (!sanitizedFileName) {
      throw new HttpError(400, "Invalid file name")
    }

    const s3Key = `uploads/${uuidv7()}-${sanitizedFileName}`

    const fileRecord = await prisma.file.create({
      data: {
        filename: sanitizedFileName,
        s3Key: s3Key,
        uploadedById: req.userId,
        uploadedAt: new Date(),
      },
    })

    const presignedData = await generateUploadUrl(
      env.AWS_S3_BUCKET_NAME,
      fileRecord.s3Key,
      fileType
    )

    res.json({ presignedData, fileId: fileRecord.publicId })
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to initiate file upload" })
  }
})

router.post("/complete/:id", async (req: Request, res: Response) => {
  try {
    if (req.userId === undefined) {
      throw new HttpError(403, "Unauthorized")
    }

    const fileId = req.params.id
    if (!fileId || typeof fileId !== "string" || fileId.trim() === "") {
      throw new HttpError(400, "File ID is required")
    }

    const file = await prisma.file.findUnique({ where: { publicId: fileId } })
    if (!file) {
      throw new HttpError(404, "File not found")
    }

    if (file.uploadedById !== req.userId) {
      throw new HttpError(
        403,
        "You do not have permission to complete this upload"
      )
    }
    const exists = await fileExists(env.AWS_S3_BUCKET_NAME, file.s3Key)
    if (!exists) {
      throw new HttpError(
        400,
        "File not found in storage. Upload may have failed."
      )
    }

    await prisma.file.update({
      where: { id: file.id },
      data: { status: "UPLOADED" },
    })

    res.sendStatus(200)
  } catch (error: HttpError | unknown) {
    console.error(error instanceof HttpError ? error.message : error)
    res
      .status(error instanceof HttpError ? error.statusCode : 500)
      .json({ error: "Failed to complete file upload" })
  }
})

export default router

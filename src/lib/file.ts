import { env } from "src/config/env.js"
import prisma from "src/lib/prisma.js"
import { getPresignedDownloadUrl } from "./s3Client.js"

export async function getFileUrlById(fileId: string) {
  const fileRecord = await prisma.file.findUnique({
    where: { publicId: fileId },
  })

  if (!fileRecord) return null

  const downloadUrl = await getPresignedDownloadUrl(
    env.AWS_S3_BUCKET_NAME,
    fileRecord.s3Key
  )

  return downloadUrl
}

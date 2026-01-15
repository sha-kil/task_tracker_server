import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "src/config/env.js"

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function getPresignedDownloadUrl(bucket: string, key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  // The URL will expire in 3600 seconds (1 hour)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return url
}

export async function generateUploadUrl(bucket: string, key: string, fileType: string) {
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: bucket,
    Key: key,
    Expires: 600, // URL expires in 10 minutes
    Conditions: [
      ["content-length-range", 0, 10 * 1024 * 1024], // Max 10MB
      ["starts-with", "$Content-Type", ""],        // Allows any content type (or specify)
    ],
    Fields: {
      "Content-Type": fileType, // Pre-lock the content type
    },
  })

  return { url, fields }
}

export async function fileExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    const exists = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    return exists.$metadata.httpStatusCode === 200
  } catch (error: any) {
    // Return false for NotFound/NoSuchKey errors (404)
    if (
      error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return false
    }
    // Rethrow other unexpected errors
    throw error
  }
}

export async function uploadFileToS3(file: File, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: file.type,
  })

  try {
    const response = await s3Client.send(command)
    console.log("Success:", response)
    return response
  } catch (err) {
    console.error("Error uploading file:", err)
    throw err
  }
}

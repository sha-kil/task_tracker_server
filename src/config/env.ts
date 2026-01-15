import * as z from "zod"
import dotenv from "dotenv"

dotenv.config({path: ".env"})

function createEnv() {
  const envSchema = z.object({
    DATABASE_URL: z.string(),
    PORT: z.string(),
    JWT_SECRET: z.string(),
    PASSWORD_SALT_ROUNDS: z.string().transform((val) => parseInt(val, 10)),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    AWS_S3_BUCKET_NAME: z.string(),
  })

  const parsedEnv = envSchema.safeParse(process.env)
  if (!parsedEnv.success) {
    console.error(
      "❌ Invalid environment variables:",
      z.treeifyError(parsedEnv.error).errors.join(", ")
    )
    throw new Error("Invalid environment variables")
  }

  return parsedEnv.data
}

export const env = createEnv()

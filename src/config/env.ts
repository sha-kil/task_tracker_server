import * as z from "zod"
import dotenv from "dotenv"

dotenv.config({path: ".env"})

function createEnv() {
  const envSchema = z.object({
    DATABASE_URL: z.string(),
    PORT: z.string(),
    JWT_SECRET: z.string(),
    PASSWORD_SALT_ROUNDS: z.string().transform((val) => parseInt(val, 10)),
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

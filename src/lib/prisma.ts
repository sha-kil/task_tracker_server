import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
// import { PrismaClient } from "src/db/client/client.js"
import { PrismaClient } from "@prismaClient/client.js"
import { env } from "src/config/env.js"

const connectionString = env.DATABASE_URL
console.log("Database connection string:", connectionString)

const adapter = new PrismaPg({
  connectionString: connectionString,
})
const prisma = new PrismaClient({
  adapter,
})

export default prisma

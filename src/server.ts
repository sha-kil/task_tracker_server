import express from "express"
import { env } from "src/config/env.js"
import { fileURLToPath } from "url"
import path, { dirname } from "path"
import authMiddleware from "src/middleware/authMiddleware.js"
import authRoutes from "src/routes/authRoutes.js"
import userRoutes from "src/routes/userRoutes.js"
import projectRoutes from "src/routes/projectRoutes.js"
import projectBoardRoutes from "src/routes/projectBoardRoutes.js"
import issueStatusRoutes from "src/routes/IssueStatusRoutes.js"
import issueLabelRoutes from "src/routes/IssueLabelRoutes.js"
import issueRoutes from "src/routes/issueRoutes.js"
import issueCommentRoutes from "src/routes/issueCommentRoutes.js"
import addressRoutes from "src/routes/addressRoutes.js"
import teamRoutes from "src/routes/teamRoutes.js"
import issueHistoryRoutes from "src/routes/issueHistoryRoutes.js"
import graphQLRouter from "src/routes/graphql/graphqlRoutes.js"
import cors from "cors"

const isProduction = process.env.NODE_ENV === "production"

const allowedOrigins = isProduction
  ? ["put production domain here"]
  : ["http://localhost:5173"]

const app = express()
const PORT = env.PORT

// Get the file path from the URL of the current module
const __filename = fileURLToPath(import.meta.url)
// Get the directory name from the file path
const __dirname = dirname(__filename)

// Middleware
app.use(express.json())
// Serve static files from the "public" directory
// Tells Express to serve static files from the "public" folder as static assets
// Any requests for the css files will be resolved to the public directory.
app.use(express.static(path.join(__dirname, "public")))
// CORS Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    // methods: ['GET', 'POST', "PUT", "DELETE", 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Type']
  })
)

app.get("/", (_req, res) => {
  res.send("Hello, World!")
})

// Routes
app.use("/auth", authRoutes)
app.use("/user", authMiddleware, userRoutes)
app.use("/project", authMiddleware, projectRoutes)
app.use("/project-board", authMiddleware, projectBoardRoutes)
app.use("/issue-status", authMiddleware, issueStatusRoutes)
app.use("/issue-label", authMiddleware, issueLabelRoutes)
app.use("/issue", authMiddleware, issueRoutes)
app.use("/issue-comment", authMiddleware, issueCommentRoutes)
app.use("/address", authMiddleware, addressRoutes)
app.use("/team", authMiddleware, teamRoutes)
app.use("/issue-history", authMiddleware, issueHistoryRoutes)

app.use("/graphql", authMiddleware, graphQLRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

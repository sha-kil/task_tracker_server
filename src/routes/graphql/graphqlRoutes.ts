import { Router } from "express"
import { createHandler } from "graphql-http/lib/use/express"
import { schema } from "src/routes/graphql/schema.js"
import { resolvers } from "src/routes/graphql/resolvers.js"

const router = Router()

router.all("/", (req, res, next) => {
  const userId = req.userId
  const handler = createHandler({
    schema,
    rootValue: resolvers,
    context: { userId, req, res },
    formatError: (err) => {
      console.error(err)
      return err
    },
  })
  return handler(req, res, next)
})

export default router

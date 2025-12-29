import { env } from "src/config/env.js"
import jwt, { type JwtPayload } from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express"
import { extractCookieToken } from "src/lib/token.js"

const secret = env.JWT_SECRET

// --- Interface for JWT payload with id ---
interface CustomJwtPayload extends JwtPayload {
  id: string 
}

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = extractCookieToken(req)
  if (token === null) {
    console.error("No token provided")
    return res.status(403).json({ error: "Forbidden" })
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err)
      return res.status(403).json({ error: "Forbidden" })
    }
    if (
      decoded !== undefined &&
      (decoded as CustomJwtPayload).id !== undefined
    ) {
      try {
        req.userId = BigInt((decoded as CustomJwtPayload).id)
      } catch (e) {
        console.error("Failed to convert user ID to BigInt:", e)
        return res.status(403).json({ error: "Forbidden" })
      }
    } else {
      console.error("Invalid token payload")
      return res.status(403).json({ error: "Forbidden" })
    }
    next()
  })
}

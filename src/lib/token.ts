import jwt from "jsonwebtoken"
import type { Request, Response } from "express"
import { env } from "src/config/env.js"

const secret = env.JWT_SECRET
const TOKEN_COOKIE_NAME = "auth_token"

export function extractCookieToken(req: Request): string | null {
  const cookieString = req.headers.cookie
  if (cookieString === undefined) {
    return null
  }

  const cookies = cookieString.split("; ").reduce((acc, cookie) => {
    const [name, value] = cookie.split("=")
    if (name === undefined || value === undefined) {
      return acc
    }
    acc[name] = value
    return acc
  }, {} as Record<string, string>)

  return cookies[TOKEN_COOKIE_NAME] || null
}

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, secret, { expiresIn: "1h" })
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600000, // 1 hour
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })
}

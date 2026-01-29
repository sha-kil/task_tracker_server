import { HttpError } from "./httpError.js"
import type { Response } from "express"

export function handleError(error: HttpError | unknown, res: Response): void {
  const isHttpError = error instanceof HttpError
  console.error(
    isHttpError ? `HTTP Error ${error.statusCode}: ${error.message}` : error,
  )
  res.status(isHttpError ? error.statusCode : 500).json({
    error: isHttpError ? error.message : "An unexpected error occurred",
  })
}
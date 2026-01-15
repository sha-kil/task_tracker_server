export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\.\./g, "") // Remove ..
    .replace(/[\/\\]/g, "-") // Replace / and \ with -
    .replace(/[\x00-\x1f\x80-\x9f]/g, "") // Remove control characters
    .replace(/^\.+/, "") // Remove leading dots
    .trim()
    .slice(0, 255) // Limit length
}

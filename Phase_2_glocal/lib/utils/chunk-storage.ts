// Temporary in-memory storage for chunks (in production, use Redis or disk storage)
export const chunkStorage = new Map<string, Map<number, Buffer>>()

// Upload sessions storage
export interface UploadSession {
  uploadId: string
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: Set<number>
  [key: string]: unknown
}

export let uploadSessions: Map<string, UploadSession> | null = null

export function setUploadSessions(sessions: Map<string, UploadSession>) {
  uploadSessions = sessions
}

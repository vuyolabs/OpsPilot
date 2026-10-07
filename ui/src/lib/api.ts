export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

// FastAPI returns { detail: "..." } for errors.
export async function readError(response: Response) {
  try {
    const body = await response.json()
    if (typeof body?.detail === "string") return body.detail
  } catch {
    // Not JSON; fall through to the generic message.
  }
  return `Request failed (${response.status}).`
}

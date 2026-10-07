import { API_URL, ApiError, readError } from "@/lib/api"

export { API_URL, readError }

export type AdminDocument = {
  id: string
  filename: string
  chunk_count: number
  size_bytes: number | null
  uploaded_by: string | null
  created_at: string
}

export async function fetchDocuments(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/admin/documents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (!response.ok) throw new ApiError(await readError(response), response.status)

  const body: { documents: AdminDocument[] } = await response.json()
  return body.documents
}

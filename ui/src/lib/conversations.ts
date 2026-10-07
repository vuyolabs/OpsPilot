import type { UIMessage } from "ai"

import { API_URL, ApiError, readError } from "@/lib/api"

export type ConversationSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type ConversationDetail = ConversationSummary & {
  messages: UIMessage[]
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1/conversations${path}`, {
    ...init,
    headers: { ...authHeaders(accessToken), ...init.headers },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status)
  }

  return (response.status === 204 ? undefined : await response.json()) as T
}

export async function fetchConversations(accessToken: string) {
  const body = await request<{ conversations: ConversationSummary[] }>(
    "",
    accessToken
  )
  return body.conversations
}

// Returns null when the conversation doesn't exist or isn't the user's.
export async function fetchConversation(accessToken: string, id: string) {
  try {
    return await request<ConversationDetail>(`/${id}`, accessToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export function renameConversation(
  accessToken: string,
  id: string,
  title: string
) {
  return request<ConversationSummary>(`/${id}`, accessToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

export function deleteConversation(accessToken: string, id: string) {
  return request<void>(`/${id}`, accessToken, { method: "DELETE" })
}

// Mirrors make_title() on the server so the sidebar shows the same
// title before the list is reloaded.
export function makeTitle(text: string) {
  const title = text.split(/\s+/).filter(Boolean).join(" ")
  if (title.length > 80) return `${title.slice(0, 79).trimEnd()}…`
  return title || "New chat"
}

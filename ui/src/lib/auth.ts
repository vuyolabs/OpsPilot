import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type SessionUser = {
  id: string
  email: string
  isAdmin: boolean
}

// The role lives in app_metadata, which only the server's secret key
// can change. It is set with `server.scripts.set_role`.
export function isAdmin(user: User) {
  return user.app_metadata?.role === "admin"
}

// getUser() asks Supabase to verify the session, so its result can be
// trusted for authorization (unlike getSession(), which only reads cookies).
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? "",
    isAdmin: isAdmin(user),
  }
})

// Access token for calling the FastAPI backend from the server.
export async function getAccessToken() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

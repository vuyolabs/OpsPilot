import { createClient } from "@/lib/supabase/client"

export async function getBrowserAccessToken() {
  const {
    data: { session },
  } = await createClient().auth.getSession()

  if (!session) throw new Error("Your session has expired. Sign in again.")

  return session.access_token
}

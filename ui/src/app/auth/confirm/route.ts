import { NextResponse, type NextRequest } from "next/server"
import {
  isAuthPKCECodeVerifierMissingError,
  type EmailOtpType,
} from "@supabase/supabase-js"

import { safeRedirectPath } from "@/lib/safe-redirect"
import { createClient } from "@/lib/supabase/server"

// Landing route for the link in Supabase's confirmation email.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeRedirectPath(searchParams.get("next"))

  const loginWith = (params: Record<string, string>) =>
    NextResponse.redirect(
      `${origin}/login?${new URLSearchParams({ ...params, next })}`
    )

  // Supabase sends errors (e.g. an expired or already-used link) as query
  // params instead of a code.
  const linkError = searchParams.get("error_code") ?? searchParams.get("error")
  if (linkError) {
    console.error("Email confirmation link error", {
      error: linkError,
      description: searchParams.get("error_description"),
    })
    return loginWith({
      error: linkError === "otp_expired" ? "link_expired" : "confirmation_failed",
    })
  }

  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation code") }

  if (!error) return NextResponse.redirect(`${origin}${next}`)

  console.error("Email confirmation failed", error)

  // A link opened twice still leaves the user signed in from the first time.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return NextResponse.redirect(`${origin}${next}`)

  // The link was opened in a different browser than the one used to sign
  // up, so the PKCE verifier cookie is missing. Supabase has already
  // confirmed the email by this point; the user only needs to sign in.
  if (isAuthPKCECodeVerifierMissingError(error)) {
    return loginWith({ confirmed: "1" })
  }

  return loginWith({ error: "confirmation_failed" })
}

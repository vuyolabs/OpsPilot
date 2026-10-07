import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login", "/auth"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

// Refreshes the Supabase session cookie on every request and sends
// signed-out visitors to the login page.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // Don't run code between createServerClient and getClaims():
  // it would make random sign-outs very hard to debug.
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims)
  const { pathname } = request.nextUrl

  if (!isSignedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`
    return redirectWithCookies(url, response)
  }

  if (isSignedIn && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}

// Keep any refreshed session cookies when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

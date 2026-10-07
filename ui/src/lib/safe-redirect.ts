// Only allow same-site relative paths, so `?next=` can't send users
// to another website after they sign in.
export function safeRedirectPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/"
  return path
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon, Database02Icon } from "@hugeicons/core-free-icons"

import { getCurrentUser } from "@/lib/auth"
import { UserMenu } from "@/components/auth/user-menu"
import { Logo } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Admin · OpsPilot",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser()

  // Non-admins get the regular 404 page, so the admin area looks
  // exactly like a route that doesn't exist.
  if (!user?.isAdmin) notFound()

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <Logo />
            </Link>
            <Separator orientation="vertical" className="h-5!" />
            <Badge variant="outline" className="text-muted-foreground">
              Admin console
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/" />}
              nativeButton={false}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} data-icon="inline-start" />
              <span className="hidden sm:inline">Back to assistant</span>
            </Button>
            <UserMenu user={user} />
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-1 px-4 sm:px-6" aria-label="Admin">
          <span
            aria-current="page"
            className="flex items-center gap-1.5 border-b-2 border-primary px-2 pb-2.5 text-[13px] font-medium"
          >
            <HugeiconsIcon icon={Database02Icon} className="size-4" />
            Knowledge base
          </span>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}

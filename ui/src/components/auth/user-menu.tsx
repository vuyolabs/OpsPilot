"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  DashboardSquare02Icon,
  Logout03Icon,
  Moon02Icon,
  Sun01Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"

import type { SessionUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

const THEMES = [
  { value: "light", label: "Light", icon: Sun01Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: ComputerIcon },
] as const

// "jane.doe@acme.com" -> "Jane Doe"
export function displayName(email: string) {
  const local = email.split("@")[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function initials(email: string) {
  const parts = displayName(email).split(" ")
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
}

export function UserAvatar({
  user,
  size = "sm",
}: {
  user: SessionUser
  size?: "sm" | "default"
}) {
  return (
    <Avatar size={size} className="rounded-lg after:rounded-lg">
      <AvatarFallback className="rounded-lg bg-brand-subtle text-[11px] font-semibold text-primary uppercase">
        {initials(user.email) || "?"}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserMenu({
  user,
  variant = "icon",
}: {
  user: SessionUser
  // "sidebar" shows the name and email in a full-width row for the sidebar footer.
  variant?: "icon" | "sidebar"
}) {
  const router = useRouter()
  const { theme = "system", setTheme } = useTheme()

  async function signOut() {
    await createClient().auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      {variant === "sidebar" ? (
        <DropdownMenuTrigger
          render={<SidebarMenuButton size="lg" aria-label="Account menu" />}
        >
          <UserAvatar user={user} size="default" />
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate font-medium">
              {displayName(user.email)}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </div>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            className="ml-auto size-4 text-muted-foreground"
          />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              aria-label="Account menu"
            />
          }
        >
          <UserAvatar user={user} />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <UserAvatar user={user} size="default" />
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-[13px] font-medium text-foreground">
                {displayName(user.email)}
              </span>
              <span className="truncate text-xs font-normal">{user.email}</span>
            </div>
            <Badge variant={user.isAdmin ? "default" : "secondary"}>
              {user.isAdmin ? "Admin" : "Member"}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Rendered only for admins, so normal users never see the route. */}
        {user.isAdmin && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <HugeiconsIcon icon={DashboardSquare02Icon} />
            Admin console
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon
              icon={THEMES.find((t) => t.value === theme)?.icon ?? ComputerIcon}
            />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {THEMES.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <HugeiconsIcon icon={option.icon} />
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <HugeiconsIcon icon={Logout03Icon} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

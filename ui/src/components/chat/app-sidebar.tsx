"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  Cancel01Icon,
  Database02Icon,
  Delete02Icon,
  Loading03Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import type { SessionUser } from "@/lib/auth"
import { getBrowserAccessToken } from "@/lib/access-token"
import {
  deleteConversation,
  renameConversation,
  type ConversationSummary,
} from "@/lib/conversations"
import { UserMenu } from "@/components/auth/user-menu"
import { Logo } from "@/components/brand/logo"
import { useConversations } from "@/components/chat/conversations-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

const DAY_MS = 24 * 60 * 60 * 1000

// Buckets conversations by recency, keeping the server's ordering within each.
function groupByDate(conversations: ConversationSummary[]) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const today = startOfToday.getTime()

  const buckets: { label: string; since: number; items: ConversationSummary[] }[] = [
    { label: "Today", since: today, items: [] },
    { label: "Yesterday", since: today - DAY_MS, items: [] },
    { label: "Previous 7 days", since: today - 7 * DAY_MS, items: [] },
    { label: "Previous 30 days", since: today - 30 * DAY_MS, items: [] },
    { label: "Older", since: -Infinity, items: [] },
  ]

  for (const conversation of conversations) {
    const time = new Date(conversation.updated_at).getTime()
    buckets.find((bucket) => time >= bucket.since)?.items.push(conversation)
  }

  return buckets.filter((bucket) => bucket.items.length > 0)
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const { conversations, startNewChat } = useConversations()
  const { isMobile, setOpenMobile } = useSidebar()
  const [query, setQuery] = React.useState("")
  const [renaming, setRenaming] = React.useState<ConversationSummary | null>(null)
  const [deleting, setDeleting] = React.useState<ConversationSummary | null>(null)

  const groups = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = needle
      ? conversations.filter((c) => c.title.toLowerCase().includes(needle))
      : conversations
    return groupByDate(matches)
  }, [conversations, query])

  function closeOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-3 pt-3">
        <Link
          href="/"
          onClick={() => {
            startNewChat()
            closeOnMobile()
          }}
          className="w-fit rounded-lg px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <Button
          className="w-full justify-start"
          onClick={() => {
            startNewChat()
            closeOnMobile()
          }}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
          New chat
        </Button>
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <SidebarInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="pr-8 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/" || pathname.startsWith("/c/")}
                  render={<Link href="/" onClick={closeOnMobile} />}
                >
                  <HugeiconsIcon icon={BubbleChatIcon} />
                  <span>Assistant</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin" onClick={closeOnMobile} />}
                  >
                    <HugeiconsIcon icon={Database02Icon} />
                    <span>Knowledge base</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {conversations.length === 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>History</SidebarGroupLabel>
            <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
              Your conversations will appear here once you start chatting.
            </p>
          </SidebarGroup>
        ) : groups.length === 0 ? (
          <SidebarGroup>
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No conversations match &ldquo;{query}&rdquo;.
            </p>
          </SidebarGroup>
        ) : (
          groups.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={pathname === `/c/${conversation.id}`}
                        render={
                          <Link
                            href={`/c/${conversation.id}`}
                            onClick={closeOnMobile}
                          />
                        }
                      >
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <SidebarMenuAction
                              showOnHover
                              aria-label={`Options for ${conversation.title}`}
                            />
                          }
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="w-44">
                          <DropdownMenuItem onClick={() => setRenaming(conversation)}>
                            <HugeiconsIcon icon={PencilEdit02Icon} />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(conversation)}
                          >
                            <HugeiconsIcon icon={Delete02Icon} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu user={user} variant="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

      <RenameDialog conversation={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog conversation={deleting} onClose={() => setDeleting(null)} />
    </Sidebar>
  )
}

function RenameDialog({
  conversation,
  onClose,
}: {
  conversation: ConversationSummary | null
  onClose: () => void
}) {
  const { renameLocal } = useConversations()
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conversation) return

    const title = String(new FormData(event.currentTarget).get("title")).trim()
    if (!title || title === conversation.title) {
      onClose()
      return
    }

    setPending(true)
    try {
      const updated = await renameConversation(
        await getBrowserAccessToken(),
        conversation.id,
        title
      )
      renameLocal(updated.id, updated.title)
      onClose()
    } catch (error) {
      toast.error("Couldn't rename conversation", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={conversation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this chat a name you&apos;ll recognise.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="conversation-title">Title</FieldLabel>
            <Input
              id="conversation-title"
              name="title"
              // Remount per conversation so the field starts with its title.
              key={conversation?.id}
              defaultValue={conversation?.title}
              maxLength={200}
              required
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="animate-spin"
                  data-icon="inline-start"
                />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  conversation,
  onClose,
}: {
  conversation: ConversationSummary | null
  onClose: () => void
}) {
  const pathname = usePathname()
  const { removeLocal, startNewChat } = useConversations()
  const [pending, setPending] = React.useState(false)

  async function handleDelete() {
    if (!conversation) return

    setPending(true)
    try {
      await deleteConversation(await getBrowserAccessToken(), conversation.id)
      removeLocal(conversation.id)
      onClose()

      // Leave the page if it was showing the deleted conversation.
      if (pathname === `/c/${conversation.id}`) startNewChat()
    } catch (error) {
      toast.error("Couldn't delete conversation", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={conversation !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {conversation?.title}
            </span>{" "}
            and all its messages will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending && (
              <HugeiconsIcon
                icon={Loading03Icon}
                className="animate-spin"
                data-icon="inline-start"
              />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

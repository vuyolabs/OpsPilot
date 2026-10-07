import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getAccessToken, getCurrentUser } from "@/lib/auth"
import { fetchConversations, type ConversationSummary } from "@/lib/conversations"
import { AppSidebar } from "@/components/chat/app-sidebar"
import { ConversationsProvider } from "@/components/chat/conversations-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function ChatLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  let conversations: ConversationSummary[] = []
  try {
    const token = await getAccessToken()
    if (token) conversations = await fetchConversations(token)
  } catch (error) {
    // The chat still works without history; the list fills in on next load.
    console.error("Failed to load conversations", error)
  }

  // Remember whether the user collapsed the sidebar.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <ConversationsProvider initialConversations={conversations}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar user={user} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ConversationsProvider>
  )
}

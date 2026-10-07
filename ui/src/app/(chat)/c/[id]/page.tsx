import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getAccessToken, getCurrentUser } from "@/lib/auth"
import { fetchConversation } from "@/lib/conversations"
import { Chat } from "@/components/chat/chat"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata: Metadata = {
  title: "Chat · OpsPilot",
}

export default async function ConversationPage({
  params,
}: PageProps<"/c/[id]">) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const user = await getCurrentUser()
  const token = await getAccessToken()
  if (!user || !token) redirect("/login")

  // The API answers 404 for other users' conversations, so this only
  // ever loads the signed-in user's own messages.
  const conversation = await fetchConversation(token, id)
  if (!conversation) notFound()

  return (
    <Chat
      key={conversation.id}
      id={conversation.id}
      initialMessages={conversation.messages}
    />
  )
}

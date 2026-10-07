"use client"

import { Chat } from "@/components/chat/chat"
import { useConversations } from "@/components/chat/conversations-provider"

// Keyed so that "New chat" always starts a fresh conversation, even when
// the current one was started on this same page.
export function NewChat() {
  const { newChatKey } = useConversations()

  return <Chat key={newChatKey} />
}

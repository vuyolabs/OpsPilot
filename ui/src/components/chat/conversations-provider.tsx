"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { ConversationSummary } from "@/lib/conversations"

type ConversationsContextValue = {
  conversations: ConversationSummary[]
  // Changes on every "New chat" so the chat on "/" remounts with a fresh id.
  newChatKey: number
  startNewChat: () => void
  touchConversation: (id: string, title: string) => void
  renameLocal: (id: string, title: string) => void
  removeLocal: (id: string) => void
}

const ConversationsContext =
  React.createContext<ConversationsContextValue | null>(null)

export function useConversations() {
  const context = React.useContext(ConversationsContext)
  if (!context) {
    throw new Error("useConversations must be used within ConversationsProvider")
  }
  return context
}

export function ConversationsProvider({
  initialConversations,
  children,
}: {
  initialConversations: ConversationSummary[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [conversations, setConversations] = React.useState(initialConversations)
  const [newChatKey, setNewChatKey] = React.useState(0)

  // Pick up server changes when the layout re-renders (e.g. router.refresh()).
  const [previousInitial, setPreviousInitial] = React.useState(initialConversations)
  if (initialConversations !== previousInitial) {
    setPreviousInitial(initialConversations)
    setConversations(initialConversations)
  }

  const value = React.useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      newChatKey,
      startNewChat() {
        setNewChatKey((key) => key + 1)
        router.push("/")
      },
      // Moves the conversation to the top, adding it if it's new.
      touchConversation(id, title) {
        setConversations((current) => {
          const now = new Date().toISOString()
          const existing = current.find((item) => item.id === id)
          const updated: ConversationSummary = existing
            ? { ...existing, updated_at: now }
            : { id, title, created_at: now, updated_at: now }
          return [updated, ...current.filter((item) => item.id !== id)]
        })
      },
      renameLocal(id, title) {
        setConversations((current) =>
          current.map((item) => (item.id === id ? { ...item, title } : item))
        )
      },
      removeLocal(id) {
        setConversations((current) => current.filter((item) => item.id !== id))
      },
    }),
    [conversations, newChatKey, router]
  )

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

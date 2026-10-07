"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Streamdown } from "streamdown"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Alert02Icon,
  ArrowUp02Icon,
  Copy01Icon,
  LaptopIcon,
  Pdf02Icon,
  PencilEdit02Icon,
  RefreshIcon,
  SquareLock02Icon,
  StopIcon,
  Tick02Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

import { API_URL } from "@/lib/api"
import { makeTitle } from "@/lib/conversations"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/brand/logo"
import { useConversations } from "@/components/chat/conversations-provider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const transport = new DefaultChatTransport({
  api: `${API_URL}/api/v1/chat`,
  // Resolved per request so a refreshed access token is always used.
  headers: async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await createClient().auth.getSession()

    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  },
})

const SUGGESTIONS = [
  {
    icon: UserGroupIcon,
    category: "People & HR",
    prompt: "What is our leave policy?",
  },
  {
    icon: LaptopIcon,
    category: "IT & equipment",
    prompt: "How do I request a new laptop?",
  },
  {
    icon: Wallet01Icon,
    category: "Finance",
    prompt: "Who approves travel expenses?",
  },
  {
    icon: Airplane01Icon,
    category: "Onboarding",
    prompt: "Summarise the onboarding process.",
  },
]

export function Chat({
  id,
  initialMessages,
}: {
  // Omitted for a new chat; a fresh id is generated and becomes the
  // conversation id once the first message is sent.
  id?: string
  initialMessages?: UIMessage[]
}) {
  const pathname = usePathname()
  const { conversations, startNewChat, touchConversation } = useConversations()
  const [chatId] = React.useState(() => id ?? crypto.randomUUID())
  const [input, setInput] = React.useState("")
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  })

  const title =
    conversations.find((conversation) => conversation.id === chatId)?.title ??
    "New chat"

  const isBusy = status === "submitted" || status === "streaming"

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status])

  function submit(text: string) {
    const trimmed = text.trim()
    if (trimmed.length < 2 || isBusy) return
    sendMessage({ text: trimmed })
    setInput("")
    touchConversation(chatId, makeTitle(trimmed))

    // Give a new chat its permanent URL without remounting this component.
    const conversationPath = `/c/${chatId}`
    if (pathname !== conversationPath) {
      window.history.replaceState(null, "", conversationPath)
    }
  }

  function newChat() {
    stop()
    startNewChat()
  }

  const lastAssistantIndex = messages.findLastIndex(
    (message) => message.role === "assistant"
  )

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4!" />
          <h1 className="truncate text-sm font-medium">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Knowledge base connected
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={newChat}
                  disabled={messages.length === 0}
                  aria-label="New chat"
                />
              }
            >
              <HugeiconsIcon icon={PencilEdit02Icon} />
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
          {messages.length === 0 ? (
            <EmptyState onPick={submit} />
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={
                  status === "streaming" && index === messages.length - 1
                }
                onRegenerate={
                  index === lastAssistantIndex && !isBusy
                    ? () => regenerate()
                    : undefined
                }
              />
            ))
          )}

          {status === "submitted" && <ThinkingIndicator />}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5 text-[13px] text-destructive">
                <HugeiconsIcon icon={Alert02Icon} className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="font-medium">Something went wrong.</span>{" "}
                  {error.message}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => regenerate()}>
                <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
                Retry
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/0 px-4 pt-2 pb-4 sm:px-6">
        <form
          className="mx-auto w-full max-w-3xl"
          onSubmit={(event) => {
            event.preventDefault()
            submit(input)
          }}
        >
          <div
            className="rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-4 focus-within:ring-ring/10"
            onClick={() => inputRef.current?.focus()}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  submit(input)
                }
              }}
              placeholder="Ask about company policies, processes, or documents…"
              aria-label="Message OpsPilot"
              className="field-sizing-content max-h-52 min-h-14 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm outline-none placeholder:text-muted-foreground"
              rows={1}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-1.5 pl-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={SquareLock02Icon} className="size-3.5" />
                <span className="hidden sm:inline">
                  Private to your workspace
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] text-muted-foreground md:inline">
                  <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd>{" "}
                  new line
                </span>
                {isBusy ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    onClick={() => stop()}
                    aria-label="Stop generating"
                    className="rounded-lg"
                  >
                    <HugeiconsIcon icon={StopIcon} />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon-sm"
                    disabled={input.trim().length < 2}
                    aria-label="Send message"
                    className="rounded-lg"
                  >
                    <HugeiconsIcon icon={ArrowUp02Icon} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Answers are grounded in your knowledge base. Verify important details.
        </p>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-px font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
}: {
  message: UIMessage
  isStreaming: boolean
  onRegenerate?: () => void
}) {
  const sources = message.parts.filter((part) => part.type === "source-document")
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-subtle px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="group/message flex gap-3.5">
      <LogoMark className="mt-0.5 size-7" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="text-[13px] font-semibold">OpsPilot</span>
        <Streamdown
          isAnimating={isStreaming}
          className="text-sm leading-7 [&_code]:font-mono [&_li]:my-1 [&_table]:text-[13px]"
        >
          {text}
        </Streamdown>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Sources
            </span>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <div
                  key={source.sourceId}
                  className="flex max-w-64 items-center gap-2 rounded-lg border bg-card py-1.5 pr-3 pl-1.5 text-xs shadow-xs"
                  title={source.title}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                    <HugeiconsIcon icon={Pdf02Icon} className="size-3.5" />
                  </span>
                  <span className="truncate font-medium">{source.title}</span>
                  <span className="ml-auto pl-1 text-[10px] text-muted-foreground tabular-nums">
                    [{index + 1}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isStreaming && text && (
          <MessageActions text={text} onRegenerate={onRegenerate} />
        )}
      </div>
    </div>
  )
}

function MessageActions({
  text,
  onRegenerate,
}: {
  text: string
  onRegenerate?: () => void
}) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        "-ml-1.5 flex items-center gap-0.5 transition-opacity",
        // Keep actions on the latest answer visible; reveal others on hover.
        !onRegenerate &&
          "opacity-0 group-focus-within/message:opacity-100 group-hover/message:opacity-100"
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={copy}
              aria-label="Copy answer"
              className="text-muted-foreground"
            />
          }
        >
          <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
      </Tooltip>
      {onRegenerate && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRegenerate}
                aria-label="Regenerate answer"
                className="text-muted-foreground"
              />
            }
          >
            <HugeiconsIcon icon={RefreshIcon} />
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3.5">
      <LogoMark className="size-7" />
      <div
        className="flex items-center gap-2.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs"
        role="status"
      >
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-bounce rounded-full bg-primary/70"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        Searching knowledge base…
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-10 pt-[10vh]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl" />
          <LogoMark className="relative size-12 rounded-xl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">
            How can I help you today?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Ask anything about your company&apos;s policies, processes and
            documents. Every answer cites its sources.
          </p>
        </div>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.prompt}
            type="button"
            onClick={() => onPick(suggestion.prompt)}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-xs transition-all outline-none hover:-translate-y-px hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-primary">
              <HugeiconsIcon icon={suggestion.icon} className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {suggestion.category}
              </span>
              <span className="text-sm font-medium">{suggestion.prompt}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

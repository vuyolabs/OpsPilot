"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CloudUploadIcon,
  FileUploadIcon,
  Loading03Icon,
  Pdf02Icon,
} from "@hugeicons/core-free-icons"

import { API_URL, readError, type AdminDocument } from "@/lib/admin-api"
import { getBrowserAccessToken } from "@/lib/access-token"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

function validate(file: File | null) {
  if (!file) return "Choose a PDF to upload."
  if (file.type !== "application/pdf") return "Only PDF files are supported."
  if (file.size > MAX_UPLOAD_BYTES) return "PDF must be 20 MB or smaller."
  return null
}

export function UploadCard() {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  function choose(selected: File | null) {
    setFile(selected)
    setError(selected ? validate(selected) : null)
  }

  function clear() {
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate(file)
    if (validationError || !file) {
      setError(validationError)
      return
    }

    setPending(true)
    setError(null)

    try {
      const body = new FormData()
      body.append("file", file)

      const response = await fetch(`${API_URL}/api/v1/admin/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` },
        body,
      })

      if (!response.ok) throw new Error(await readError(response))

      const document: AdminDocument = await response.json()
      toast.success(`Ingested ${document.filename}`, {
        description: `${document.chunk_count} chunks added to the knowledge base.`,
      })

      clear()
      router.refresh()
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      setError(message)
      toast.error("Upload failed", { description: message })
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Add a document</h2>
        <p className="text-[13px] text-muted-foreground">
          PDFs are split into chunks and embedded so OpsPilot can cite them in
          answers. Large files can take a minute.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <label
          htmlFor="document-file"
          onDragOver={(event) => {
            event.preventDefault()
            if (!pending) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (!pending) choose(event.dataTransfer.files?.[0] ?? null)
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-brand-subtle/50",
            dragging && "border-primary bg-brand-subtle",
            error && "border-destructive/50",
            pending && "pointer-events-none opacity-60"
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-xl border bg-card text-primary shadow-xs">
            <HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              <span className="text-primary">Click to upload</span> or drag and
              drop
            </span>
            <span className="text-xs text-muted-foreground">
              PDF only, up to 20 MB
            </span>
          </div>
          <input
            ref={inputRef}
            id="document-file"
            type="file"
            accept="application/pdf"
            className="sr-only"
            aria-invalid={Boolean(error)}
            disabled={pending}
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
          />
        </label>

        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}

        {file && (
          <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Pdf02Icon} className="size-4" />
            </span>
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-[13px] font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {pending ? "Ingesting — chunking and embedding…" : formatSize(file.size)}
              </span>
            </div>
            {!pending && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clear}
                aria-label="Remove file"
                className="text-muted-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} />
              </Button>
            )}
            <Button type="submit" disabled={pending || Boolean(error)}>
              <HugeiconsIcon
                icon={pending ? Loading03Icon : FileUploadIcon}
                className={pending ? "animate-spin" : undefined}
                data-icon="inline-start"
              />
              {pending ? "Ingesting…" : "Upload"}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}

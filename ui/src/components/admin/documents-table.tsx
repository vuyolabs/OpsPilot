"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  File02Icon,
  Loading03Icon,
  Pdf02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { API_URL, readError, type AdminDocument } from "@/lib/admin-api"
import { getBrowserAccessToken } from "@/lib/access-token"
import { formatRelative, formatSize } from "@/lib/format"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function DocumentsTable({ documents }: { documents: AdminDocument[] }) {
  const [query, setQuery] = React.useState("")

  const needle = query.trim().toLowerCase()
  const visible = needle
    ? documents.filter(
        (doc) =>
          doc.filename.toLowerCase().includes(needle) ||
          doc.uploaded_by?.toLowerCase().includes(needle)
      )
    : documents

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Documents</h2>
          <Badge variant="secondary" className="tabular-nums">
            {documents.length}
          </Badge>
        </div>
        {documents.length > 0 && (
          <div className="relative sm:w-72">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by file or uploader"
              aria-label="Search documents"
              className="h-8 pl-8"
            />
          </div>
        )}
      </div>

      {documents.length === 0 ? (
        <Empty className="m-5 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={File02Icon} />
            </EmptyMedia>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>
              Upload your first PDF above and OpsPilot will start answering
              from it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          No documents match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 text-[11px] font-medium tracking-wide uppercase">
                Name
              </TableHead>
              <TableHead className="text-right text-[11px] font-medium tracking-wide uppercase">
                Chunks
              </TableHead>
              <TableHead className="text-right text-[11px] font-medium tracking-wide uppercase">
                Size
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-wide uppercase">
                Uploaded by
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-wide uppercase">
                Added
              </TableHead>
              <TableHead className="w-12 pr-5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((document) => (
              <TableRow key={document.id} className="text-[13px]">
                <TableCell className="max-w-80 py-3 pl-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <HugeiconsIcon icon={Pdf02Icon} className="size-4" />
                    </span>
                    <div className="grid min-w-0 leading-tight">
                      <span className="truncate font-medium" title={document.filename}>
                        {document.filename}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-success" />
                        Indexed
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {document.chunk_count.toLocaleString("en")}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatSize(document.size_bytes)}
                </TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {document.uploaded_by ?? "—"}
                </TableCell>
                <TableCell
                  className="text-muted-foreground"
                  title={dateFormat.format(new Date(document.created_at))}
                >
                  <span suppressHydrationWarning>
                    {formatRelative(document.created_at)}
                  </span>
                </TableCell>
                <TableCell className="pr-5">
                  <DeleteDocumentButton document={document} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function DeleteDocumentButton({ document }: { document: AdminDocument }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function handleDelete() {
    setPending(true)

    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/documents/${document.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await getBrowserAccessToken()}`,
          },
        }
      )

      if (!response.ok) throw new Error(await readError(response))

      toast.success(`Deleted ${document.filename}`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error("Couldn't delete document", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${document.filename}`}
          />
        }
      >
        <HugeiconsIcon icon={Delete02Icon} />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {document.filename}
            </span>{" "}
            and its {document.chunk_count} chunks will be removed, and OpsPilot
            will stop using it in answers. This can&apos;t be undone.
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

import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Clock01Icon,
  Files02Icon,
  HardDriveIcon,
  LayersIcon,
} from "@hugeicons/core-free-icons"

import { fetchDocuments, type AdminDocument } from "@/lib/admin-api"
import { getAccessToken, getCurrentUser } from "@/lib/auth"
import { DocumentsTable } from "@/components/admin/documents-table"
import { formatSize } from "@/lib/format"
import { UploadCard } from "@/components/admin/upload-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

export default async function AdminPage() {
  // Checked here as well as in the layout: layouts and pages can render
  // in parallel, so the page must not rely on the layout's check.
  const user = await getCurrentUser()
  if (!user?.isAdmin) notFound()

  let documents: AdminDocument[] = []
  let loadError: string | null = null

  try {
    const token = await getAccessToken()
    if (!token) throw new Error("Your session has expired. Sign in again.")
    documents = await fetchDocuments(token)
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Could not load documents."
  }

  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunk_count, 0)
  const totalBytes = documents.reduce((sum, doc) => sum + (doc.size_bytes ?? 0), 0)
  const latest = documents.reduce<string | null>(
    (max, doc) => (max === null || doc.created_at > max ? doc.created_at : max),
    null
  )

  const stats = [
    { label: "Documents", value: documents.length.toLocaleString("en"), icon: Files02Icon },
    { label: "Indexed chunks", value: totalChunks.toLocaleString("en"), icon: LayersIcon },
    { label: "Storage used", value: totalBytes ? formatSize(totalBytes) : "—", icon: HardDriveIcon },
    { label: "Last updated", value: latest ? dateFormat.format(new Date(latest)) : "—", icon: Clock01Icon },
  ]

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Manage the documents OpsPilot uses to answer questions across your
          organisation.
        </p>
      </div>

      {!loadError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[13px] font-medium">{stat.label}</span>
                <HugeiconsIcon icon={stat.icon} className="size-4" />
              </div>
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <UploadCard />

      {loadError ? (
        <Alert variant="destructive">
          <HugeiconsIcon icon={Alert02Icon} />
          <AlertTitle>Couldn&apos;t load documents</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : (
        <DocumentsTable documents={documents} />
      )}
    </>
  )
}

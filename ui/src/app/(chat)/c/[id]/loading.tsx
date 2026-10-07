import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Skeleton className="size-7" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
        <div className="flex gap-3.5">
          <Skeleton className="size-7 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
      </div>
    </div>
  )
}

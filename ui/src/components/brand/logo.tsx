import { cn } from "@/lib/utils"

// The OpsPilot mark: a compass-like chevron on the brand gradient.
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),black_25%)] text-primary-foreground shadow-sm ring-1 ring-inset ring-white/15",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%]">
        <path
          d="M12 3 20 20l-8-4-8 4 8-17Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.25"
        />
      </svg>
    </div>
  )
}

export function Logo({
  className,
  subtitle,
}: {
  className?: string
  subtitle?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark />
      <div className="grid min-w-0 leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight">
          OpsPilot
        </span>
        {subtitle && (
          <span className="truncate text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

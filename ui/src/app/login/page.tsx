import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Database02Icon,
  ShieldUserIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { AuthForm } from "@/components/auth/auth-form"
import { Logo } from "@/components/brand/logo"
import { safeRedirectPath } from "@/lib/safe-redirect"

export const metadata: Metadata = {
  title: "Sign in · OpsPilot",
}

const FEATURES = [
  {
    icon: SparklesIcon,
    title: "Instant, grounded answers",
    description:
      "Ask in plain language and get answers drawn only from your approved documents.",
  },
  {
    icon: CheckmarkCircle02Icon,
    title: "Every answer is cited",
    description:
      "Sources are attached to each response so employees can verify the details.",
  },
  {
    icon: ShieldUserIcon,
    title: "Role-based access",
    description:
      "Admins curate the knowledge base; members get a clean, focused assistant.",
  },
  {
    icon: Database02Icon,
    title: "Your knowledge, centralised",
    description:
      "Policies, handbooks and runbooks in one searchable, always-current place.",
  },
]

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, confirmed } = await searchParams

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <AuthForm
            next={safeRedirectPath(typeof next === "string" ? next : null)}
            notice={
              confirmed === "1"
                ? "confirmed"
                : error === "link_expired" || error === "confirmation_failed"
                  ? error
                  : null
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} OpsPilot. For authorised employees only.
        </p>
      </section>

      <aside className="relative hidden overflow-hidden bg-[oklch(0.2_0.05_272)] text-white lg:flex">
        <div className="bg-dot-grid absolute inset-0 text-white opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="absolute -top-40 -right-40 size-[32rem] rounded-full bg-[oklch(0.55_0.24_271)] opacity-40 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 size-[28rem] rounded-full bg-[oklch(0.6_0.16_220)] opacity-25 blur-3xl" />

        <div className="relative flex flex-1 flex-col justify-center gap-12 p-12 xl:p-16">
          <div className="flex max-w-lg flex-col gap-4">
            <span className="w-fit rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              AI operations assistant
            </span>
            <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
              Every answer your team needs, in one place.
            </h2>
            <p className="text-base leading-relaxed text-white/70">
              OpsPilot turns your company&apos;s policies and processes into a
              trusted assistant that answers questions in seconds.
            </p>
          </div>

          <ul className="grid max-w-2xl gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                  <HugeiconsIcon icon={feature.icon} className="size-4.5" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{feature.title}</span>
                  <span className="text-[13px] leading-relaxed text-white/60">
                    {feature.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}

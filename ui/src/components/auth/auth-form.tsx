"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  MailValidation01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"

import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Mode = "sign-in" | "sign-up"

// Password field with an eye button that toggles the text's visibility.
function PasswordInput(
  props: Omit<React.ComponentProps<typeof Input>, "type" | "className">
) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className="h-10 pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : ViewIcon}
          className="size-4"
        />
      </button>
    </div>
  )
}

export function AuthForm({
  next,
  notice,
}: {
  next: string
  // Set when arriving from the email confirmation link.
  notice: "confirmed" | "link_expired" | "confirmation_failed" | null
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>("sign-in")
  const [pending, setPending] = React.useState(false)
  const confirmed = notice === "confirmed"
  const [error, setError] = React.useState<string | null>(
    notice === "link_expired"
      ? "That confirmation link has expired or was already used. If your email is already confirmed, just sign in. Otherwise, sign up again to get a new link."
      : notice === "confirmation_failed"
        ? "We couldn't confirm your email from that link. Try signing in; if that fails, sign up again to get a new link."
        : null
  )
  const [checkEmail, setCheckEmail] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email"))
    const password = String(form.get("password"))

    setPending(true)
    setError(null)

    const supabase = createClient()
    const { data, error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
            },
          })

    if (error) {
      setError(error.message)
      setPending(false)
      return
    }

    // Sign-ups have no session yet when the project requires email confirmation.
    if (!data.session) {
      setCheckEmail(true)
      setPending(false)
      return
    }

    router.replace(next)
    router.refresh()
  }

  if (checkEmail) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-subtle text-primary">
          <HugeiconsIcon icon={MailValidation01Icon} className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent you a confirmation link. Open it to finish creating your
            account.
          </p>
        </div>
        <Alert className="text-left">
          <HugeiconsIcon icon={Alert02Icon} />
          <AlertDescription>
            Didn&apos;t get it? Check your spam folder, or try signing up
            again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const form = (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {confirmed && !error && mode === "sign-in" && (
          <Alert className="border-success/30 bg-success/5">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="text-success" />
            <AlertTitle>Email confirmed</AlertTitle>
            <AlertDescription>
              Your account is ready. Sign in to continue.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} />
            <AlertTitle>
              {mode === "sign-in"
                ? "Couldn't sign in"
                : "Couldn't create account"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor={`${mode}-email`}>Email</FieldLabel>
          <Input
            className="h-10"
            id={`${mode}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
          <PasswordInput
            id={`${mode}-password`}
            name="password"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            minLength={mode === "sign-up" ? 8 : undefined}
            required
          />
          {mode === "sign-up" && (
            <FieldDescription>At least 8 characters.</FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending && (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="animate-spin"
              data-icon="inline-start"
            />
          )}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  )

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "sign-in"
            ? "Sign in to your OpsPilot workspace to continue."
            : "Use your work email to get started with OpsPilot."}
        </p>
      </div>
      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as Mode)
          setError(null)
        }}
      >
        <TabsList className="mb-6 h-10! w-full">
          <TabsTrigger value="sign-in">Sign in</TabsTrigger>
          <TabsTrigger value="sign-up">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">{mode === "sign-in" && form}</TabsContent>
        <TabsContent value="sign-up">{mode === "sign-up" && form}</TabsContent>
      </Tabs>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Access is limited to your organisation. Activity may be logged for
        security and compliance purposes.
      </p>
    </div>
  )
}

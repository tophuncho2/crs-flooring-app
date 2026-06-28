import LoginForm from "@/modules/auth/components/login-form"

const ERROR_MESSAGES: Record<string, string> = {
  denied:
    "That account isn't allowed. Use your @crsfloorcovering.com account, or ask a manager for an invite.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Sign-in failed. Please try again.")
    : undefined

  return <LoginForm error={error} />
}

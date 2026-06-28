import LoginForm from "@/modules/auth/components/login-form"
import { getBrandLogoPrintUrl } from "@/server/storage/s3"

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

  // Same presigned brand-logo URL the work-order prints use; null when the
  // object is absent, in which case the form falls back to the gradient badge.
  // Guarded because this is the unauthenticated entry gate: a storage misconfig
  // or non-404 S3 error must degrade to the badge, never block sign-in.
  const logoUrl = await getBrandLogoPrintUrl().catch(() => null)

  return <LoginForm error={error} logoUrl={logoUrl} />
}

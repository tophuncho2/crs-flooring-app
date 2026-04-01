import LoginForm from "@/modules/auth/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ restricted?: string }>
}) {
  const params = await searchParams
  const restricted = params.restricted === "1"

  return <LoginForm restricted={restricted} />
}

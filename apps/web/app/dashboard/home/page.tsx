import { requireSessionUser } from "@/server/auth/session"
import HomeLauncher from "@/modules/app-shell/components/home/home-launcher"

// Best-effort friendly greeting from the email local-part (no name field on the
// user). "jordan.smith@crs…" → "Jordan"; falls back to the whole local-part.
function deriveGreetingName(email: string): string {
  const localPart = email.split("@")[0] || email
  const firstSegment = localPart.split(/[._-]/)[0] || localPart
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)
}

export default async function HomePage() {
  const user = await requireSessionUser()

  return <HomeLauncher name={deriveGreetingName(user.email)} rank={user.rank} />
}

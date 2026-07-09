"use client"

import { useState } from "react"
import { Layers } from "lucide-react"
import { authClient } from "@/modules/auth/auth-client"
import { DEFAULT_DASHBOARD_ROUTE } from "@/hooks/navigation"

export default function LoginForm({
  error,
  logoUrl,
}: {
  error?: string
  logoUrl?: string | null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    await authClient.signIn.social({
      provider: "google",
      callbackURL: DEFAULT_DASHBOARD_ROUTE,
      errorCallbackURL: "/login?error=denied",
    })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04060f] px-4">
      {/* Cinematic aurora — slow drifting luminous layers (see globals.css) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="crs-aurora-layer"
          style={{
            top: "-20%",
            left: "-15%",
            width: "55vw",
            height: "55vw",
            background:
              "radial-gradient(circle at center, rgba(56,189,248,0.55), rgba(56,189,248,0) 70%)",
            animation: "crs-aurora-a 64s ease-in-out infinite",
          }}
        />
        <div
          className="crs-aurora-layer"
          style={{
            bottom: "-25%",
            right: "-15%",
            width: "60vw",
            height: "60vw",
            background:
              "radial-gradient(circle at center, rgba(99,102,241,0.5), rgba(99,102,241,0) 70%)",
            animation: "crs-aurora-b 86s ease-in-out infinite",
          }}
        />
        <div
          className="crs-aurora-layer"
          style={{
            top: "18%",
            left: "28%",
            width: "45vw",
            height: "45vw",
            background:
              "radial-gradient(circle at center, rgba(45,212,191,0.4), rgba(45,212,191,0) 70%)",
            animation: "crs-aurora-c 72s ease-in-out infinite",
          }}
        />
        {/* faint warm ember for golden-hour depth */}
        <div
          className="crs-aurora-layer"
          style={{
            bottom: "4%",
            left: "6%",
            width: "35vw",
            height: "35vw",
            background:
              "radial-gradient(circle at center, rgba(251,191,36,0.18), rgba(251,191,36,0) 70%)",
            animation: "crs-aurora-a 98s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Cinematic finish: vignette + film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      <div
        aria-hidden
        className="crs-aurora-grain pointer-events-none absolute inset-0 opacity-[0.07]"
      />

      {/* Sign-in card */}
      <div className="crs-card-rise relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-10">
        {/* top sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />

        {/* Brand — the company logo (presigned from S3) on a white tile so the
            print-optimized PNG stays legible over the dark aurora; falls back
            to the gradient badge when the logo object is absent. */}
        <div className="mb-8 flex flex-col items-center text-center">
          {logoUrl ? (
            <div className="crs-aurora-button mb-5 rounded-2xl p-1.5 shadow-lg shadow-black/30">
              <div className="flex items-center justify-center rounded-xl bg-white px-6 py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="CRS Floor Covering" className="h-24 w-auto" />
              </div>
            </div>
          ) : (
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/30">
              <Layers className="h-10 w-10 text-white" strokeWidth={2.2} />
            </div>
          )}
          <p className="crs-aurora-text mt-1 text-lg font-bold uppercase tracking-[0.25em]">
            Operations Portal
          </p>
        </div>

        {error && (
          <p className="mb-5 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isSubmitting}
          className="crs-aurora-button group flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 hover:shadow-sky-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Redirecting…
            </>
          ) : (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white">
                <GoogleIcon />
              </span>
              Sign in with Google
            </>
          )}
        </button>

        <p className="mt-6 text-center text-xs text-white/40">
          Use your <span className="text-white/60">@crsfloorcovering.com</span> account.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

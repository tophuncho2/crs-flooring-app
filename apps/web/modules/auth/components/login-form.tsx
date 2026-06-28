"use client"

import { useState } from "react"
import { authClient } from "@/modules/auth/auth-client"

export default function LoginForm({ error }: { error?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard/inventory",
      errorCallbackURL: "/login?error=denied",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 border border-blue-400">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">CRS System</h2>

        {error && (
          <p className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isSubmitting}
          className="w-full py-2 font-semibold rounded-lg bg-white text-black hover:bg-gray-100 transition disabled:opacity-50"
        >
          {isSubmitting ? "Redirecting…" : "Sign in with Google"}
        </button>

        <p className="mt-4 text-center text-xs text-blue-200/70">
          Use your @crsfloorcovering.com account.
        </p>
      </div>
    </div>
  )
}

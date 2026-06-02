"use client"

import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useState } from "react"

type Step = "email" | "password" | "set-password"

export default function LoginForm({ restricted }: { restricted: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNotice("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/account-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (response.status === 429) {
        setError("Too many attempts. Please try again later.")
        return
      }

      if (!response.ok) {
        setError("Unable to sign in. Contact your administrator.")
        return
      }

      const payload = (await response.json().catch(() => ({}))) as {
        status?: "needs-password" | "needs-setup"
      }

      if (payload.status === "needs-setup") {
        setStep("set-password")
        setNotice("Welcome! Please set your password to get started.")
      } else {
        setStep("password")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.replace("/dashboard/inventory")
        router.refresh()
      } else if (result?.error === "PASSWORD_SETUP_REQUIRED") {
        setStep("set-password")
        setPassword("")
        setNotice("Welcome! Please set your password to get started.")
      } else if (result?.error === "ACCOUNT_RESTRICTED") {
        setError("Your account is restricted. Contact an admin to verify access.")
      } else if (result?.error === "RATE_LIMITED") {
        setError("Too many attempts. Please try again later.")
      } else {
        setError("Invalid email or password")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNotice("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Failed to set password")
        return
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.replace("/dashboard/inventory")
        router.refresh()
      } else {
        setError("Password set successfully but login failed. Please try signing in.")
        setStep("password")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep("email")
    setPassword("")
    setConfirmPassword("")
    setError("")
    setNotice("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 border border-blue-400">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          CRS System
        </h2>

        {restricted && (
          <p className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            Your account is restricted. Contact an admin to verify access.
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        {step === "email" && (
          <form onSubmit={handleEmailContinue} className="space-y-5">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 font-semibold rounded-lg bg-blue-400 text-black hover:bg-blue-300 transition disabled:opacity-50"
            >
              Continue
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="rounded-lg bg-blue-950/60 px-4 py-2 text-sm text-blue-200 border border-blue-500/30">
              {email}
            </div>
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 font-semibold rounded-lg bg-blue-400 text-black hover:bg-blue-300 transition disabled:opacity-50"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full py-2 font-semibold rounded-lg border border-blue-300 text-white hover:bg-blue-800/40 transition"
            >
              Back
            </button>
          </form>
        )}

        {step === "set-password" && (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <div className="rounded-lg bg-blue-950/60 px-4 py-2 text-sm text-blue-200 border border-blue-500/30">
              {email}
            </div>
            <input
              type="password"
              placeholder="Create password"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 font-semibold rounded-lg bg-blue-400 text-black hover:bg-blue-300 transition disabled:opacity-50"
            >
              Set Password
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full py-2 font-semibold rounded-lg border border-blue-300 text-white hover:bg-blue-800/40 transition"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

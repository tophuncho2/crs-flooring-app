"use client"

import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginForm({ restricted }: { restricted: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.replace("/dashboard/inventory")
      router.refresh()
    } else {
      setError("Invalid credentials or account not approved")
    }
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
        {error && (
          <p className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 rounded-lg bg-blue-950 text-white border border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full py-2 font-semibold rounded-lg bg-blue-400 text-black hover:bg-blue-300 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

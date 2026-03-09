import bcrypt from "bcrypt"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RegisterBody = {
  email?: string
  password?: string
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Account already exists" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: "CUSTOMER",
        isVerified: true,
      },
      select: { id: true },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Account created. You now have a 7-day free trial. Sign in to get started.",
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}

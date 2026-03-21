import { NextResponse } from "next/server"

export async function PATCH() {
  return NextResponse.json(
    { error: "Hotkeys are managed in code and cannot be edited from the app." },
    { status: 405 },
  )
}

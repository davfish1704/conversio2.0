import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // TODO: Meta Lead Import — noch nicht implementiert.
  // Erfordert: waAccountId-Lookup via Team, Lead-ID-Mapping, FK-sichere upsert-Logik.
  return NextResponse.json({ error: "Nicht implementiert" }, { status: 501 })
}

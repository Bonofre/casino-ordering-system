// app/api/users/route.ts
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { cookies, headers } from "next/headers"

function normalizeRole(input: unknown): "admin" | "student" {
  const s = String(input ?? "").toLowerCase()
  return s === "admin" ? "admin" : "student"
}

// Autoriza llamando /api/auth/me con la cookie actual
async function requireAdminViaAuthMe(): Promise<{ ok: boolean; me: any }> {
  try {
    const h = headers()
    const host = h.get("host") || "localhost:3000"
    const proto = h.get("x-forwarded-proto") ?? "http"
    const cookieHeader = cookies().toString()
    const url = `${proto}://${host}/api/auth/me`
    const res = await fetch(url, { headers: { cookie: cookieHeader } })
    if (!res.ok) return { ok: false, me: null }
    const me = await res.json()
    const isAdmin = normalizeRole((me as any)?.role) === "admin"
    return { ok: isAdmin, me }
  } catch {
    return { ok: false, me: null }
  }
}

export async function GET() {
  const auth = await requireAdminViaAuthMe()
  if (!auth.ok) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, studentId: true, role: true },
      orderBy: { email: "asc" },
    })

    const normalized = users.map((u) => ({
      ...u,
      role: normalizeRole((u as any).role),
      studentId: u.studentId ?? null,
    }))

    return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminViaAuthMe()
  if (!auth.ok) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const name = body?.name ? String(body.name).trim() : null
    const studentId =
      body?.studentId != null && String(body.studentId).trim() !== ""
        ? String(body.studentId).trim()
        : null
    const roleNorm = normalizeRole(body?.role)
    const password = String(body?.password ?? "")

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ message: "Email/clave inválidos" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ message: "Email ya registrado" }, { status: 409 })

    const hashed = await bcrypt.hash(password, 10)

    const created = await prisma.user.create({
      data: {
        email,
        name,
        studentId,
        role: roleNorm as any, // por enum Role de Prisma
        password: hashed,
      } as any,
      select: { id: true, email: true, name: true, studentId: true, role: true },
    })

    return NextResponse.json(
      { ...created, role: normalizeRole((created as any).role) },
      { status: 201 },
    )
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Internal error" }, { status: 500 })
  }
}

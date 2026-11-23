// app/api/users/[id]/route.ts
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { cookies, headers } from "next/headers"

function normalizeRole(input: unknown): "admin" | "student" {
  const s = String(input ?? "").toLowerCase()
  return s === "admin" ? "admin" : "student"
}

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminViaAuthMe()
  if (!auth.ok) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    const id = params.id
    const body = await req.json()

    // Reset de contraseña
    if (body?.action === "reset_password") {
      const temp = Math.random().toString(36).slice(-10)
      const hashed = await bcrypt.hash(temp, 10)
      await prisma.user.update({
        where: { id },
        data: { password: hashed },
      })
      return NextResponse.json({ tempPassword: temp })
    }

    // Cambiar rol
    if (body?.role) {
      const roleNorm = normalizeRole(body.role)
      const updated = await prisma.user.update({
        where: { id },
        data: { role: roleNorm as any },
        select: { id: true, email: true, name: true, studentId: true, role: true },
      })
      return NextResponse.json({ ...updated, role: normalizeRole((updated as any).role) })
    }

    // Actualizar nombre / studentId
    const patchData: any = {}
    if (typeof body?.name === "string") patchData.name = body.name.trim() || null
    if (typeof body?.studentId === "string") patchData.studentId = body.studentId.trim() || null

    if (Object.keys(patchData).length > 0) {
      const updated = await prisma.user.update({
        where: { id },
        data: patchData as any,
        select: { id: true, email: true, name: true, studentId: true, role: true },
      })
      return NextResponse.json({ ...updated, role: normalizeRole((updated as any).role) })
    }

    return NextResponse.json({ message: "Nada para actualizar" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminViaAuthMe()
  if (!auth.ok) return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Internal error" }, { status: 500 })
  }
}

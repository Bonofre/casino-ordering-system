export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies, headers } from "next/headers"

async function requireAdmin() {
  try {
    const h = headers()
    const host = h.get("host") || "localhost:3000"
    const proto = h.get("x-forwarded-proto") ?? "http"
    const cookieHeader = cookies().toString()
    const res = await fetch(`${proto}://${host}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    })
    if (!res.ok) return { ok: false }
    const me = await res.json()
    return { ok: String(me?.role).toLowerCase() === "admin" }
  } catch {
    return { ok: false }
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok)
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    const id = params.id
    const body = await req.json()
    const fields: string[] = []
    const values: any[] = []
    let i = 1

    for (const key of [
      "name",
      "category",
      "price",
      "available",
      "dailyLimit",
      "ingredients",
      "imageUrl",
      "menuDayId",
    ]) {
      if (body[key] !== undefined) {
        fields.push(`"${key}" = $${i}`)
        if (key === "ingredients") {
          values.push(JSON.stringify(body[key]))
        } else if (["price", "dailyLimit"].includes(key)) {
          values.push(Number(body[key]))
        } else {
          values.push(body[key])
        }
        i++
      }
    }

    if (!fields.length)
      return NextResponse.json({ message: "Nada que actualizar" }, { status: 400 })

    const query = `
      UPDATE "MenuItem"
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING id, "menuDayId", name, category, price, available, "dailyLimit", ingredients, "imageUrl"
    `
    values.push(id)
    const { rows } = await db.query(query, values)

    if (!rows.length)
      return NextResponse.json({ message: "No encontrado" }, { status: 404 })

    return NextResponse.json(rows[0])
  } catch (e: any) {
    console.error("Error actualizando producto:", e)
    return NextResponse.json({ message: e?.message ?? "Error interno" }, { status: 500 })
  }
}

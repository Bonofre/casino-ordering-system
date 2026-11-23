export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies, headers } from "next/headers"

// Verifica si el usuario logueado es admin
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

// Asegura que exista un registro en "MenuDay" para la fecha
async function ensureMenuDayId(date: string) {
  const { rows } = await db.query(
    `SELECT id FROM "MenuDay" WHERE "dayDate"::date = $1::date`,
    [date]
  )
  if (rows.length) return rows[0].id
  const insert = await db.query(
    `INSERT INTO "MenuDay" ("dayDate") VALUES ($1::date) RETURNING id`,
    [date]
  )
  return insert.rows[0].id
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok)
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const date = body.date || new Date().toISOString().slice(0, 10)
    const menuDayId = await ensureMenuDayId(date)

    const {
      name,
      category = "principal",
      price = 0,
      available = true,
      dailyLimit = 0,
      ingredients = [],
      imageUrl = null,
    } = body

    if (!name)
      return NextResponse.json({ message: "Falta nombre del producto" }, { status: 400 })

    const query = `
      INSERT INTO "MenuItem"
      ("menuDayId", name, category, price, available, "dailyLimit", ingredients, "imageUrl")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, "menuDayId", name, category, price, available, "dailyLimit", ingredients, "imageUrl"
    `
    const values = [
      menuDayId,
      name,
      category,
      Number(price),
      available,
      Number(dailyLimit),
      JSON.stringify(ingredients),
      imageUrl,
    ]

    const { rows } = await db.query(query, values)
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    console.error("Error creando producto:", e)
    return NextResponse.json({ message: e?.message ?? "Error interno" }, { status: 500 })
  }
}

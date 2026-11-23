// app/api/admin/daily-stock/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db" // tu pool de node-postgres con db.query(sql, params)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { menuItemId, date, dailyLimit } = body ?? {}

    if (!menuItemId || !date || typeof dailyLimit !== "number" || dailyLimit < 0) {
      return NextResponse.json({ message: "Campos inválidos" }, { status: 400 })
    }

    // normaliza fecha a AAAA-MM-DD
    const d = new Date(date)
    const dateStr = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)

    // 1) Verifica que el item existe y pertenece al MenuDay de esa fecha
    const { rows: check } = await db.query(
      `SELECT mi.id, mi."menuDayId", md."dayDate"::date AS dayDate
       FROM "MenuItem" mi
       JOIN "MenuDay" md ON md.id = mi."menuDayId"
       WHERE mi.id = $1 AND md."dayDate"::date = $2::date
       LIMIT 1`,
      [menuItemId, dateStr]
    )
    if (!check.length) {
      return NextResponse.json(
        { message: "MenuItem no corresponde al MenuDay de esa fecha o no existe" },
        { status: 404 }
      )
    }

    // 2) Actualiza dailyLimit del producto del día
    await db.query(
      `UPDATE "MenuItem"
       SET "dailyLimit" = $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [dailyLimit, menuItemId]
    )

    // 3) Calcula vendidos hoy y remaining para devolver al admin
    const { rows: soldRows } = await db.query(
      `WITH bounds AS (
         SELECT md.id AS menuday_id, md."dayDate"::date AS d, (md."dayDate"::date + 1) AS d2
         FROM "MenuDay" md
         JOIN "MenuItem" mi ON mi."menuDayId" = md.id
         WHERE mi.id = $1
       )
       SELECT COALESCE(SUM(oi.quantity),0) AS sold
       FROM "OrderItem" oi
       JOIN "Order" o ON o.id = oi."orderId"
       JOIN bounds b ON TRUE
       WHERE oi."menuItemId" = $1
         AND o."createdAt" >= b.d AND o."createdAt" < b.d2
         AND o.status <> 'cancelled'`,
      [menuItemId]
    )
    const soldToday = Number(soldRows[0]?.sold ?? 0)
    const remaining = Math.max(0, dailyLimit - soldToday)

    return NextResponse.json({
      ok: true,
      menuItemId,
      date: dateStr,
      dailyLimit,
      soldToday,
      remaining,
    })
  } catch (err) {
    console.error("POST /api/admin/daily-stock error:", err)
    return NextResponse.json({ message: "Error interno" }, { status: 500 })
  }
}
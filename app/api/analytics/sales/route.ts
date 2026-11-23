import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function todayLocalISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}` // YYYY-MM-DD en hora local
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Día de hoy (para la tarjeta "Ventas Hoy")
    const today = todayLocalISO()
    const todayStart = `${today} 00:00:00`
    const todayEnd = `${today} 23:59:59`

    // Rango seleccionado en el calendario (para gráfico y rango)
    const fromDate = from || today
    const toDate = to || fromDate
    const rangeStart = `${fromDate} 00:00:00`
    const rangeEnd = `${toDate} 23:59:59`

    // Ventas HOY (siempre el día actual, NO el rango)
    const daily = await db.query(
      `
      SELECT COALESCE(SUM(total),0) as total
      FROM "Order"
      WHERE "createdAt" BETWEEN $1 AND $2
      `,
      [todayStart, todayEnd]
    )

    // Ventas de la última semana (independiente del rango)
    const weekly = await db.query(`
      SELECT COALESCE(SUM(total),0) as total
      FROM "Order"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
    `)

    // Ventas por hora EN EL RANGO SELECCIONADO
    const byHour = await db.query(
      `
      SELECT EXTRACT(HOUR FROM "createdAt") AS h, SUM(total) AS t
      FROM "Order"
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY h
      ORDER BY h
      `,
      [rangeStart, rangeEnd]
    )

    // Array de 24 horas (0..23)
    const arr = Array.from({ length: 24 }, (_, i) => {
      const row = byHour.rows.find((r: any) => Number(r.h) === i)
      return row ? Number(row.t) : 0
    })

    return NextResponse.json({
      dailyTotal: Number(daily.rows[0].total),   // SIEMPRE hoy
      weekTotal: Number(weekly.rows[0].total),   // últimos 7 días
      byHour: arr,                               // rango del calendario
    })
  } catch (err) {
    console.error("GET /api/analytics/sales error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { startDate, endDate } = await req.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Faltan fechas" }, { status: 400 })
    }

    const result = await db.query(
      `
      SELECT 
        COUNT(*) AS orders,
        COALESCE(SUM(total), 0) AS total,
        COALESCE(AVG(total), 0) AS avg
      FROM "Order"
      WHERE "createdAt" BETWEEN $1 AND $2
    `,
      [startDate, endDate]
    )

    return NextResponse.json({
      orders: Number(result.rows[0].orders),
      total: Number(result.rows[0].total),
      avg: Number(result.rows[0].avg),
    })
  } catch (e) {
    console.error("Error rango:", e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

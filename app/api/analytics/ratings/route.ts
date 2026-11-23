import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Hoy por defecto si no viene nada
    const todayISO = new Date().toISOString().slice(0, 10)
    const fromDate = from || todayISO
    const toDate = to || fromDate

    const startDate = `${fromDate} 00:00:00`
    const endDate = `${toDate} 23:59:59`

    // Calificación promedio en el rango
    const avgRes = await db.query(
      `
      SELECT COALESCE(AVG(score),0) as avg
      FROM "OrderRating"
      WHERE "createdAt" BETWEEN $1 AND $2
      `,
      [startDate, endDate]
    )

    // Opiniones recientes con datos del pedido y del usuario, filtradas por rango
    const latestRes = await db.query(
      `
      SELECT 
        r.score,
        r.comment,
        r."createdAt",

        o."orderNumber" AS "orderNumber",
        u.name  AS "username",
        u.email AS "useremail"

      FROM "OrderRating" r
      LEFT JOIN "Order" o ON r."orderId" = o.id
      LEFT JOIN "User"  u ON r."userId" = u.id
      WHERE r."createdAt" BETWEEN $1 AND $2
      ORDER BY r."createdAt" DESC
      LIMIT 10
      `,
      [startDate, endDate]
    )

    return NextResponse.json({
      avg: Number(avgRes.rows[0]?.avg ?? 0),
      latest: latestRes.rows,
    })
  } catch (err) {
    console.error("GET /api/analytics/ratings error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
// app/api/order-ratings/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const orderId = searchParams.get("orderId")

    if (!userId && !orderId) {
      return NextResponse.json(
        { message: "Debes enviar userId o orderId en la query" },
        { status: 400 }
      )
    }

    let rows

    if (orderId) {
      const result = await db.query(
        `SELECT id, "orderId", "userId", score, comment, "createdAt", "updatedAt"
         FROM "OrderRating"
         WHERE "orderId" = $1`,
        [orderId]
      )
      rows = result.rows
    } else {
      const result = await db.query(
        `SELECT id, "orderId", "userId", score, comment, "createdAt", "updatedAt"
         FROM "OrderRating"
         WHERE "userId" = $1`,
        [userId]
      )
      rows = result.rows
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/order-ratings error:", error)
    return NextResponse.json(
      { message: "Error interno al obtener calificaciones" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, userId, score, comment } = body as {
      orderId?: string
      userId?: string
      score?: number
      comment?: string | null
    }

    if (!orderId || !userId || typeof score !== "number") {
      return NextResponse.json(
        { message: "orderId, userId y score son obligatorios" },
        { status: 400 }
      )
    }

    if (score < 1 || score > 5) {
      return NextResponse.json(
        { message: "score debe estar entre 1 y 5" },
        { status: 400 }
      )
    }

    const result = await db.query(
      `
      INSERT INTO "OrderRating" ("orderId", "userId", score, comment, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT ("orderId", "userId")
      DO UPDATE SET
        score = EXCLUDED.score,
        comment = EXCLUDED.comment,
        "updatedAt" = now()
      RETURNING id, "orderId", "userId", score, comment, "createdAt", "updatedAt"
      `,
      [orderId, userId, score, comment ?? null]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("POST /api/order-ratings error:", error)
    return NextResponse.json(
      { message: "Error interno al guardar calificación" },
      { status: 500 }
    )
  }
}
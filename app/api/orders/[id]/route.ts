// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const orderId = params.id

  try {
    const patch = await req.json()

    const fields = []
    const values: any[] = []
    let idx = 1

    if (patch.status) {
      fields.push(`"status" = $${idx++}::"OrderStatus"`)
      values.push(patch.status)
    }

    if (patch.paymentStatus) {
      fields.push(`"paymentStatus" = $${idx++}::"PaymentStatus"`)
      values.push(patch.paymentStatus)
    }

    if (fields.length === 0) {
      return NextResponse.json({ message: "No hay campos para actualizar" }, { status: 400 })
    }

    const sql = `
      UPDATE "Order"
      SET ${fields.join(", ")}
      WHERE "id" = $${idx}
      RETURNING *;
    `
    values.push(orderId)

    const result = await db.query(sql, values)
    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 })
    }

    const updated = result.rows[0]
    return NextResponse.json(updated)
  } catch (err) {
    console.error("PATCH /api/orders/[id] error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
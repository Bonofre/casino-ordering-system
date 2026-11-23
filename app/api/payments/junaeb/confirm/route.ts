// app/api/payments/junaeb/confirm/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Espera un JSON como:
// {
//   "orderNumber": "ORD-20251031-1230-07",
//   "approved": true,            // o false
//   "authCode": "JNB-ABC123",    // opcional
//   "amount": 5990               // opcional
// }
export async function POST(req: Request) {
  try {
    const data = (await req.json()) as {
      orderNumber?: string
      approved?: boolean
      authCode?: string
      amount?: number
    }

    if (!data?.orderNumber) {
      return NextResponse.json({ ok: false, error: "orderNumber requerido" }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber: data.orderNumber },
    })

    if (!order) {
      return NextResponse.json({ ok: false, error: "Orden no encontrada" }, { status: 404 })
    }

    // Rechazo desde caja/POS → usar PaymentStatus.failed y método en minúscula
    if (data.approved === false) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",       // enum OrderStatus
          paymentStatus: "failed",   // ✅ enum PaymentStatus
          paymentMethod: "junaeb",   // ✅ enum PaymentMethod (minúsculas)
        },
      })
      return NextResponse.json({ ok: true, state: "failed" })
    }

    // Aprobación → paid + status confirmado
    if (data.approved === true) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "confirmed",       // enum OrderStatus
          paymentStatus: "paid",     // ✅ enum PaymentStatus
          paymentMethod: "junaeb",   // ✅ enum PaymentMethod
          // Si tienes un campo JSON para metadatos, guárdalo allí (ejemplo):
          // paymentMeta: { provider: "JUNAEB", authCode: data.authCode, amount: data.amount }
        },
      })
      return NextResponse.json({ ok: true, state: "paid" })
    }

    // Si no viene approved true/false
    return NextResponse.json({ ok: false, error: "Parámetro approved requerido (true/false)" }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 })
  }
}

// app/api/orders/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type OrderStatus = "confirmed" | "preparing" | "ready" | "completed" | "cancelled"
type PaymentStatus = "pending" | "paid" | "failed" | "refunded"
type PaymentMethod = "cash" | "card" | "transfer" | "junaeb"

interface CreateOrderItem {
  menuItemId?: string | number | null
  quantity: number
  specialInstructions?: string | null
  name?: string
  price?: number
}

interface CreateOrderBody {
  userId: string
  items: CreateOrderItem[]
  paymentMethod?: PaymentMethod
  specialInstructions?: string | null
  scheduledAt?: string | null
}

function todayStartISO(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return start.toISOString()
}
const pad = (n: number) => n.toString().padStart(2, "0")
function makeOrderNumber(d = new Date()) {
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const da = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `ORD-${y}${m}${da}-${hh}${mm}${ss}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  try {
    if (userId) {
      const ordersRes = await db.query(
        `SELECT o.*
         FROM "Order" o
         WHERE o."userId" = $1
         ORDER BY o."createdAt" DESC`,
        [userId]
      )

      const orderIds = ordersRes.rows.map((r: any) => r.id)
      let itemsByOrder = new Map<string, any[]>()

      if (orderIds.length) {
        const itemsRes = await db.query(
          `SELECT i.*,
                  mi.name AS "menuItemName",
                  mi.price AS "menuItemPrice"
           FROM "OrderItem" i
           LEFT JOIN "MenuItem" mi ON mi.id = i."menuItemId"
           WHERE i."orderId" = ANY($1)`,
          [orderIds]
        )
        itemsByOrder = itemsRes.rows.reduce((acc: any, row: any) => {
          const arr = acc.get(row.orderId) ?? []
          arr.push({
            id: row.id,
            quantity: row.quantity,
            specialInstructions: row.specialInstructions,
            nameSnapshot: row.nameSnapshot,
            priceSnapshot: Number(row.priceSnapshot),
            menuItemId: row.menuItemId,
            menuItem: row.menuItemId
              ? { id: row.menuItemId, name: row.menuItemName, price: Number(row.menuItemPrice) }
              : null,
          })
          acc.set(row.orderId, arr)
          return acc
        }, new Map())
      }

      const out = ordersRes.rows.map((o: any) => ({
        ...o,
        total: Number(o.total),
        items: itemsByOrder.get(o.id) ?? [],
      }))
      return NextResponse.json(out)
    }

    // Admin: pedidos del día
    const since = todayStartISO()
    const ordersRes = await db.query(
      `SELECT o.*, u.name as "userName", u.email as "userEmail", u."studentId" as "userStudentId"
       FROM "Order" o
       JOIN "User" u ON u.id = o."userId"
       WHERE o."createdAt" >= $1
       ORDER BY o."createdAt" DESC`,
      [since]
    )

    const orderIds = ordersRes.rows.map((r: any) => r.id)
    let itemsByOrder = new Map<string, any[]>()

    if (orderIds.length) {
      const itemsRes = await db.query(
        `SELECT i.*,
                mi.name AS "menuItemName",
                mi.price AS "menuItemPrice"
         FROM "OrderItem" i
         LEFT JOIN "MenuItem" mi ON mi.id = i."menuItemId"
         WHERE i."orderId" = ANY($1)`,
        [orderIds]
      )
      itemsByOrder = itemsRes.rows.reduce((acc: any, row: any) => {
        const arr = acc.get(row.orderId) ?? []
        arr.push({
          id: row.id,
          quantity: row.quantity,
          specialInstructions: row.specialInstructions,
          nameSnapshot: row.nameSnapshot,
          priceSnapshot: Number(row.priceSnapshot),
          menuItemId: row.menuItemId,
          menuItem: row.menuItemId
            ? { id: row.menuItemId, name: row.menuItemName, price: Number(row.menuItemPrice) }
            : null,
        })
        acc.set(row.orderId, arr)
        return acc
      }, new Map())
    }

    const out = ordersRes.rows.map((o: any) => ({
      ...o,
      total: Number(o.total),
      items: itemsByOrder.get(o.id) ?? [],
      user: {
        id: o.userId,
        name: o.userName,
        email: o.userEmail,
        studentId: o.userStudentId,
      },
    }))

    return NextResponse.json(out)
  } catch (err) {
    console.error("GET /api/orders error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderBody

    if (!body?.userId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ message: "Faltan datos de la orden" }, { status: 400 })
    }

    // Normaliza ids a texto
    const incomingIds = body.items
      .map((it) => (it.menuItemId == null ? null : String(it.menuItemId)))
      .filter((x): x is string => !!x)

    // Trae de BD los MenuItem por uuid::text
    const byIdText = new Map<string, { id: string; name: string; price: number }>()
    if (incomingIds.length) {
      const pricesRes = await db.query(
        `SELECT id::text AS id_text, id, name, price
         FROM "MenuItem"
         WHERE id::text = ANY($1::text[])`,
        [incomingIds]
      )
      pricesRes.rows.forEach((r: any) => {
        byIdText.set(String(r.id_text), {
          id: String(r.id),
          name: r.name,
          price: Number(r.price),
        })
      })
    }

    // Resolver cada ítem (con FK si existe, o con snapshots desde el cliente)
    const resolved: Array<{
      dbMenuItemId: string | null
      nameSnapshot: string
      priceSnapshot: number
      quantity: number
      specialInstructions: string | null
    }> = []

    const missing: Array<{ index: number; menuItemId?: any }> = []

    body.items.forEach((it, idx) => {
      const key = it.menuItemId == null ? null : String(it.menuItemId)
      const fromDb = key ? byIdText.get(key) : undefined

      if (fromDb) {
        resolved.push({
          dbMenuItemId: fromDb.id,
          nameSnapshot: fromDb.name,
          priceSnapshot: fromDb.price,
          quantity: Math.max(1, Number(it.quantity || 1)),
          specialInstructions: it.specialInstructions ?? null,
        })
      } else if (typeof it.name === "string" && typeof it.price === "number") {
        resolved.push({
          dbMenuItemId: null,
          nameSnapshot: it.name,
          priceSnapshot: Math.max(0, Math.floor(it.price)),
          quantity: Math.max(1, Number(it.quantity || 1)),
          specialInstructions: it.specialInstructions ?? null,
        })
      } else {
        missing.push({ index: idx, menuItemId: it.menuItemId })
      }
    })

    if (missing.length) {
      return NextResponse.json(
        {
          message:
            "Faltan datos para algunos ítems (no existe MenuItem en BD y no se recibieron name/price snapshot).",
          missing,
        },
        { status: 400 }
      )
    }

    // Total desde snapshots
    const total = resolved.reduce((acc, r) => acc + r.priceSnapshot * r.quantity, 0)

    // 🕒🧠 FECHA Y HORA DE RETIRO (USANDO scheduledAt)
    const now = new Date() // hora real del servidor

    // Normalizamos "hoy" a solo fecha (sin hora)
    const todayStr = now.toISOString().slice(0, 10) // "YYYY-MM-DD"
    const today = new Date(todayStr)

    // Definimos cuántos días hacia adelante se permite reservar (ej: 3 días)
    const maxDaysAhead = 3
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + maxDaysAhead)

    // Intentamos usar la fecha/hora programada que viene del frontend
    let requested: Date | null = null
    if (body.scheduledAt) {
      const tmp = new Date(body.scheduledAt)
      if (!Number.isNaN(tmp.getTime())) {
        requested = tmp
      }
    }

    // Si hay fecha programada válida, validamos que esté en rango [hoy, hoy+maxDaysAhead]
    if (requested) {
      const reqDateStr = requested.toISOString().slice(0, 10)
      const reqDate = new Date(reqDateStr)

      if (reqDate < today || reqDate > maxDate) {
        return NextResponse.json(
          {
            message:
              `La fecha seleccionada está fuera del rango permitido. ` +
              `Solo puedes comprar para hoy (${todayStr}) o hasta ${maxDaysAhead} días hacia adelante.`,
          },
          { status: 400 }
        )
      }
    }

    // Si no hay fecha programada (o era inválida), usamos ahora + 15 minutos
    const estReady =
      requested && !Number.isNaN(requested.getTime())
        ? requested
        : new Date(now.getTime() + 15 * 60 * 1000)

    // A partir de aquí, igual que antes
    const orderNumber = makeOrderNumber(now)
    const paymentMethod: PaymentMethod = (body.paymentMethod ?? "junaeb") as PaymentMethod
    const paymentStatus: PaymentStatus =
      paymentMethod === "cash" ? "pending" : "paid"
    const status: OrderStatus = "confirmed"
    const qrCode = `TE|${orderNumber}|${total}|${paymentMethod}`

    // Insert de la orden
    const orderRes = await db.query(
      `INSERT INTO "Order"
       ("id","userId","orderNumber","total","status","paymentStatus",
        "paymentMethod","qrCode","specialInstructions","createdAt","estimatedReadyTime")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"OrderStatus",
               $5::"PaymentStatus", $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        body.userId,
        orderNumber,
        total,
        status,                // enum "OrderStatus"
        paymentStatus,         // enum "PaymentStatus"
        paymentMethod,
        qrCode,
        body.specialInstructions ?? null,
        estReady,
      ]
    )

    const order = orderRes.rows[0]
    const orderId = String(order.id)

    // Insert de ítems
    const tuples: string[] = []
    const values: any[] = []
    let i = 1
    for (const r of resolved) {
      tuples.push(`(gen_random_uuid()::text, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`)
      values.push(
        orderId,
        r.dbMenuItemId,
        r.nameSnapshot,
        r.priceSnapshot,
        r.quantity,
        r.specialInstructions
      )
    }

    await db.query(
      `INSERT INTO "OrderItem"
       ("id","orderId","menuItemId","nameSnapshot","priceSnapshot","quantity","specialInstructions")
       VALUES ${tuples.join(",")}`,
      values
    )

    const itemsOut = resolved.map((r) => ({
      quantity: r.quantity,
      specialInstructions: r.specialInstructions,
      nameSnapshot: r.nameSnapshot,
      priceSnapshot: r.priceSnapshot,
      menuItemId: r.dbMenuItemId,
    }))

    return NextResponse.json({
      ...order,
      total: Number(order.total),
      items: itemsOut,
    })
  } catch (err) {
    console.error("POST /api/orders error:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

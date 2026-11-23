// app/api/menu/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const qDate = url.searchParams.get("date")
  const date = qDate ?? new Date().toISOString().slice(0, 10)

  const { rows: md } = await db.query(
    `SELECT id, "dayDate" FROM "MenuDay" WHERE "dayDate"::date = $1::date LIMIT 1`,
    [date]
  )
  if (!md.length) return NextResponse.json({ date, items: [] })

  const menuDayId = md[0].id

  // Items disponibles
  const { rows: items } = await db.query(
    `SELECT id, name, category, description, ingredients, price, available, image, "dailyLimit"
     FROM "MenuItem" WHERE "menuDayId" = $1 AND available = TRUE ORDER BY name ASC`,
    [menuDayId]
  )

  const { rows: soldRows } = await db.query(
    `WITH bounds AS (
       SELECT md.id AS menuday_id, md."dayDate"::date AS d, (md."dayDate"::date + 1) AS d2
       FROM "MenuDay" md WHERE md.id = $1
     )
     SELECT mi.id AS "menuItemId", COALESCE(SUM(oi.quantity),0) AS sold
     FROM "MenuItem" mi
     JOIN bounds b ON mi."menuDayId" = b.menuday_id
     LEFT JOIN "OrderItem" oi ON oi."menuItemId" = mi.id
     LEFT JOIN "Order" o ON o.id = oi."orderId"
       AND o."createdAt" >= b.d AND o."createdAt" < b.d2
       AND o.status <> 'cancelled'
     GROUP BY mi.id`,
    [menuDayId]
  )
  const soldMap = new Map(soldRows.map(r => [r.menuItemId, Number(r.sold)]))

  const payload = items.map(it => {
    const sold = soldMap.get(it.id) ?? 0
    const remaining = it.dailyLimit != null ? Math.max(0, Number(it.dailyLimit) - sold) : null
    return { ...it, soldToday: sold, remaining, available: remaining === null ? it.available : remaining > 0 }
  })

  return NextResponse.json({ date, items: payload })
}

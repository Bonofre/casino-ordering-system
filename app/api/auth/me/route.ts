// app/api/auth/me/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

type Role = "admin" | "student" | "cashier" | "guest"

interface SafeUser {
  id: string
  email: string
  name: string
  studentId: string
  role: Role
}

function getCookie(name: string): string | null {
  return cookies().get(name)?.value ?? null
}

export async function GET() {
  try {
    // Orden de preferencia de identificación:
    // 1) te_user_id (ID en BD)
    // 2) te_user_email (email en BD)
    // 3) x-demo-user (JSON demo con email) -> se usa solo para buscar en BD y obtener datos reales
    const userId = getCookie("te_user_id")
    const userEmail = getCookie("te_user_email")
    const demoJson = getCookie("x-demo-user")

    let result

    if (userId) {
      // Buscar por ID
      result = await db.query(
        `SELECT id, email, name, "studentId", role
         FROM "User"
         WHERE id = $1
         LIMIT 1;`,
        [userId]
      )
    } else if (userEmail) {
      // Buscar por email
      result = await db.query(
        `SELECT id, email, name, "studentId", role
         FROM "User"
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1;`,
        [userEmail]
      )
    } else if (demoJson) {
      // Fallback: cookie demo -> parsea email y busca en BD para obtener studentId/name reales
      try {
        const demo = JSON.parse(decodeURIComponent(demoJson))
        const email = String(demo?.email ?? "")
        if (!email) {
          return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }
        result = await db.query(
          `SELECT id, email, name, "studentId", role
           FROM "User"
           WHERE LOWER(email) = LOWER($1)
           LIMIT 1;`,
          [email]
        )
      } catch {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
    } else {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (!result || result.rowCount === 0) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const row = result.rows[0]
    const safeUser: SafeUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      studentId: row.studentId,
      role: row.role as Role,
    }

    return NextResponse.json(safeUser)
  } catch (err) {
    console.error("❌ Error en /api/auth/me:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

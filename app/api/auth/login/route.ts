// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

type Role = "admin" | "student" | "cashier" | "guest"

interface SafeUser {
  id: string
  email: string
  name: string
  studentId: string
  role: Role
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string }
    if (!email || !password) {
      return NextResponse.json({ message: "Faltan credenciales" }, { status: 400 })
    }

    // 1) Busca el usuario real en la BD
    const result = await db.query(
      `SELECT id, email, name, "studentId", role, password
       FROM "User"
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1;`,
      [email]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    const row = result.rows[0]

    // 2) Valida password (bcrypt $2a/$2b en tu BD)
    const ok = await bcrypt.compare(password, row.password)
    if (!ok) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    // 3) Usuario “seguro” para el cliente
    const user: SafeUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      studentId: row.studentId,
      role: row.role as Role,
    }

    // 4) Setea cookies de sesión (httpOnly)
    const isProd = process.env.NODE_ENV === "production"
    const jar = cookies()

    // Principal: ID (lo que usará /api/auth/me)
    jar.set("te_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      // opcional: expires o maxAge
    })

    // Apoyo: email (útil si alguna vez cambias el flujo)
    jar.set("te_user_email", user.email, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    })

    // Limpia cookie demo si existiera
    jar.set("x-demo-user", "", { path: "/", httpOnly: true, maxAge: 0 })

    return NextResponse.json({ user })
  } catch (err) {
    console.error("❌ Error en /api/auth/login:", err)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

// app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password, name, studentId } = await req.json()

    if (!email || !password || !name || !studentId) {
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const existing = await db.query(
      `SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
      [email]
    )
    if (existing.rowCount > 0) {
      return NextResponse.json({ message: "El usuario ya existe" }, { status: 409 })
    }

    // Hashear contraseña (seguro)
    const hashed = await bcrypt.hash(password, 10)

    // Insertar en la BD
    const result = await db.query(
      `INSERT INTO "User" (id, email, name, "studentId", role, password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'student', $4, NOW(), NOW())
       RETURNING id, email, name, "studentId", role;`,
      [email, name, studentId, hashed]
    )

    const user = result.rows[0]

    // Puedes dejar una cookie para mantener sesión después del registro
    const res = NextResponse.json({
      message: "Usuario registrado correctamente",
      user,
    })
    res.headers.set(
      "Set-Cookie",
      `te_user_id=${user.id}; Path=/; HttpOnly; SameSite=Lax`
    )

    return res
  } catch (err) {
    console.error("❌ Error en /api/auth/register:", err)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

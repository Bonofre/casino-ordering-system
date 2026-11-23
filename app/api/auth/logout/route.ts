// app/api/auth/logout/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const jar = cookies()
    const base = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // elimina
    }

    // Borra cookies reales de sesión
    jar.set("te_user_id", "", base)
    jar.set("te_user_email", "", base)

    // Borra cualquier cookie demo residual
    jar.set("x-demo-user", "", base)

    return NextResponse.json({ message: "Sesión cerrada correctamente" })
  } catch (err) {
    console.error("❌ Error en /api/auth/logout:", err)
    return NextResponse.json({ message: "Error al cerrar sesión" }, { status: 500 })
  }
}

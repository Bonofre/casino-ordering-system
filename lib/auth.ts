// lib/auth.ts
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const COOKIE_NAME = "session"

// Esta es la forma segura que vamos a exponer al frontend (coincide con types.ts)
function publicUser(u: {
  id: string
  email: string
  name: string
  studentId: string | null
  role: string
  createdAt: Date
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    studentId: u.studentId ?? "",
    role: u.role === "admin" ? "admin" : "student",
    createdAt: u.createdAt,
  }
}

async function setSessionCookie(userId: string, role: string) {
  const cookieStore = await cookies()

  // Nota: esto es simple, sin cifrado. Para producción deberíamos firmar o usar JWT.
  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({ userId, role }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure: true si estás en https
    }
  )
}

export async function createUser(input: {
  email: string
  password: string
  name: string
  studentId?: string
}) {
  const email = input.email.toLowerCase().trim()

  // regla rápida: ese correo se vuelve admin automáticamente
  const role = email === "admin@santotomas.cl" ? "admin" : "student"

  // ¿ya existe?
  const exists = await prisma.user.findUnique({
    where: { email },
  })
  if (exists) {
    throw new Error("Este correo ya está registrado")
  }

  // hash password
  const hashed = await bcrypt.hash(input.password, 10)

  const newUser = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      studentId: input.studentId?.trim() || "",
      role,
      password: hashed,
    },
  })

  // guardamos cookie sesión
  await setSessionCookie(newUser.id, newUser.role)

  return publicUser(newUser)
}

export async function loginUser(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase().trim()

  const userInDb = await prisma.user.findUnique({
    where: { email },
  })

  if (!userInDb) {
    throw new Error("Credenciales inválidas")
  }

  const ok = await bcrypt.compare(password, userInDb.password)
  if (!ok) {
    throw new Error("Credenciales inválidas")
  }

  // cookie sesión
  await setSessionCookie(userInDb.id, userInDb.role)

  return publicUser(userInDb)
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  let parsed: { userId: string; role: string } | null = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed?.userId) return null

  const userInDb = await prisma.user.findUnique({
    where: { id: parsed.userId },
  })

  if (!userInDb) return null

  return publicUser(userInDb)
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

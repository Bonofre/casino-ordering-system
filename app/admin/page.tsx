"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok) { router.push("/"); return }
        const me = await res.json()
        if (me?.role === "admin") setIsAuthorized(true)
        else router.push("/")
      } catch { router.push("/") }
      finally { setIsLoading(false) }
    })()
  }, [router])

  if (isLoading) return null
  if (!isAuthorized) return null
  return <AdminDashboard />
}

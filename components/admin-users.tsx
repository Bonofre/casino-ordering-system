// components/admin-users.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"
import { Loader2, ShieldCheck, ShieldAlert, Trash2, KeyRound, UserCog } from "lucide-react"

export default function AdminUsers() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`/api/users`, { cache: "no-store" })
        if (!res.ok) throw new Error("No autorizado o error de red")
        const data: User[] = await res.json()
        setUsers(data)
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message ?? "No se pudieron cargar los usuarios",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const roleOk = roleFilter === "all" ? true : u.role === roleFilter
      const txt = `${u.name ?? ""} ${u.email ?? ""} ${u.studentId ?? ""}`.toLowerCase()
      const qOk = !search ? true : txt.includes(search.toLowerCase())
      return roleOk && qOk
    })
  }, [users, roleFilter, search])

  async function changeRole(u: User, role: User["role"]) {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar el rol")
      const updated: User = await res.json()
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      toast({ title: "Rol actualizado", description: `${u.email} → ${role}` })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo actualizar el rol",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword(u: User) {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password" }),
      })
      if (!res.ok) throw new Error("No se pudo resetear la contraseña")
      const { tempPassword } = await res.json()
      toast({
        title: "Contraseña temporal creada",
        description: `Nueva clave temporal: ${tempPassword}\nPídele que la cambie al ingresar.`,
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo resetear la contraseña",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  async function removeUser(u: User) {
    if (!confirm(`¿Eliminar usuario ${u.email}?`)) return
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar el usuario")
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      toast({ title: "Usuario eliminado", description: u.email })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo eliminar",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando usuarios…
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-orange-600" />
          Usuarios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, correo o matrícula"
            />
          </div>
          <div>
            <Label className="text-xs">Rol</Label>
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Usuario</th>
                  <th className="py-2 pr-3">Correo</th>
                  <th className="py-2 pr-3">Matrícula</th>
                  <th className="py-2 pr-3">Rol</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-3 font-medium">{u.name ?? "—"}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{(u as any).studentId ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        className={
                          u.role === "admin"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-emerald-100 text-emerald-800"
                        }
                      >
                        {u.role === "admin" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <ShieldAlert className="h-3 w-3 mr-1" />
                        )}
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-right space-x-2">
                      <Select onValueChange={(v: any) => changeRole(u, v)} value={u.role}>
                        <SelectTrigger className="h-8 w-36 inline-flex justify-between">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Estudiante</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => resetPassword(u)}
                        disabled={busyId === u.id}
                      >
                        {busyId === u.id ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <KeyRound className="h-3 w-3 mr-2" />
                        )}
                        Reset clave
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600"
                        onClick={() => removeUser(u)}
                        disabled={busyId === u.id}
                      >
                        <Trash2 className="h-3 w-3 mr-2" /> Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

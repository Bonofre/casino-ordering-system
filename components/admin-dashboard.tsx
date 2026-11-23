// components/admin-dashboard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AdminAnalytics from "@/components/admin-analytics"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"
import {
  CheckCircle,
  Loader2,
  PackageCheck,
  Timer,
  UtensilsCrossed,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  KeyRound,
  BarChart3,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"

// ===================== AUTH WRAPPER =====================
export function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok) {
          router.push("/")
          return
        }
        const me: User = await res.json()
        if (String(me.role).toLowerCase() === "admin") {
          setIsAuthorized(true)
        } else {
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos de administrador",
            variant: "destructive",
          })
          router.push("/")
        }
      } catch {
        router.push("/")
      } finally {
        setAuthChecked(true)
      }
    }
    checkAdmin()
  }, [router, toast])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Verificando credenciales…
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER ADMIN */}
      <header className="bg-white shadow-sm border-b w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 w-full">
            <div className="flex items-center">
              <div className="bg-orange-500 p-2 rounded-lg mr-3">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-500">Casino Universidad Arica</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" })
                router.replace("/")
              }}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>


      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList
          className="
      w-full justify-start gap-2 rounded-full bg-muted p-1 shadow-sm
      border border-orange-100
    "
        >
          <TabsTrigger
            value="orders"
            className="
        flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm
        data-[state=active]:bg-orange-500 data-[state=active]:text-white
        data-[state=active]:shadow-md
        hover:bg-orange-50
      "
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Pedidos</span>
          </TabsTrigger>

          <TabsTrigger
            value="products"
            className="
        flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm
        data-[state=active]:bg-orange-500 data-[state=active]:text-white
        data-[state=active]:shadow-md
        hover:bg-orange-50
      "
          >
            <PackageCheck className="h-4 w-4" />
            <span>Productos</span>
          </TabsTrigger>

          <TabsTrigger
            value="menu"
            className="
        flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm
        data-[state=active]:bg-orange-500 data-[state=active]:text-white
        data-[state=active]:shadow-md
        hover:bg-orange-50
      "
          >
            <Timer className="h-4 w-4" />
            <span>Menú del día</span>
          </TabsTrigger>

          <TabsTrigger
            value="users"
            className="
        flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm
        data-[state=active]:bg-orange-500 data-[state=active]:text-white
        data-[state=active]:shadow-md
        hover:bg-orange-50
      "
          >
            <UserCog className="h-4 w-4" />
            <span>Usuarios</span>
          </TabsTrigger>

          <TabsTrigger
            value="analytics"
            className="
        flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm
        data-[state=active]:bg-orange-500 data-[state=active]:text-white
        data-[state=active]:shadow-md
        hover:bg-orange-50
      "
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analíticas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersAdmin />
        </TabsContent>

        <TabsContent value="products">
          <ProductsAdmin />
        </TabsContent>

        <TabsContent value="menu">
          <MenuAdmin />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

      </Tabs>
    </div>
  )
}

// ===================== SUBCOMPONENTE: PEDIDOS =====================
function OrdersAdmin() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled">("all")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "paid" | "failed" | "refunded">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let alive = true
    let iv: NodeJS.Timeout | null = null

    async function loadOrders() {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" })
        if (!res.ok) throw new Error("fetch /api/orders failed")
        const data = await res.json()
        const normalized: any[] = (Array.isArray(data) ? data : []).map((o: any) => ({
          ...o,
          total: Number(o.total ?? 0),
          createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
          estimatedReadyTime: o.estimatedReadyTime ? new Date(o.estimatedReadyTime) : undefined,
          items: Array.isArray(o.items) ? o.items : [],
        }))
        if (alive) setOrders(normalized)
      } catch {
        if (alive) setOrders([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadOrders()

    function start() {
      if (!iv) iv = setInterval(loadOrders, 3000)
    }
    function stop() {
      if (iv) {
        clearInterval(iv)
        iv = null
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        loadOrders()
        start()
      } else {
        stop()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    if (document.visibilityState === "visible") start()

    return () => {
      alive = false
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const okStatus = statusFilter === "all" ? true : o.status === statusFilter
      const okPay = paymentFilter === "all" ? true : o.paymentStatus === paymentFilter
      const txt = `${o.orderNumber ?? ""} ${o.userId ?? ""}`.toLowerCase()
      const okSearch = !search ? true : txt.includes(search.toLowerCase())
      return okStatus && okPay && okSearch
    })
  }, [orders, statusFilter, paymentFilter, search])

  async function patchOrder(orderId: string, patch: Partial<any>) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      toast({ title: "Error", description: "No se pudo actualizar el pedido", variant: "destructive" })
      return
    }
    const updated = await res.json()
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
  }

  const setStatus = (order: any, status: any) => {
    patchOrder(order.id, { status })
    toast({ title: "Estado actualizado", description: `Pedido ${order.orderNumber} → ${status}` })
  }

  const setPayment = (order: any, paymentStatus: any) => {
    patchOrder(order.id, { paymentStatus })
    toast({ title: "Pago actualizado", description: `Pedido ${order.orderNumber} → ${paymentStatus}` })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-orange-600" />
          Pedidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="N° pedido o userId" />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="preparing">Preparando</SelectItem>
                <SelectItem value="ready">Listo</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Pago</Label>
            <Select value={paymentFilter} onValueChange={(v: any) => setPaymentFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando pedidos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No hay pedidos que coincidan.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderRow key={order.id} order={order} onChangeStatus={setStatus} onChangePayment={setPayment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OrderRow({
  order,
  onChangeStatus,
  onChangePayment,
}: {
  order: any
  onChangeStatus: (o: any, s: any) => void
  onChangePayment: (o: any, p: any) => void
}) {
  const totalItems = (order.items ?? []).reduce((s: number, it: any) => s + (it?.quantity ?? 0), 0)

  const prettyPay =
    order.paymentStatus === "paid" ? (
      <Badge className="bg-emerald-100 text-emerald-800">Pagado</Badge>
    ) : (
      <Badge variant="destructive">Pendiente</Badge>
    )

  const isScheduled =
    order.createdAt && order.estimatedReadyTime
      ? new Date(order.createdAt as any).toDateString() !==
      new Date(order.estimatedReadyTime as any).toDateString()
      : false

  return (
    <div className="border rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-lg flex items-center gap-2">
            <span>{order.orderNumber ?? "(sin número)"}</span>
            {isScheduled && (
              <span className="px-2 py-0.5 text-[10px] rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Programado
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {order.createdAt ? new Date(order.createdAt as any).toLocaleString("es-CL") : ""}
          </div>
          <div className="text-sm mt-1">
            {totalItems} ítem(s) — Total:{" "}
            <strong>
              {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(
                Number(order.total ?? 0),
              )}
            </strong>
          </div>

          {order.estimatedReadyTime && (
            <div className="text-xs mt-0.5">
              <span className={isScheduled ? "text-blue-700 font-semibold" : "text-muted-foreground"}>
                <strong>{isScheduled ? "Programado para:" : "Listo aprox.:"}</strong>{" "}
                {new Date(order.estimatedReadyTime as any).toLocaleString("es-CL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-1">
            Método:{" "}
            {order.paymentMethod === "cash"
              ? "Efectivo"
              : order.paymentMethod === "card"
                ? "Tarjeta"
                : order.paymentMethod === "transfer"
                  ? "Transferencia"
                  : order.paymentMethod === "junaeb"
                    ? "JUNAEB"
                    : order.paymentMethod}
          </div>
        </div>

        <div className="flex items-center gap-2">{prettyPay}</div>

        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={(v: any) => onChangeStatus(order, v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {order.paymentStatus === "pending" ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onChangePayment(order, "paid")}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Marcar pagado
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onChangePayment(order, "pending")}>
              Desmarcar pago
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground">
        {(order.items ?? []).map((ci: any, idx: number) => (
          <div key={ci?.id ?? `${order.id}-${idx}`}>
            • {(ci?.nameSnapshot ?? ci?.menuItem?.name ?? ci?.menuItemId ?? "(item)")} × {ci?.quantity ?? 0}
            {ci?.specialInstructions && <span className="text-xs text-orange-600 ml-2">({ci.specialInstructions})</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== SUBCOMPONENTE: PRODUCTOS =====================
function ProductsAdmin() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [menuDayId, setMenuDayId] = useState<string>("")
  const [items, setItems] = useState<any[]>([])

  const [name, setName] = useState("")
  const [price, setPrice] = useState<number | "">("")
  const [category, setCategory] = useState("principal")
  const [available, setAvailable] = useState(true)
  const [ingredients, setIngredients] = useState<string>("")
  const [dailyLimit, setDailyLimit] = useState<number | "">("")

  async function loadForDate(d: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/menu-day?date=${d}`, { cache: "no-store" })
      const data = await res.json()
      setMenuDayId(data.menuDayId)
      setItems(data.items || [])
    } catch {
      setItems([])
      setMenuDayId("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForDate(date)
  }, [date])

  async function createProduct() {
    if (!menuDayId) {
      toast({ title: "Sin día de menú", description: "No hay MenuDay para la fecha", variant: "destructive" })
      return
    }
    const res = await fetch("/api/admin/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuDayId,
        name,
        category,
        price: typeof price === "string" ? parseInt(price || "0") : price,
        ingredients: ingredients ? ingredients.split(",").map((s) => s.trim()).filter(Boolean) : [],
        available,
        dailyLimit: dailyLimit === "" ? 0 : Number(dailyLimit),
      }),
    })
    if (!res.ok) {
      toast({ title: "No se pudo crear producto", variant: "destructive" })
      return
    }
    setName("")
    setPrice("")
    setCategory("principal")
    setAvailable(true)
    setIngredients("")
    setDailyLimit("")
    await loadForDate(date)
    toast({ title: "Producto creado" })
  }

  async function updateItem(id: string, patch: any) {
    const res = await fetch(`/api/admin/menu-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      toast({ title: "No se pudo actualizar", variant: "destructive" })
      return
    }
    await loadForDate(date)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-orange-600" />
          Productos del día
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Fecha del menú:</Label>
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Precio (CLP)" type="number" value={price} onChange={(e) => setPrice(e.target.value as any)} />
          <Select value={category} onValueChange={(v) => setCategory(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
              <SelectItem value="postre">Postre</SelectItem>
              <SelectItem value="bebida">Bebida</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
              <SelectItem value="sandwich">Sándwich</SelectItem>
              <SelectItem value="desayuno">Desayuno</SelectItem>
              <SelectItem value="combo">Combo</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Ingredientes (coma-separados)" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
          <Input placeholder="Cupo de hoy" type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value as any)} />
          <Button className="bg-orange-500" onClick={createProduct}>Crear producto</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando productos…
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Aún no hay productos para esta fecha.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Nombre</th>
                  <th className="text-left py-2 pr-4">Categoría</th>
                  <th className="text-left py-2 pr-4">Precio</th>
                  <th className="text-left py-2 pr-4">Disponible</th>
                  <th className="text-left py-2 pr-4">Cupo</th>
                  <th className="text-left py-2 pr-4">Restante</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 pr-4">{item.name}</td>
                    <td className="py-2 pr-4 capitalize">{item.category}</td>
                    <td className="py-2 pr-4">
                      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(item.price)}
                    </td>
                    <td className="py-2 pr-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!item.available} onChange={(e) => updateItem(item.id, { available: e.target.checked })} />
                        <span className="text-xs">{item.available ? "Sí" : "No"}</span>
                      </label>
                    </td>
                    <td className="py-2 pr-4">
                      <InlineLimitEditor value={item.dailyLimit ?? 0} onSave={(v) => updateItem(item.id, { dailyLimit: Number(v) })} />
                    </td>
                    <td className="py-2 pr-4">
                      {item.remaining == null ? (
                        <Badge className="bg-green-100 text-green-800">Sin límite</Badge>
                      ) : item.remaining > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800">Quedan {item.remaining}</Badge>
                      ) : (
                        <Badge variant="destructive">Agotado</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PackageCheck className="h-4 w-4" /> Cambios guardados en la base de datos.
        </div>
      </CardContent>
    </Card>
  )
}

function InlineLimitEditor({ value, onSave }: { value: number; onSave: (val: number) => void }) {
  const [v, setV] = useState<string>(String(value ?? 0))
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Input type="number" className="w-24" value={v} onChange={(e) => setV(e.target.value)} />
      <Button
        disabled={saving}
        className="bg-emerald-600 disabled:opacity-50"
        onClick={async () => {
          setSaving(true)
          await onSave(Number(v || 0))
          setSaving(false)
        }}
      >
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  )
}

// ===================== SUBCOMPONENTE: MENÚ DEL DÍA =====================
function MenuAdmin() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [menuDate, setMenuDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(`/api/menu-day?date=${menuDate}`, { cache: "no-store" })
        const data = await res.json()
        setItems(data.items ?? [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    loadMenu()
  }, [menuDate])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-orange-600" /> Menú del día
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Fecha:</Label>
          <Input type="date" className="w-auto" value={menuDate} onChange={(e) => setMenuDate(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-muted-foreground flex items-center py-10">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando menú…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((it) => (
              <div key={it.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{it.category}</div>
                    <div className="text-sm text-orange-600 font-medium mt-1">
                      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(it.price)}
                    </div>
                  </div>
                  {it.remaining == null ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponible</Badge>
                  ) : it.remaining > 0 ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Quedan {it.remaining}</Badge>
                  ) : (
                    <Badge variant="destructive">Agotado</Badge>
                  )}
                </div>
                {typeof it.soldToday === "number" && (
                  <div className="text-xs text-muted-foreground">Vendidos hoy: {it.soldToday}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PackageCheck className="h-4 w-4" /> Datos calculados con pedidos del día.
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== SUBCOMPONENTE: USUARIOS (ADMIN) =====================
function AdminUsers() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  // modal crear usuario
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newStudentId, setNewStudentId] = useState("")
  const [newRole, setNewRole] = useState<"student" | "admin">("student")
  const [newPassword, setNewPassword] = useState("")
  const [creating, setCreating] = useState(false)

  // ---- cargar / recargar ----
  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users`, { cache: "no-store" })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`GET /api/users -> ${res.status} ${msg}`)
      }
      const raw = await res.json()
      const data = (Array.isArray(raw) ? raw : []).map((u: any) => ({
        ...u,
        role: u.role ? String(u.role).toLowerCase() : "student",
        studentId: u.studentId != null ? String(u.studentId) : null,
      }))
      setUsers(data)
    } catch (e: any) {
      setUsers([])
      toast({
        title: "Error al cargar usuarios",
        description: e?.message ?? "Verifica el endpoint /api/users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- filtro robusto ----
  const filtered = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return users.filter((u) => {
      if (roleFilter !== "all" && (u.role ?? "student") !== roleFilter) return false
      const text = [u.name ?? "", u.email ?? "", u.studentId ?? "", u.id ?? ""].join(" ").toLowerCase()
      return tokens.every((t) => text.includes(t))
    })
  }, [users, roleFilter, search])

  async function changeRole(u: any, role: "student" | "admin") {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar el rol")
      const updated = await res.json()
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated, role: String(updated.role).toLowerCase() } : x)))
      toast({ title: "Rol actualizado", description: `${u.email} → ${role}` })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "No se pudo actualizar el rol", variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword(u: any) {
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
      toast({ title: "Error", description: e?.message ?? "No se pudo resetear la contraseña", variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  async function removeUser(u: any) {
    if (!confirm(`Eliminar usuario ${u.email}?`)) return
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar el usuario")
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      toast({ title: "Usuario eliminado", description: u.email })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "No se pudo eliminar", variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  function emailOk(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }
  async function createUser() {
    if (!emailOk(newEmail)) {
      toast({ title: "Email inválido", variant: "destructive" })
      return
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Contraseña muy corta (mín. 6)", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || null,
          studentId: newStudentId.trim() || null,
          role: newRole,
          password: newPassword,
        }),
      })
      if (!res.ok) throw new Error("No se pudo crear el usuario")
      const created = await res.json()
      setUsers((prev) => [{ ...created, role: String(created.role).toLowerCase(), studentId: created.studentId != null ? String(created.studentId) : null }, ...prev])
      setNewName("")
      setNewEmail("")
      setNewStudentId("")
      setNewPassword("")
      setNewRole("student")
      setOpen(false)
      toast({ title: "Usuario creado", description: created.email })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "No se pudo crear el usuario", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-orange-600" />
            Usuarios
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadUsers}>Refrescar</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, correo, ID de estudiante o ID interno"
            />
          </div>
          <div>
            <Label className="text-xs">Rol</Label>
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">Nuevo usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear usuario</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Nombre</Label>
                    <Input className="col-span-2" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Correo</Label>
                    <Input className="col-span-2" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="usuario@dominio.cl" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">ID de estudiante</Label>
                    <Input className="col-span-2" value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Rol</Label>
                    <div className="col-span-2">
                      <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Estudiante</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Contraseña</Label>
                    <Input className="col-span-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={createUser} disabled={creating} className="bg-orange-600 hover:bg-orange-700">
                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Crear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando usuarios…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Usuario</th>
                  <th className="py-2 pr-3">Correo</th>
                  <th className="py-2 pr-3">ID de estudiante</th>
                  <th className="py-2 pr-3">Rol</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-3 font-medium">{u.name ?? "—"}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.studentId ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge className={u.role === "admin" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}>
                        {u.role === "admin" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
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
                      <Button size="sm" variant="outline" className="h-8" onClick={() => resetPassword(u)} disabled={busyId === u.id}>
                        {busyId === u.id ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <KeyRound className="h-3 w-3 mr-2" />}
                        Reset clave
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-red-600" onClick={() => removeUser(u)} disabled={busyId === u.id}>
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
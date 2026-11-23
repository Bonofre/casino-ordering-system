"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Clock, Package, CheckCircle, XCircle, QrCode, RefreshCcw, Star } from "lucide-react"
import type { Order, User } from "@/lib/types"
import { UnifiedQR } from "@/components/payment-forms"

interface OrderHistoryProps {
  user: User
}

type RatingMap = Record<
  string,
  {
    score: number
    comment?: string
  }
>

export function OrderHistory({ user }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [qrOpen, setQrOpen] = useState(false)
  const [qrValue, setQrValue] = useState<string>("")
  const [qrLabel, setQrLabel] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  // Estado para encuestas de satisfacción
  const [ratings, setRatings] = useState<RatingMap>({})
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null)
  const [ratingScore, setRatingScore] = useState<number>(5)
  const [ratingComment, setRatingComment] = useState<string>("")
  const [savingRating, setSavingRating] = useState(false)

  const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n)

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`)
      const data = await res.json()
      const normalized: Order[] = (data ?? []).map((o: any) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
        estimatedReadyTime: o.estimatedReadyTime ? new Date(o.estimatedReadyTime) : undefined,
      }))
      setOrders(normalized)
    } catch {
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRatings = async () => {
    try {
      const res = await fetch(`/api/order-ratings?userId=${user.id}`)
      if (!res.ok) return
      const data: any[] = await res.json()
      const map: RatingMap = {}
      data.forEach((r) => {
        map[r.orderId] = {
          score: r.score,
          comment: r.comment ?? undefined,
        }
      })
      setRatings(map)
    } catch {
      // si falla, simplemente no mostramos calificaciones
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchRatings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  useEffect(() => {
    // refresca pedidos y calificaciones cada 5 segundos
    const interval = setInterval(() => {
      fetchOrders()
      fetchRatings()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatDateTime = (date?: Date) => {
    if (!date) return "N/A"
    return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })
  }

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <Package className="h-4 w-4" />
      case "preparing":
        return <Clock className="h-4 w-4" />
      case "ready":
        return <CheckCircle className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "preparing":
        return "bg-orange-100 text-orange-800"
      case "ready":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "confirmed":
        return "Confirmado"
      case "preparing":
        return "Preparando"
      case "ready":
        return "Listo"
      case "completed":
        return "Completado"
      case "cancelled":
        return "Cancelado"
      default:
        return "Desconocido"
    }
  }

  // Mismo payload estándar del checkout para consistencia de QR
  const buildQrPayload = (order: Order) =>
    JSON.stringify({
      v: 1,
      orderNumber: order.orderNumber,
      userId: order.userId,
      amount: order.total,
      pm: order.paymentMethod?.toUpperCase?.() ?? "UNKNOWN",
      ts: order.createdAt ?? Date.now(),
      callback:
        order.paymentMethod?.toLowerCase() === "junaeb"
          ? "/api/payments/junaeb/confirm"
          : "/api/payments/qr/confirm",
    })

  const openQr = (order: Order) => {
    const value = order.qrCode && order.qrCode.trim().length > 0 ? order.qrCode : buildQrPayload(order)
    setQrValue(value)
    setQrLabel(`Pedido ${order.orderNumber}`)
    setQrOpen(true)
  }

  const copyQr = async () => {
    try {
      await navigator.clipboard.writeText(qrValue)
    } catch {
      // no-op
    }
  }

  // --------- ENCUESTA: abrir modal ----------
  const openRatingDialog = (order: Order) => {
    const existing = ratings[order.id]
    setRatingOrder(order)
    setRatingScore(existing?.score ?? 5)
    setRatingComment(existing?.comment ?? "")
    setRatingOpen(true)
  }

  // --------- ENCUESTA: enviar ----------
  const submitRating = async () => {
    if (!ratingOrder) return
    setSavingRating(true)
    try {
      const res = await fetch("/api/order-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ratingOrder.id,
          userId: user.id,
          score: ratingScore,
          comment: ratingComment.trim() || null,
        }),
      })

      if (!res.ok) {
        console.error("Error al guardar calificación")
        return
      }

      const saved: any = await res.json()
      setRatings((prev) => ({
        ...prev,
        [saved.orderId]: {
          score: saved.score,
          comment: saved.comment ?? undefined,
        },
      }))
      setRatingOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRating(false)
    }
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes pedidos aún</h3>
          <p className="text-gray-500 mb-6">Cuando hagas tu primer pedido, aparecerá aquí.</p>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={fetchOrders}>
            Actualizar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mis pedidos</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => {
          const rating = ratings[order.id]

          return (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Pedido #{order.orderNumber}</CardTitle>
                  <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                </div>
                <CardDescription>{formatDateTime(order.createdAt as Date)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">
                      <strong>Total:</strong>{" "}
                      <span className="text-orange-600 font-semibold">{formatCLP(order.total)}</span>
                    </p>
                    {/* ===== PAGO ===== */}
                    <p className="text-sm text-gray-600">
                      <strong>Pago:</strong>{" "}
                      {order.paymentMethod !== "cash" ? "Pagado" : order.paymentStatus === "paid" ? "Pagado" : "Pendiente"}{" "}
                      {order.paymentMethod ? `(${order.paymentMethod.toUpperCase()})` : ""}
                    </p>

                    {/* ===== LISTO / PROGRAMADO ===== */}
                    {order.estimatedReadyTime && (() => {
                      const created = new Date(order.createdAt as any)
                      const ready = new Date(order.estimatedReadyTime as any)
                      const isScheduled = ready.toDateString() !== created.toDateString()

                      const readyLabel = ready.toLocaleString("es-CL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })

                      return (
                        <p className="text-sm text-gray-600">
                          <strong>{isScheduled ? "Programado para:" : "Listo aprox.:"}</strong>{" "}
                          {readyLabel}
                        </p>
                      )
                    })()}

                    {order.specialInstructions ? (
                      <p className="text-sm text-gray-600">
                        <strong>Notas:</strong> {order.specialInstructions}
                      </p>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <div className="rounded-lg border p-3 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2">Resumen</div>
                      <div className="space-y-2 max-h-28 overflow-y-auto">
                        {order.items?.length ? (
                          order.items.map((it) => {
                            const anyItem = it as any
                            const name =
                              anyItem.nameSnapshot ??
                              it.menuItem?.name ??
                              anyItem.name ??
                              it.menuItemId ??
                              "Producto"

                            const unitPrice =
                              Number(anyItem.priceSnapshot ?? it.menuItem?.price ?? 0)

                            return (
                              <div
                                key={it.id ?? `${order.id}-${it.menuItemId}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="truncate">
                                  × {it.quantity} {name}
                                </span>
                                <span className="font-medium">
                                  {formatCLP(unitPrice * it.quantity)}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-sm text-gray-500">Sin detalle de items</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloque de calificación, si ya existe */}
                {rating && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-xs text-gray-600 mb-1">Tu evaluación de este pedido:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < rating.score ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{rating.score}/5</span>
                    </div>
                    {rating.comment && (
                      <p className="text-xs text-gray-700 mt-1">“{rating.comment}”</p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {getStatusIcon(order.status)}
                    <span>{getStatusText(order.status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => openQr(order)}
                    >
                      <QrCode className="h-4 w-4" />
                      Ver QR
                    </Button>

                    {/* Encuesta de satisfacción: solo cuando el pedido está completado */}
                    {order.status === "completed" && (
                      <Button
                        variant={rating ? "outline" : "default"}
                        size="sm"
                        className={rating ? "" : "bg-orange-500 hover:bg-orange-600"}
                        onClick={() => openRatingDialog(order)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {rating ? "Editar evaluación" : "Evaluar pedido"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog QR */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{qrLabel}</DialogTitle>
            <DialogDescription>Muestra este QR en caja para validar y retirar tu pedido.</DialogDescription>
          </DialogHeader>
          <UnifiedQR value={qrValue} title={qrLabel} />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copyQr}>
              Copiar contenido del QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de encuesta de satisfacción */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ratingOrder ? `Evaluar pedido #${ratingOrder.orderNumber}` : "Evaluar pedido"}
            </DialogTitle>
            <DialogDescription>
              Cuéntanos qué te pareció este pedido. Cada evaluación ayuda a mejorar el servicio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Calificación general</p>
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="p-1"
                    onClick={() => setRatingScore(i + 1)}
                  >
                    <Star
                      className={`h-6 w-6 ${i < ratingScore ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">{ratingScore} / 5</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Comentario (opcional)</p>
              <textarea
                className="w-full border rounded-md p-2 text-sm resize-none"
                rows={3}
                placeholder="Ej: La comida estaba rica y llegó a tiempo."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRatingOpen(false)}
                disabled={savingRating}
              >
                Cancelar
              </Button>
              <Button
                onClick={submitRating}
                disabled={savingRating}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {savingRating ? "Guardando..." : "Enviar evaluación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
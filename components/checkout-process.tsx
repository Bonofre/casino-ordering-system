"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Banknote, Smartphone, Clock, CheckCircle, AlertCircle, QrCode } from "lucide-react"
import { PaymentForms, UnifiedQR } from "./payment-forms"
import type { CartItem, Order, User } from "@/lib/types"

/* ======================== Props ======================== */
interface CheckoutProcessProps {
  cartItems: CartItem[]
  user: User
  onOrderComplete: (order: Order) => void
  onBack: () => void
}
type PM = "cash" | "card" | "transfer" | "junaeb"

/* ======================== Componente principal ======================== */
export function CheckoutProcess({ cartItems, user, onOrderComplete, onBack }: CheckoutProcessProps) {
  const [step, setStep] = useState<"review" | "payment" | "confirmation">("review")
  const [paymentMethod, setPaymentMethod] = useState<PM>("cash")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [customerName, setCustomerName] = useState(user.name)
  const [customerPhone, setCustomerPhone] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const { toast } = useToast()

  // Programar pedido: hoy vs fecha futura (limitada)
  const maxDaysAhead = 3

  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
  }, [])

  const maxDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + maxDaysAhead)
    return d.toISOString().slice(0, 10)
  }, [])

  // Modo: pedir para hoy o programar
  const [pickupMode, setPickupMode] = useState<"today" | "scheduled">("today")

  // Fecha seleccionada (por defecto hoy)
  const [pickupDate, setPickupDate] = useState<string>(todayStr)

  // Hora seleccionada (por defecto, por ejemplo, 13:00)
  const [pickupTime, setPickupTime] = useState<string>("13:00")

  const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n)

  const subtotal = cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.1) // dejamos 10% para consistencia con el resto de la UI
  const total = subtotal + tax

  // Construye payload estandarizado para QR (igual para todos)
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

  // Base del payload para crear orden (AHORA incluye snapshots name/price)
  const newOrderPayloadBase = useMemo(
    () => ({
      userId: user.id,
      specialInstructions: specialInstructions || undefined,
      items: cartItems.map((item) => ({
        menuItemId: item.menuItem.id,                         // puede ser uuid o no; el backend lo maneja
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || undefined,
        // --- Snapshots obligatorios para que el backend siempre pueda guardar:
        name: item.menuItem.name,
        price: Number(item.menuItem.price),
      })),
    }),
    [user.id, specialInstructions, cartItems]
  )

  /* ======================== Callbacks de pago ======================== */
  const handlePaymentSuccess = async (paymentData: any) => {
    setIsProcessing(true)
    setPaymentError(null)

    // Construimos scheduledAt en base al modo de retiro
    let scheduledAt: string | undefined = undefined

    if (pickupMode === "scheduled") {
      // Combina fecha y hora: "YYYY-MM-DDTHH:MM:00"
      const combined = new Date(`${pickupDate}T${pickupTime}:00`)
      if (!Number.isNaN(combined.getTime())) {
        scheduledAt = combined.toISOString()
      }
    }

    const payloadToSend = {
      ...newOrderPayloadBase,
      paymentMethod, // "cash" | "card" | "transfer" | "junaeb"
      scheduledAt,
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      })

      if (!res.ok) throw new Error("No se pudo crear la orden en el servidor")

      const savedOrder: Order = await res.json()
      setCompletedOrder(savedOrder)
      onOrderComplete(savedOrder)
      setStep("confirmation")

      toast({
        title: "¡Pedido confirmado!",
        description: `Tu pedido ${savedOrder.orderNumber} ha sido procesado.`,
      })
    } catch (err) {
      console.error(err)
      setPaymentError("Error al guardar el pedido en el servidor")
      toast({
        title: "Error",
        description: "No se pudo guardar el pedido. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentError = (error: string) => {
    setPaymentError(error)
    toast({
      title: "Error en el pago",
      description: error,
      variant: "destructive",
    })
  }

  /* ======================== Render por pasos ======================== */
  if (step === "confirmation" && completedOrder) {
    return <OrderConfirmation order={completedOrder} formatCLP={formatCLP} buildQrPayload={buildQrPayload} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Steps */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <StepBubble active={step === "review"} n={1} label="Revisar Pedido" />
        <div className="w-8 h-px bg-gray-300" />
        <StepBubble active={step === "payment"} n={2} label="Pago" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {step === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Revisa tu pedido</CardTitle>
                <CardDescription>Confirma tus datos y agrega instrucciones especiales si lo necesitas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Datos del cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      id="phone"
                      placeholder="+56 9 1234 5678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Instrucciones */}
                <div>
                  <Label htmlFor="instr">Instrucciones especiales</Label>
                  <Textarea
                    id="instr"
                    placeholder="Sin cebolla, sin sal, retirar a las 13:15, etc."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>

                {/* Programar retiro: fecha + hora */}
                <div className="space-y-2">
                  <Label>¿Cuándo quieres retirar tu pedido?</Label>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={pickupMode === "today" ? "default" : "outline"}
                      onClick={() => {
                        setPickupMode("today")
                        setPickupDate(todayStr)
                      }}
                    >
                      Hoy
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={pickupMode === "scheduled" ? "default" : "outline"}
                      onClick={() => setPickupMode("scheduled")}
                    >
                      Programar para otro día
                    </Button>
                  </div>

                  {pickupMode === "scheduled" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Día:</span>
                        <Input
                          type="date"
                          value={pickupDate}
                          min={todayStr}
                          max={maxDateStr}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-auto"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Hora:</span>
                        <Input
                          type="time"
                          value={pickupTime}
                          // puedes ajustar estos mínimos/máximos a horario real del casino
                          min="11:00"
                          max="18:00"
                          step={15 * 60} // pasos de 15 minutos
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-auto"
                        />
                      </div>

                      <span className="text-xs text-gray-500">
                        Puedes programar hasta {maxDaysAhead} días en el futuro.
                      </span>
                    </div>
                  )}

                  {pickupMode === "today" && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Tu pedido se preparará para hoy (la hora estimada la calcula el sistema).
                    </p>
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-medium">Items</h4>
                  <div className="space-y-3">
                    {cartItems.map((ci) => (
                      <div key={ci.menuItem.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{ci.menuItem.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCLP(ci.menuItem.price)} × {ci.quantity}
                          </p>
                        </div>
                        <Badge variant="secondary">{formatCLP(ci.menuItem.price * ci.quantity)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCLP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (10%)</span>
                    <span>{formatCLP(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCLP(total)}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={onBack}>
                    Volver
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => setStep("payment")}
                    disabled={cartItems.length === 0}
                  >
                    Continuar a Pago
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "payment" && (
            <Card>
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
                <CardDescription>Selecciona tu forma de pago y completa el proceso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

                <div className="rounded-lg border p-4">
                  <PaymentForms
                    paymentMethod={paymentMethod}
                    total={total}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                </div>

                {paymentError && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {paymentError}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("review")} disabled={isProcessing}>
                    Volver
                  </Button>
                  <Button disabled className="opacity-70">
                    Total: {formatCLP(total)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Aside: tiempo y total */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                Tiempo estimado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <p>Preparación: <strong>15–20 min</strong></p>
              <p className="mt-1">Retiro en mostrador con tu <strong>número de pedido</strong>.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (10%)</span>
                <span>{formatCLP(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-orange-600">{formatCLP(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ======================== Subcomponentes ======================== */

function StepBubble({ active, n, label }: { active: boolean; n: number; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${active ? "text-orange-600" : "text-gray-400"}`}>
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center border ${active ? "bg-orange-50 border-orange-300" : "bg-white border-gray-300"
          }`}
      >
        <span className="text-sm font-semibold">{n}</span>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PM
  onChange: (pm: PM) => void
}) {
  const options: Array<{ id: PM; label: string; icon: any; hint?: string }> = [
    { id: "cash", label: "Efectivo", icon: Banknote, hint: "Pagas al retirar" },
    { id: "card", label: "Tarjeta", icon: CreditCard, hint: "Procesado en línea (simulado)" },
    { id: "transfer", label: "Transferencia", icon: Smartphone, hint: "Datos para transferencia en la siguiente tarjeta" },
    { id: "junaeb", label: "JUNAEB", icon: QrCode, hint: "Se genera QR y se valida en caja" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`text-left rounded-lg border p-4 hover:bg-orange-50 transition ${active ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${active ? "text-orange-600" : "text-gray-500"}`} />
                <span className="font-medium">{opt.label}</span>
              </div>
              {active ? <Badge variant="secondary">Seleccionado</Badge> : null}
            </div>
            {opt.hint ? <p className="text-xs text-gray-500 mt-1">{opt.hint}</p> : null}
          </button>
        )
      })}
    </div>
  )
}

function OrderConfirmation({
  order,
  formatCLP,
  buildQrPayload,
}: {
  order: Order
  formatCLP: (n: number) => string
  buildQrPayload: (o: Order) => string
}) {
  const when = order.createdAt
    ? new Date(order.createdAt as any).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })
    : "Ahora"

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            ¡Pedido confirmado!
          </CardTitle>
          <CardDescription>Presenta este QR y tu número en el mostrador para retirar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pedido</p>
              <p className="text-lg font-semibold">#{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-lg font-semibold text-orange-600">{formatCLP(order.total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UnifiedQR
              value={buildQrPayload(order)}
              title={`Pedido ${order.orderNumber}`}
              subtitle={order.paymentMethod?.toUpperCase?.()}
            />
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">
                <strong>Estado:</strong> {order.status ?? "confirmado"}
              </p>
              {/* ===== PAGO ===== */}
              <p className="text-sm text-gray-600">
                <strong>Pago:</strong>{" "}
                {order.paymentMethod !== "cash" ? "Pagado" : order.paymentStatus === "paid" ? "Pagado" : "Pendiente"}{" "}
                {order.paymentMethod ? `(${order.paymentMethod.toUpperCase()})` : ""}
              </p>

              {/* ===== FECHA DE CREACIÓN ===== */}
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong> {when}
              </p>

              {/* ===== LISTO / PROGRAMADO ===== */}
              {order.estimatedReadyTime && (() => {
                const created = new Date(order.createdAt as any)
                const ready = new Date(order.estimatedReadyTime as any)
                const isScheduled =
                  ready.toDateString() !== created.toDateString()

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
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Notas:</strong> {order.specialInstructions}
                </p>
              ) : null}
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Si tienes dudas, acércate al mostrador con tu número de pedido.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

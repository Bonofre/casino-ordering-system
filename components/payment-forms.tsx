"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  CreditCard,
  Banknote,
  Smartphone,
  Shield,
  AlertCircle,
  CheckCircle,
  Copy,
  Landmark,
  Wallet,
  QrCode,
} from "lucide-react"
import QRCode from "react-qr-code"

/* ======================== Tipos ======================== */
interface PaymentFormsProps {
  paymentMethod: "cash" | "card" | "transfer" | "junaeb"
  total: number
  onPaymentSuccess: (paymentData: any) => void
  onPaymentError: (error: string) => void
}

/* ======================== Utils ======================== */
const formatCLP = (price: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(price)

/** Componente de QR unificado: mismo look para todos los QR de la app */
export function UnifiedQR({
  value,
  title,
  subtitle,
}: {
  value: string
  title: string
  subtitle?: string
}) {
  return (
    <Card className="w-full max-w-sm mx-auto shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="rounded-xl border bg-white p-4">
          <QRCode
            value={value}
            size={180}
            bgColor="#ffffff"
            fgColor="#111827" // gray-900
            style={{ height: "auto", maxWidth: "100%", width: "180px" }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/* ======================== Componente principal ======================== */
export function PaymentForms({ paymentMethod, total, onPaymentSuccess, onPaymentError }: PaymentFormsProps) {
  if (paymentMethod === "cash") {
    return <CashPaymentForm total={total} onPaymentSuccess={onPaymentSuccess} />
  }
  if (paymentMethod === "card") {
    return <CardPaymentForm total={total} onPaymentSuccess={onPaymentSuccess} onPaymentError={onPaymentError} />
  }
  if (paymentMethod === "transfer") {
    return <ChileTransferPaymentForm total={total} onPaymentSuccess={onPaymentSuccess} onPaymentError={onPaymentError} />
  }
  if (paymentMethod === "junaeb") {
    // Importante: aquí sólo disparamos el flujo "pending".
    // El QR definitivo lo mostramos en la pantalla de confirmación con el mismo estilo que el resto.
    return <JunaebPaymentForm total={total} onPaymentSuccess={onPaymentSuccess} onPaymentError={onPaymentError} />
  }
  return null
}

/* ======================== Efectivo ======================== */
function CashPaymentForm({ total, onPaymentSuccess }: { total: number; onPaymentSuccess: (data: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Banknote className="h-5 w-5 mr-2 text-green-600" />
          Pago en Efectivo
        </CardTitle>
        <CardDescription>Pagarás en el mostrador al retirar tu pedido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-900">Instrucciones</h3>
          </div>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Tu pedido se confirma de inmediato.</li>
            <li>
              • Prepara el monto exacto: <strong>{formatCLP(total)}</strong>
            </li>
            <li>• Presenta tu número de pedido en caja.</li>
          </ul>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 mb-2">Total: {formatCLP(total)}</p>
          <p className="text-sm text-gray-500">Pago al momento de retirar</p>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => onPaymentSuccess({ method: "cash", status: "pending" })}
        >
          Confirmar Pedido (Efectivo)
        </Button>
      </CardContent>
    </Card>
  )
}

/* ======================== Tarjeta (simulado) ======================== */
function CardPaymentForm({
  total,
  onPaymentSuccess,
  onPaymentError,
}: {
  total: number
  onPaymentSuccess: (data: any) => void
  onPaymentError: (error: string) => void
}) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardType, setCardType] = useState<"visa" | "mastercard" | "debito" | "">("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const match = (v.match(/\d{4,16}/g) && v.match(/\d{4,16}/g)![0]) || ""
    const parts: string[] = []
    for (let i = 0; i < match.length; i += 4) parts.push(match.substring(i, i + 4))
    return parts.length ? parts.join(" ") : value
  }

  const handlePay = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardName || !cardType) {
      onPaymentError("Completa todos los campos de la tarjeta.")
      return
    }
    setIsProcessing(true)
    try {
      // Simulamos autorización
      await new Promise((r) => setTimeout(r, 900))
      toast({
        title: "Pago autorizado",
        description: `Se cobró ${formatCLP(total)} a tu tarjeta.`,
      })
      onPaymentSuccess({
        method: "card",
        status: "paid",
        cardType,
        last4: cardNumber.replace(/\s/g, "").slice(-4),
      })
    } catch (e) {
      onPaymentError("No se pudo procesar el pago.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
          Tarjeta (simulado)
        </CardTitle>
        <CardDescription>Ingresa los datos de tu tarjeta. No se realizará un cobro real.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Número de tarjeta</Label>
            <Input
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre en la tarjeta</Label>
            <Input placeholder="Juan Pérez" value={cardName} onChange={(e) => setCardName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vencimiento</Label>
            <Input placeholder="MM/AA" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CVV</Label>
            <Input inputMode="numeric" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tipo</Label>
            <Select value={cardType} onValueChange={(v: any) => setCardType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo de tarjeta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Transacción segura (demo)
          </div>
          <div className="font-bold text-orange-600">Total: {formatCLP(total)}</div>
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isProcessing} onClick={handlePay}>
          {isProcessing ? "Procesando…" : "Pagar con Tarjeta"}
        </Button>

        <div className="flex items-center text-xs text-gray-500">
          <AlertCircle className="h-3.5 w-3.5 mr-2" />
          Esta pasarela es de demostración; no guarda ni transmite datos reales.
        </div>
      </CardContent>
    </Card>
  )
}

/* ======================== Transferencia (Chile) ======================== */
function ChileTransferPaymentForm({
  total,
  onPaymentSuccess,
  onPaymentError,
}: {
  total: number
  onPaymentSuccess: (data: any) => void
  onPaymentError: (error: string) => void
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState<string | null>(null)
  const [openQR, setOpenQR] = useState(false)

  // Datos de ejemplo — cambia por los reales del casino
  const bankData = {
    banco: "BancoEstado",
    tipoCuenta: "Cuenta Vista",
    numero: "12345678",
    rut: "12.345.678-9",
    titular: "Casino Universidad Arica",
    correo: "pagos@tomasinoeats.cl",
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      toast({ title: "Copiado", description: `${label} copiado al portapapeles.` })
      setTimeout(() => setCopied(null), 1200)
    } catch {
      onPaymentError("No se pudo copiar al portapapeles.")
    }
  }

  // Opcional: QR informativo con payload genérico (no de banco)
  const qrPayload = JSON.stringify({
    v: 1,
    type: "bank_transfer",
    bank: bankData.banco,
    account: bankData.numero,
    amount: total,
    email: bankData.correo,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="h-5 w-5 mr-2 text-purple-600" />
          Transferencia Bancaria (Chile)
        </CardTitle>
        <CardDescription>Realiza una transferencia y confirma en caja al retirar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Banco" value={bankData.banco} onCopy={() => copy(bankData.banco, "Banco")} />
          <InfoRow label="Tipo de cuenta" value={bankData.tipoCuenta} onCopy={() => copy(bankData.tipoCuenta, "Tipo de cuenta")} />
          <InfoRow label="Número de cuenta" value={bankData.numero} onCopy={() => copy(bankData.numero, "Número de cuenta")} />
          <InfoRow label="RUT" value={bankData.rut} onCopy={() => copy(bankData.rut, "RUT")} />
          <InfoRow label="Titular" value={bankData.titular} onCopy={() => copy(bankData.titular, "Titular")} />
          <InfoRow label="Correo" value={bankData.correo} onCopy={() => copy(bankData.correo, "Correo")} />
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
          <p className="mb-1">
            <strong>Asunto/saldo:</strong> agrega tu nombre y número de pedido (se asignará en la confirmación).
          </p>
          <p>
            <strong>Monto:</strong> {formatCLP(total)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Envía comprobante si es posible a <span className="font-medium">{bankData.correo}</span>
          </div>
          <Button variant="outline" onClick={() => setOpenQR(true)} className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Ver QR informativo
          </Button>
        </div>

        <Dialog open={openQR} onOpenChange={setOpenQR}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR informativo</DialogTitle>
              <DialogDescription>Usa estos datos para tu transferencia. El pedido quedará como pendiente hasta validar.</DialogDescription>
            </DialogHeader>
            <UnifiedQR value={qrPayload} title="Transferencia" subtitle={formatCLP(total)} />
          </DialogContent>
        </Dialog>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="font-bold text-orange-600">Total: {formatCLP(total)}</div>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() =>
              onPaymentSuccess({
                method: "transfer",
                status: "pending",
                bank: bankData.banco,
                account: bankData.numero,
                email: bankData.correo,
              })
            }
          >
            Confirmar Pedido (Transferencia)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="mr-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCopy} aria-label={`Copiar ${label}`}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  )
}

/* ======================== JUNAEB ======================== */
function JunaebPaymentForm({
  total,
  onPaymentSuccess,
  onPaymentError,
}: {
  total: number
  onPaymentSuccess: (data: any) => void
  onPaymentError: (error: string) => void
}) {
  const { toast } = useToast()
  const [showHelp, setShowHelp] = useState(false)

  const handleContinue = () => {
    // No generamos QR aquí. La orden se crea como "pending" y
    // en la pantalla de confirmación mostramos el QR unificado del pedido.
    toast({
      title: "JUNAEB seleccionado",
      description: "Se generará un QR de validación en la confirmación del pedido.",
    })
    onPaymentSuccess({ method: "junaeb", status: "pending" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-emerald-600" />
          Pago con JUNAEB
        </CardTitle>
        <CardDescription>Valida tu beneficio JUNAEB en el mostrador con el QR del pedido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <QrCode className="h-5 w-5 text-emerald-600 mr-2" />
            <h3 className="font-medium text-emerald-900">¿Cómo funciona?</h3>
          </div>
          <ol className="text-sm text-emerald-800 space-y-1 list-decimal list-inside">
            <li>Confirma tu pedido con método JUNAEB.</li>
            <li>En la pantalla de confirmación verás un <strong>QR del pedido</strong>.</li>
            <li>Muéstralo en caja para validar el beneficio y completar el pago.</li>
          </ol>
        </div>

        <div className="flex items-center justify-between">
          <div className="font-bold text-orange-600">Total: {formatCLP(total)}</div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleContinue}>
            Confirmar Pedido (JUNAEB)
          </Button>
        </div>

        <button
          type="button"
          className="text-xs text-gray-500 underline"
          onClick={() => setShowHelp((v) => !v)}
        >
          {showHelp ? "Ocultar ayuda" : "¿Problemas para validar?"}
        </button>

        {showHelp && (
          <div className="text-xs text-gray-600">
            Si tienes problemas al validar, menciona tu número de pedido en caja y solicita asistencia.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

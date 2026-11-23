"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Trash2 } from "lucide-react"
import type { CartItem } from "@/lib/types"

interface CartSummaryProps {
  cartItems: CartItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
}

export function CartSummary({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout }: CartSummaryProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(price)

  // Nota: dejamos IVA 10% para mantener consistencia con el checkout actual
  const subtotal = cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tu carrito está vacío</h3>
          <p className="text-gray-500 text-center">Agrega algunos items del menú para comenzar tu pedido.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2" />
          Mi Pedido ({cartItems.length} {cartItems.length === 1 ? "item" : "items"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items del Carrito */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {cartItems.map((item) => (
            <div key={item.menuItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.menuItem.name}</h4>
                <p className="text-xs text-gray-500">
                  {formatPrice(item.menuItem.price)} x {item.quantity}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => onUpdateQuantity(item.menuItem.id, Math.max(0, item.quantity - 1))}
                  >
                    −
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {item.quantity}
                  </Badge>
                  <Button
                    size="sm"
                    className="h-7 px-2 bg-orange-500 hover:bg-orange-600"
                    onClick={() => onUpdateQuantity(item.menuItem.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => onRemoveItem(item.menuItem.id)}
                  aria-label={`Eliminar ${item.menuItem.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Resumen de Precios */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>IVA (10%):</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span className="text-orange-600">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Botón de Checkout */}
        <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={onCheckout}>
          Proceder al Pago
        </Button>

        <p className="text-xs text-gray-500 text-center">Tiempo estimado de preparación: 15-20 minutos</p>
      </CardContent>
    </Card>
  )
}

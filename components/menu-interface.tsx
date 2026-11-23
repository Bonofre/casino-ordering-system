"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus, Clock, ChefHat, Utensils, Cookie, Coffee, CupSoda, Package } from "lucide-react"
import type { MenuItem, CartItem } from "@/lib/types"
import { getTodayMenu } from "@/lib/data"
import Image from "next/image"

interface MenuInterfaceProps {
  onAddToCart: (item: CartItem) => void
  cartItems: CartItem[]
}

export function MenuInterface({ onAddToCart, cartItems }: MenuInterfaceProps) {
  const [menu] = useState(getTodayMenu())
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { toast } = useToast()

  const categories = [
    { id: "all", name: "Todo", icon: ChefHat },
    { id: "entrada", name: "Entradas", icon: Utensils },
    { id: "principal", name: "Platos Principales", icon: ChefHat },
    { id: "postre", name: "Postres", icon: Cookie },
    { id: "bebida", name: "Bebidas", icon: CupSoda },
    { id: "snack", name: "Snacks", icon: Cookie },
    { id: "sandwich", name: "Sándwiches", icon: Utensils },
    { id: "desayuno", name: "Desayunos", icon: Coffee },
    { id: "combo", name: "Combos", icon: Package },
  ]

  const filteredItems =
    selectedCategory === "all" ? menu.items : menu.items.filter((item) => item.category === selectedCategory)

  const getItemQuantityInCart = (itemId: string) => {
    const cartItem = cartItems.find((item) => item.menuItem.id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  const handleAddToCart = (menuItem: MenuItem) => {
    const existingCartItem = cartItems.find((item) => item.menuItem.id === menuItem.id)
    const newQuantity = existingCartItem ? existingCartItem.quantity + 1 : 1

    onAddToCart({
      menuItem,
      quantity: newQuantity,
    })

    toast({
      title: "Agregado al carrito",
      description: `${menuItem.name} ha sido agregado a tu pedido.`,
    })
  }

  const handleDecrease = (menuItem: MenuItem) => {
    const existing = cartItems.find((i) => i.menuItem.id === menuItem.id)
    if (!existing) return
    const newQ = Math.max(0, existing.quantity - 1)
    onAddToCart({ menuItem, quantity: newQ })
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(price)

  const getTodayDate = () =>
    new Date().toLocaleDateString("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  return (
    <div className="space-y-6">
      {/* Header del Menú */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Menú del Día</h2>
        <p className="text-lg text-gray-600 capitalize">{getTodayDate()}</p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
          <Clock className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Algunos almuerzos solo disponible hasta las 3:00 PM</span>
        </div>
      </div>

      {/* Filtros de Categoría */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((category) => {
          const Icon = category.icon
          const active = selectedCategory === category.id
          return (
            <Button
              key={category.id}
              variant={active ? "default" : "outline"}
              className={active ? "bg-orange-500 hover:bg-orange-600" : "hover:bg-orange-50"}
              onClick={() => setSelectedCategory(category.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {category.name}
            </Button>
          )
        })}
      </div>

      {/* Grid de Items del Menú */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const quantityInCart = getItemQuantityInCart(item.id)
          return (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {item.category}
                  </Badge>
                </div>
                {item.description ? (
                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {item.image ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-lg border bg-gray-50 flex items-center justify-center text-gray-400">
                    <Utensils className="h-8 w-8" />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">{formatPrice(item.price)}</span>

                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleDecrease(item)} disabled={quantityInCart === 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary">{quantityInCart}</Badge>
                    <Button size="icon" className="bg-orange-500 hover:bg-orange-600" onClick={() => handleAddToCart(item)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-10">No hay items en esta categoría por ahora.</div>
      )}
    </div>
  )
}

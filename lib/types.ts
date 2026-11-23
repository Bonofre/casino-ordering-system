// app/lib/types.ts
export type Role = "user" | "admin"


export interface User {
id: string
name: string
email: string
studentId?: string | null
role: Role
}


export interface MenuItem {
id: string
name: string
description?: string
price: number
category: string
image?: string
}


export interface CartItem {
menuItem: MenuItem
quantity: number
specialInstructions?: string
}


export interface OrderItemInput { menuItemId: string; quantity: number; specialInstructions?: string }


export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"
export type PaymentStatus = "paid" | "pending"
export type PaymentMethod = "cash" | "card" | "transfer" | "junaeb"


export interface Order {
id: string
userId: string
orderNumber: string
total: number
status: OrderStatus
paymentStatus: PaymentStatus
paymentMethod: PaymentMethod
qrCode?: string | null
specialInstructions?: string | null
createdAt?: string | Date
estimatedReadyTime?: string | Date | null
items?: Array<{
id: string
menuItemId: string
quantity: number
specialInstructions?: string | null
menuItem?: MenuItem
}>

}
export interface OrderRating {
  id: string
  orderId: string
  userId: string
  score: number
  comment?: string
  createdAt: Date

}
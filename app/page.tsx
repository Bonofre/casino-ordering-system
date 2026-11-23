"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Utensils, Users, ShoppingCart } from "lucide-react"
import { MenuInterface } from "@/components/menu-interface"
import { CartSummary } from "@/components/cart-summary"
import { CheckoutProcess } from "@/components/checkout-process"
import { OrderHistory } from "@/components/order-history"
import { useRouter } from "next/navigation"
import type { User, CartItem, Order } from "@/lib/types"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Verificar si hay usuario autenticado al cargar
  useEffect(() => {
    checkAuthStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        if (userData.role === "admin") {
          router.replace("/admin")
          return
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    // Validación básica antes de ir al servidor
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Debes ingresar tu correo y contraseña.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()

        setUser(data.user)

        toast({
          title: "Bienvenido",
          description: `Hola ${data.user.name}, has iniciado sesión correctamente.`,
        })

        // Si el usuario es admin, lo rediriges al panel
        if (data.user.role === "admin") {
          router.replace("/admin")
        }
      } else {
        const error = await response.json().catch(() => ({}))

        toast({
          title: "Login incorrecto",
          description:
            error.message || "Correo o contraseña incorrectos. Inténtalo nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor. Inténtalo más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (
    email: string,
    password: string,
    name: string,
    studentId: string,
  ) => {
    // Validación básica por si algo se cuela desde el frontend
    if (!name.trim() || !studentId.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Debes completar todos los campos para registrarte.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, studentId }),
      })

      if (response.ok) {
        const data = await response.json()

        setUser(data.user)

        toast({
          title: "Cuenta creada",
          description: `Bienvenido ${data.user.name}, tu cuenta ha sido creada correctamente.`,
        })

        // Si quieres, aquí podrías enviar directo al menú
        // setCurrentView("menu")
      } else {
        const error = await response.json().catch(() => ({}))

        toast({
          title: "No se pudo crear la cuenta",
          description:
            error.message ||
            "Ocurrió un problema al crear tu usuario. Revisa los datos o intenta más tarde.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Register error:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor. Inténtalo más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      try {
        if (user?.id) localStorage.removeItem(`cart-${user.id}`)
      } catch { }
      setUser(null)
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />
  }

  return <MainApp user={user} onLogout={handleLogout} />
}

function AuthPage({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => void
  onRegister: (email: string, password: string, name: string, studentId: string) => void
}) {
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [registerStudentId, setRegisterStudentId] = useState("")
  const { toast } = useToast()

  // Handler con validaciones
  const handleRegisterClick = () => {
    const nameTrimmed = registerName.trim()
    const studentIdTrimmed = registerStudentId.trim()

    // Solo letras (incluye acentos y espacios)
    const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/

    if (!nameTrimmed || !nameRegex.test(nameTrimmed)) {
      toast({
        title: "Nombre inválido",
        description: "El nombre solo puede contener letras y espacios.",
        variant: "destructive",
      })
      return
    }

    // Solo números
    if (!studentIdTrimmed || !/^\d+$/.test(studentIdTrimmed)) {
      toast({
        title: "Matrícula inválida",
        description: "El número de estudiante solo puede contener dígitos.",
        variant: "destructive",
      })
      return
    }

    if (!registerEmail.trim() || !registerPassword.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Correo y contraseña son obligatorios.",
        variant: "destructive",
      })
      return
    }

    onRegister(registerEmail, registerPassword, nameTrimmed, studentIdTrimmed)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-500 p-3 rounded-full">
              <Utensils className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Casino Universidad Arica</h1>
          <p className="text-gray-600">Pedidos Online</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso al Sistema</CardTitle>
            <CardDescription>Inicia sesión o regístrate para comenzar a pedir</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    onLogin(loginEmail, loginPassword)
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo institucional</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="estudiante@correo.institucional.cl"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Contraseña"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    Iniciar Sesión
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTRO */}
              <TabsContent value="register" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre Completo</Label>
                  <Input
                    id="register-name"
                    placeholder="Juan Pérez"
                    value={registerName}
                    onChange={(e) => {
                      const value = e.target.value
                      // Solo letras (con acentos) y espacios
                      const soloLetras = value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "")
                      setRegisterName(soloLetras)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-student-id">Número de Estudiante</Label>
                  <Input
                    id="register-student-id"
                    placeholder="2024001234"
                    inputMode="numeric"
                    value={registerStudentId}
                    onChange={(e) => {
                      // Solo dígitos
                      const soloNumeros = e.target.value.replace(/\D/g, "")
                      setRegisterStudentId(soloNumeros)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Correo institucional</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="estudiante@correo.institucional.cl"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Contraseña"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleRegisterClick}
                >
                  Crear Cuenta
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MainApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [currentView, setCurrentView] = useState<"menu" | "checkout" | "orders">("menu")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(`cart-${user.id}`)
      if (savedCart) setCartItems(JSON.parse(savedCart))
    } catch { }
  }, [user.id])

  useEffect(() => {
    try {
      localStorage.setItem(`cart-${user.id}`, JSON.stringify(cartItems))
    } catch { }
  }, [cartItems, user.id])

  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => item.menuItem.id === newItem.menuItem.id)
      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems]
        updatedItems[existingItemIndex] = newItem
        return updatedItems
      } else {
        return [...prevItems, newItem]
      }
    })
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId)
      return
    }
    setCartItems((prevItems) => prevItems.map((item) => (item.menuItem.id === itemId ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.menuItem.id !== itemId))
    toast({
      title: "Item eliminado",
      description: "El item ha sido removido de tu carrito.",
    })
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega algunos items antes de proceder al pago.",
        variant: "destructive",
      })
      return
    }
    setCurrentView("checkout")
  }

  const handleOrderComplete = (order: Order) => {
    setCartItems([])
    try {
      localStorage.removeItem(`cart-${user.id}`)
    } catch { }
    toast({
      title: "¡Pedido completado!",
      description: `Tu pedido ${order.orderNumber} ha sido confirmado.`,
    })
    setCurrentView("orders")
  }

  const getTotalItems = () => cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-orange-500 p-2 rounded-lg mr-3">
                <Utensils className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Casino Universidad Arica</h1>
                <p className="text-sm text-gray-500">Pedidos en línea</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user.role === "admin" && (
                <Button variant="secondary" onClick={() => router.push("/admin")}>
                  Panel Admin
                </Button>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.studentId ?? "ID no registrado"}</p>
              </div>
              <Button variant="outline" onClick={onLogout}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {currentView !== "checkout" && (
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${currentView === "menu"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                onClick={() => setCurrentView("menu")}
              >
                Menú del Día
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${currentView === "orders"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                onClick={() => setCurrentView("orders")}
              >
                <Users className="h-4 w-4 mr-1" />
                Mis Pedidos
              </button>
              {cartItems.length > 0 && (
                <button
                  className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center"
                  onClick={handleCheckout}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Carrito ({getTotalItems()})
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <MenuInterface onAddToCart={handleAddToCart} cartItems={cartItems} />
            </div>
            <div className="lg:col-span-1">
              <CartSummary
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        )}

        {currentView === "checkout" && (
          <CheckoutProcess
            cartItems={cartItems}
            user={user}
            onOrderComplete={handleOrderComplete}
            onBack={() => setCurrentView("menu")}
          />
        )}

        {currentView === "orders" && <OrderHistory user={user} />}
      </main>
    </div>
  )
}
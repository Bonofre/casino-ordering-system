"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, MessageSquare } from "lucide-react"

function todayLocalISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}` // YYYY-MM-DD local
}

export default function AdminAnalytics() {
  const [dailySales, setDailySales] = useState(0)
  const [weeklySales, setWeeklySales] = useState(0)
  const [ratingAvg, setRatingAvg] = useState(0)
  const [ratings, setRatings] = useState<any[]>([])
  const [salesByHour, setSalesByHour] = useState<number[]>([])
  const [rangeData, setRangeData] = useState<any>(null)

  const todayISO = todayLocalISO()

  const [fromDate, setFromDate] = useState<string>(todayISO)
  const [toDate, setToDate] = useState<string>(todayISO)

  // usamos para mostrar en el texto
  const effectiveFrom = fromDate || todayISO
  const effectiveTo = toDate || fromDate || todayISO

  useEffect(() => {
    // al cargar, mostramos el día de hoy en el rango
    loadAll(todayISO, todayISO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll(from: string, to: string) {
    await Promise.all([loadData(from, to), loadRange(from, to)])
  }

  async function loadData(from: string, to: string) {
    const params = new URLSearchParams({ from, to }).toString()

    const rSales = await fetch(`/api/analytics/sales?${params}`)
    const rRatings = await fetch(`/api/analytics/ratings?${params}`)

    const sales = await rSales.json()
    const reviews = await rRatings.json()

    // dailyTotal = ventas de HOY (lo calcula el backend con fecha actual)
    setDailySales(sales.dailyTotal)
    setWeeklySales(sales.weekTotal)
    setSalesByHour(sales.byHour ?? [])

    setRatingAvg(reviews.avg)
    setRatings(reviews.latest)
  }

  async function loadRange(from: string, to: string) {
    const res = await fetch("/api/analytics/sales-range", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: `${from} 00:00:00`,
        endDate: `${to} 23:59:59`,
      }),
    })

    const data = await res.json()
    setRangeData(data)
  }

  // ventas por hora: solo horas con ventas, barras proporcionales
  const hoursWithSales = salesByHour
    .map((v, i) => ({ hour: i, value: v }))
    .filter((h) => h.value > 0)

  const maxHourValue = hoursWithSales.length
    ? Math.max(...hoursWithSales.map((h) => h.value))
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold">Panel de Analíticas</h2>
      </div>

      {/* === Tarjetas principales === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <TrendingUp className="h-5 w-5" /> Ventas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              ${dailySales.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <TrendingUp className="h-5 w-5" /> Ventas Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              ${weeklySales.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Star className="h-5 w-5" /> Calificación Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {ratingAvg.toFixed(1)} ★
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === Selector de rango === */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <button
          onClick={() => {
            const from = fromDate || todayISO
            const to = toDate || from
            loadAll(from, to)
          }}
          className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm"
        >
          Buscar
        </button>

        <button
          onClick={() => {
            setFromDate(todayISO)
            setToDate(todayISO)
            loadAll(todayISO, todayISO)
          }}
          className="px-3 py-2 border rounded text-sm"
        >
          Hoy
        </button>
      </div>

      {/* Selección de rango / Resumen del rango */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Ventas por rango de fecha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Mostrando ventas desde <strong>{effectiveFrom}</strong> hasta{" "}
            <strong>{effectiveTo}</strong>.
          </p>

          {!rangeData && (
            <p className="text-sm text-gray-500">No hay datos en este rango.</p>
          )}

          {rangeData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold text-orange-600">
                  ${rangeData.total.toLocaleString("es-CL")}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>N° Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {rangeData.orders}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket Promedio</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold text-gray-700">
                  ${Math.round(rangeData.avg).toLocaleString("es-CL")}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Ventas por hora === */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Hora</CardTitle>
        </CardHeader>
        <CardContent>
          {(!hoursWithSales || hoursWithSales.length === 0) && (
            <p className="text-sm text-gray-500 mt-2">
              Sin ventas en este rango de fechas.
            </p>
          )}

          {hoursWithSales && hoursWithSales.length > 0 && (
            <div className="flex items-end gap-4 mt-4 h-48">
              {hoursWithSales.map((h) => (
                <div
                  key={h.hour}
                  className="flex flex-col items-center flex-1 min-w-[40px]"
                >
                  {/* monto arriba */}
                  <span className="text-xs font-medium text-gray-700 mb-1">
                    ${h.value.toLocaleString("es-CL")}
                  </span>

                  {/* pista + barra rellena */}
                  <div className="w-10 h-32 bg-orange-100 rounded-full overflow-hidden flex items-end shadow-sm">
                    <div
                      className="w-full bg-orange-500"
                      style={{
                        height: `${Math.max(8, (h.value / maxHourValue) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* hora abajo */}
                  <span className="text-xs mt-1">{h.hour}:00</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Opiniones recientes === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" /> Opiniones recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ratings.length === 0 && (
            <p className="text-sm text-gray-500">Sin opiniones aún</p>
          )}
          {ratings.map((r, idx) => (
            <div
              key={idx}
              className="border p-4 rounded-lg space-y-2 bg-white shadow-sm"
            >
              {/* Rating + Fecha */}
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  {r.score} ★
                </Badge>
                <span className="text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleString("es-CL")}
                </span>
              </div>

              {/* Comentario */}
              <p className="text-sm text-gray-700">
                {r.comment || "Sin comentario"}
              </p>

              {/* Datos del pedido y usuario */}
              <div className="text-xs text-gray-600 border-t pt-2">
                <p>
                  <strong>Orden:</strong> {r.orderNumber ?? "N/A"}
                </p>
                <p>
                  <strong>Usuario:</strong> {r.username || "Desconocido"}
                </p>
                <p>
                  <strong>Correo:</strong> {r.useremail || "No disponible"}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
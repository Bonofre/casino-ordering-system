# Casino Online · Sistema de pedidos

Sistema web para que los estudiantes **pidan su almuerzo en el casino** desde el celular, paguen (incluido el beneficio **JUNAEB**) y retiren con código QR, mientras el casino administra menú, stock y ventas.

## Objetivo
Reducir las filas en el casino y darle a la administración datos reales de qué se vende y cómo lo evalúan los estudiantes.

## Qué hace
**Estudiantes**
- Registro e inicio de sesión.
- Ver el menú del día, armar el carrito y pagar.
- Pago con beneficio JUNAEB.
- Código QR para retirar el pedido.
- Historial de pedidos y **calificación** de lo que comieron.

**Administración**
- Gestión del menú y del **stock diario**.
- Gestión de usuarios.
- Analítica: ventas por día o por rango y calificaciones.

## Tecnologías
- **Next.js** (App Router) + **React** + TypeScript
- Tailwind CSS + componentes shadcn/ui (Radix)
- **PostgreSQL** con `pg`
- Contraseñas con `bcryptjs`

## Levantarlo
```bash
cp .env.example .env        # DATABASE_URL=postgresql://usuario:clave@localhost:5432/casino_online
npm install
npm run seed:menu           # opcional: carga un menú de ejemplo
npm run dev
```
Abrir `http://localhost:3000`.

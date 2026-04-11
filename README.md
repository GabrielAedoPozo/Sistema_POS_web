# Sistema de Ventas Web

Sistema completo de ventas con gestión de inventario, control de stock automático y reportes de ventas. Incluye autenticación básica y configuración segura mediante variables de entorno.

---

## Características

- Registro de ventas
- Control de inventario en tiempo real
- Descuento automático de stock por venta
- Reporte de ventas
- Configuración segura con variables `.env`
- API rápida con Node.js + Express

---

## Tecnologías usadas

**Frontend**

- React
- Tailwind CSS

**Backend**

- Node.js
- Express
- JavaScript
- dotenv (variables de entorno)
- Base de datos (MongoDB / MySQL / etc.)

---

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/tuusuario/tu-repo.git
```

2. Entra al proyecto:

```bash
cd tu-repo
```

3. Instala dependencias:

```bash
npm install
```

4. Crea tu archivo `.env`:

```env
PORT=3000
DB_URL=tu_conexion_aqui
```

5. Inicia el servidor:

```bash
npm run dev
```

---

## Endpoints principales

### Ventas

| Método | Ruta     | Descripción                   |
|--------|----------|-------------------------------|
| `POST` | `/ventas` | Registrar una venta          |
| `GET`  | `/ventas` | Obtener historial de ventas  |

### Productos / Inventario

| Método | Ruta                    | Descripción        |
|--------|-------------------------|--------------------|
| `GET`  | `/productos`            | Ver inventario     |
| `PUT`  | `/productos/:id`        | Actualizar producto|
| `PUT`  | `/productos/:id/stock`  | Agregar stock      |

---

## Seguridad

Este proyecto utiliza variables de entorno (`.env`) para proteger información sensible como:

- Claves de base de datos
- Puerto del servidor
- Configuraciones privadas

> **Advertencia:** El archivo `.env` NO debe subirse a GitHub.

---

## Flujo del sistema

1. Se registra una venta
2. El sistema valida el stock
3. Se descuenta automáticamente el inventario
4. Se guarda el historial en ventas
5. Se genera reporte de ventas

---

## Futuras mejoras

- Generación de facturas PDF
- Sistema de usuarios con roles (admin / empleado)
- Interfaz frontend más avanzada
- Alertas de stock bajo
- Deploy en la nube

---

## Autor

Desarrollado por **Gabriel Aedo**

Proyecto personal de aprendizaje y desarrollo full stack.

---

## Licencia

Este proyecto es de uso educativo y personal.

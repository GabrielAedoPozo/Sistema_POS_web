# Sistema de Ventas Web (POS)
Sistema completo de punto de venta con gestión de inventario, control de stock automático, reportes de ventas e integración con **SUNAT** para emisión electrónica de comprobantes.

---

## Características
- Registro de ventas
- Control de inventario en tiempo real
- Descuento automático de stock por venta
- Reporte de ventas
- Integración con **API SUNAT** para comprobantes electrónicos
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
- MongoDB / MySQL

**Integraciones**
- SUNAT API REST — emisión electrónica de boletas y facturas

---

## Integración con SUNAT

Este sistema está conectado con la **API REST de SUNAT** para la emisión electrónica de comprobantes de pago, cumpliendo con la normativa tributaria peruana.

### Estado actual

| Funcionalidad                           | Estado           |
|-----------------------------------------|------------------|
| Conexión con API SUNAT                  | ✅ Conectado     |
| Emisión de boletas electrónicas         | ✅ Conectado     |
| Emisión de facturas electrónicas        | ✅ Conectado     |
| Validación de RUC en tiempo real        | ✅ Conectado  |
| Impresión de comprobantes (PDF/térmica) | 🔜 Próximamente  |


### Próximamente — Comprobantes electrónicos reales
- Mejora de UI/UX
- Impresión en formato **PDF** y **ticket térmico (80mm)**
- Envío automático del comprobante al correo del cliente
- Consulta del estado del comprobante en SUNAT
- Soporte para **notas de crédito** y **notas de débito**

---

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/GabrielAedoPozo/Sistema_POS_web.git
```

2. Entra al proyecto:
```bash
cd Sistema_POS_web
```

3. Instala dependencias:
```bash
npm install
```

4. Crea tu archivo `.env`:
```env
PORT=3000
DB_URL=tu_conexion_aqui
SUNAT_API_URL=https://api.sunat.gob.pe
SUNAT_TOKEN=tu_token_aqui
```

5. Inicia el servidor:
```bash
npm run dev
```

---

## Endpoints principales

### Ventas

| Método | Ruta      | Descripción                 |
|--------|-----------|-----------------------------|
| `POST` | `/ventas` | Registrar una venta         |
| `GET`  | `/ventas` | Obtener historial de ventas |

### Productos / Inventario

| Método | Ruta                   | Descripción         |
|--------|------------------------|---------------------|
| `GET`  | `/productos`           | Ver inventario      |
| `PUT`  | `/productos/:id`       | Actualizar producto |
| `PUT`  | `/productos/:id/stock` | Agregar stock       |

### SUNAT

| Método | Ruta                   | Descripción                     |
|--------|------------------------|---------------------------------|
| `POST` | `/sunat/boleta`        | Emitir boleta electrónica       |
| `POST` | `/sunat/factura`       | Emitir factura electrónica      |
| `GET`  | `/sunat/estado/:serie` | Consultar estado de comprobante |

---

## Flujo del sistema

1. Se registra una venta
2. El sistema valida el stock disponible
3. Se descuenta automáticamente el inventario
4. Se guarda el historial de ventas
5. *(Próximamente)* Se emite el comprobante electrónico vía SUNAT
6. *(Próximamente)* Se imprime o envía el comprobante al cliente

---

## Seguridad

Este proyecto utiliza variables de entorno (`.env`) para proteger información sensible como:
- Claves de base de datos
- Credenciales de la API SUNAT
- Puerto del servidor

> **Advertencia:** El archivo `.env` NO debe subirse a GitHub. Está incluido en `.gitignore`.

---

## Futuras mejoras

- [x] Integración con API SUNAT
- [ ] Emisión de boletas y facturas electrónicas reales
- [ ] Impresión de tickets en impresora térmica
- [ ] Generación de comprobantes en PDF
- [ ] Sistema de usuarios con roles (admin / empleado)
- [ ] Alertas de stock bajo
- [ ] Envío de comprobantes por correo
- [ ] Deploy en la nube

---

## Autor

Desarrollado por **Gabriel Aedo**  
Proyecto personal de aprendizaje y desarrollo full stack.

---
## Nota del autor

He desarrollado este mini sistema con el fin de mejorarlo cada dia, ayudar a empresas que realmente lo necesitan y no paguen
una fortuna, tambien que lo usen como un método más rapido de entrar un sistema, la mayoria de sistemas así, los veo seriamente
desagradables visualmente, por ahora estoy intentando que no sea así y cada vez me hago preguntas como: ¿Que más le falta
para que sea decente? Es mi meta algun día terminar estas preguntas, y por fin hacer un sistema digno.

---

## Licencia

Este proyecto es de uso educativo y personal.

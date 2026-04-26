import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import pool, { initDB } from "./db.js";
import { emitirBoleta, emitirFactura } from "./apisunat.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 3000;
const TOTAL_PRODUCTOS_SEED = 166;
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
	cors: {
		origin: "*",
	},
});

const ejecutarSeed = async () => {
	try {
		const seedPath = path.join(__dirname, "seed.sql");

		if (!fs.existsSync(seedPath)) {
			console.warn(`No se encontró seed.sql en ${seedPath}. Se omite siembra inicial.`);
			return;
		}

		const sql = fs.readFileSync(seedPath, "utf8");

		if (!sql.trim()) {
			console.warn("seed.sql está vacío. No se ejecutará el seed.");
			return;
		}

		console.log("Verificando si la tabla productos ya tiene el seed completo...");
		const [rows] = await pool.query(
			"SELECT COUNT(*) as total, MIN(id) as minId, MAX(id) as maxId FROM productos"
		);
		const totalProductos = Number(rows?.[0]?.total || 0);
		const minId = Number(rows?.[0]?.minId || 0);
		const maxId = Number(rows?.[0]?.maxId || 0);
		const idsCorrectos = minId === 1 && maxId === TOTAL_PRODUCTOS_SEED;

		if (totalProductos === TOTAL_PRODUCTOS_SEED && idsCorrectos) {
			console.log(
				`Seed omitido: ya existen los ${TOTAL_PRODUCTOS_SEED} productos esperados con IDs del 1 al ${TOTAL_PRODUCTOS_SEED}.`
			);
			return;
		}

		console.log(
			`Se detectaron ${totalProductos} productos (IDs ${minId}-${maxId}). Ejecutando seed.sql para dejar exactamente ${TOTAL_PRODUCTOS_SEED} con IDs del 1 al ${TOTAL_PRODUCTOS_SEED}.`
		);
		await pool.query(sql);

		const [seedRows] = await pool.query(
			"SELECT COUNT(*) as total, MIN(id) as minId, MAX(id) as maxId FROM productos"
		);
		const totalSembrados = Number(seedRows?.[0]?.total || 0);
		const minIdSeed = Number(seedRows?.[0]?.minId || 0);
		const maxIdSeed = Number(seedRows?.[0]?.maxId || 0);

		if (
			totalSembrados !== TOTAL_PRODUCTOS_SEED ||
			minIdSeed !== 1 ||
			maxIdSeed !== TOTAL_PRODUCTOS_SEED
		) {
			console.warn(
				`Seed ejecutado, pero se esperaban ${TOTAL_PRODUCTOS_SEED} productos con IDs del 1 al ${TOTAL_PRODUCTOS_SEED} y se obtuvo total=${totalSembrados}, minId=${minIdSeed}, maxId=${maxIdSeed}.`
			);
			return;
		}

		console.log(
			`Seed ejecutado correctamente con ${totalSembrados} productos e IDs del 1 al ${TOTAL_PRODUCTOS_SEED}.`
		);
	} catch (error) {
		console.error("Error ejecutando seed.sql:", error.message);
		throw error;
	}
};

const crearTablaComprobantes = async () => {
	// Tabla comprobantes
    await pool.query(
        `CREATE TABLE IF NOT EXISTS comprobantes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venta_id INT NOT NULL,
            tipo_documento VARCHAR(20) NOT NULL,
            serie VARCHAR(10) NOT NULL,
            numero VARCHAR(20) NOT NULL,
            cliente_tipo_documento CHAR(1) NOT NULL,
            cliente_numero_documento VARCHAR(20) NOT NULL,
            cliente_denominacion VARCHAR(255) NOT NULL,
            xml LONGTEXT NULL,
            pdf LONGTEXT NULL,
            cdr LONGTEXT NULL,
            hash VARCHAR(255) NULL,
            respuesta_json JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_comprobante_venta (venta_id),
            CONSTRAINT fk_comprobante_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
        )`
    );
};

const crearTablasComandas = async () => {
	await pool.query(
		`CREATE TABLE IF NOT EXISTS comandas (
			id INT AUTO_INCREMENT PRIMARY KEY,
			venta_id INT NOT NULL,
			fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			estado ENUM('pendiente', 'listo') NOT NULL DEFAULT 'pendiente',
			detalle_comanda TEXT NULL,
			fecha_completado DATETIME NULL,
			UNIQUE KEY uq_comanda_venta (venta_id),
			INDEX idx_comanda_estado_fecha (estado, fecha_hora),
			CONSTRAINT fk_comanda_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
		)`
	);

	await pool.query(
		`CREATE TABLE IF NOT EXISTS comanda_items (
			id INT AUTO_INCREMENT PRIMARY KEY,
			comanda_id INT NOT NULL,
			producto_id INT NOT NULL,
			cantidad INT NOT NULL,
			nota_item VARCHAR(255) NULL,
			INDEX idx_comanda_items_comanda (comanda_id),
			CONSTRAINT fk_comanda_items_comanda FOREIGN KEY (comanda_id) REFERENCES comandas(id),
			CONSTRAINT fk_comanda_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
		)`
	);
};

const mapearComandasDesdeRows = (rows = []) => {
	const comandasMap = new Map();

	for (const row of rows) {
		if (!comandasMap.has(row.comanda_id)) {
			comandasMap.set(row.comanda_id, {
				id: Number(row.comanda_id),
				venta_id: Number(row.venta_id),
				fecha_hora: row.fecha_hora,
				estado: row.estado,
				detalle_comanda: row.detalle_comanda || "",
				fecha_completado: row.fecha_completado,
				metodo_pago: row.metodo_pago,
				total: Number(row.total || 0),
				items: [],
			});
		}

		if (row.comanda_item_id) {
			comandasMap.get(row.comanda_id).items.push({
				id: Number(row.comanda_item_id),
				producto_id: Number(row.producto_id),
				producto_nombre: row.producto_nombre,
				cantidad: Number(row.cantidad),
				nota_item: row.nota_item || "",
			});
		}
	}

	return Array.from(comandasMap.values());
};

const obtenerComandas = async (estado = "pendiente") => {
	const estadoNormalizado = ["pendiente", "listo", "todos"].includes(estado)
		? estado
		: "pendiente";

	let whereClause = "";
	const params = [];

	if (estadoNormalizado !== "todos") {
		whereClause = "WHERE c.estado = ?";
		params.push(estadoNormalizado);
	}

	const [rows] = await pool.query(
		`SELECT
			c.id AS comanda_id,
			c.venta_id,
			c.fecha_hora,
			c.estado,
			c.detalle_comanda,
			c.fecha_completado,
			v.metodo_pago,
			v.total,
			ci.id AS comanda_item_id,
			ci.producto_id,
			ci.cantidad,
			ci.nota_item,
			p.nombre AS producto_nombre
		 FROM comandas c
		 INNER JOIN ventas v ON v.id = c.venta_id
		 LEFT JOIN comanda_items ci ON ci.comanda_id = c.id
		 LEFT JOIN productos p ON p.id = ci.producto_id
		 ${whereClause}
		 ORDER BY c.fecha_hora ASC, c.id ASC, ci.id ASC`,
		params
	);

	return mapearComandasDesdeRows(rows);
};

const obtenerComandaPorId = async (comandaId) => {
	const [rows] = await pool.query(
		`SELECT
			c.id AS comanda_id,
			c.venta_id,
			c.fecha_hora,
			c.estado,
			c.detalle_comanda,
			c.fecha_completado,
			v.metodo_pago,
			v.total,
			ci.id AS comanda_item_id,
			ci.producto_id,
			ci.cantidad,
			ci.nota_item,
			p.nombre AS producto_nombre
		 FROM comandas c
		 INNER JOIN ventas v ON v.id = c.venta_id
		 LEFT JOIN comanda_items ci ON ci.comanda_id = c.id
		 LEFT JOIN productos p ON p.id = ci.producto_id
		 WHERE c.id = ?
		 ORDER BY c.fecha_hora ASC, c.id ASC, ci.id ASC`,
		[comandaId]
	);

	const comandas = mapearComandasDesdeRows(rows);
	return comandas[0] || null;
};

const redondear2 = (valor) => Number(Number(valor).toFixed(2));

const construirItemsSunat = (items = []) => {
	let totalGravada = 0;
	let totalIgv = 0;

	const itemsSunat = items.map((item) => {
		const cantidad = Number(item.cantidad);
		const precioUnitario = Number(item.precio_unitario);
		const valorUnitario = redondear2(precioUnitario / 1.18);

		totalGravada += redondear2(valorUnitario * cantidad);
		totalIgv += redondear2(valorUnitario * cantidad * 0.18);

		return {
			descripcion: item.descripcion,
			cantidad,
			valor_unitario: valorUnitario,
			precio_unitario: redondear2(precioUnitario),
			porcentaje_igv: 18,
			codigo_tipo_afectacion_igv: "10",
		};
	});

	const total = redondear2(totalGravada + totalIgv);

	return {
		itemsSunat,
		totalGravada: redondear2(totalGravada),
		totalIgv: redondear2(totalIgv),
		total,
	};
};

const obtenerValorComprobante = (respuesta, claves = []) => {
	for (const clave of claves) {
		if (respuesta?.[clave] !== undefined && respuesta?.[clave] !== null) {
			return respuesta[clave];
		}

		if (respuesta?.data?.[clave] !== undefined && respuesta?.data?.[clave] !== null) {
			return respuesta.data[clave];
		}
	}

	return null;
};

const logToFile = (msg) => {
	fs.appendFileSync(
		"./debug.log",
		`${new Date().toISOString()} - ${msg}\n`
	);
};

app.use(cors());
app.use(express.json());





app.use((req, res, next) => {
	if (req.url.startsWith("/api/comprobante")) {
		return next();
	}

	if (req.url.startsWith("/api/")) {
		req.url = req.url.replace(/^\/api/, "");
	}

	return next();
});

app.get(["/productos", "/api/productos"], async (req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT id, nombre, precio_compra, precio_venta, precio, stock, created_at
			 FROM productos
			 ORDER BY id ASC`
		);
		return res.status(200).json(rows);
	} catch (error) {
		console.error("Error al obtener productos:", error.message);
		return res.status(500).json({ error: "Error al obtener productos" });
	}
});

app.post(["/productos", "/api/productos"], async (req, res) => {
	try {
		const { nombre, stock } = req.body;
		const precioCompra = Number(req.body.precio_compra ?? 0);
		const precioVenta = Number(req.body.precio_venta ?? req.body.precio);

		if (
			!nombre ||
			stock === undefined ||
			Number.isNaN(precioCompra) ||
			Number.isNaN(precioVenta)
		) {
			return res
				.status(400)
				.json({ error: "nombre, precio_compra, precio_venta y stock son obligatorios" });
		}

		if (precioCompra < 0 || precioVenta < 0 || Number(stock) < 0) {
			return res.status(400).json({
				error: "precio_compra, precio_venta y stock no pueden ser negativos",
			});
		}

		const [result] = await pool.query(
			"INSERT INTO productos (nombre, precio_compra, precio_venta, precio, stock) VALUES (?, ?, ?, ?, ?)",
			[nombre, precioCompra, precioVenta, precioVenta, stock]
		);

		return res.status(201).json({
			message: "Producto creado correctamente",
			id: result.insertId,
		});
	} catch (error) {
		console.error("Error al crear producto:", error.message);
		return res.status(500).json({ error: "Error al crear producto" });
	}
});

app.put(["/productos/:id", "/api/productos/:id"], async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre, stock } = req.body;
		const precioCompra = Number(req.body.precio_compra ?? 0);
		const precioVenta = Number(req.body.precio_venta ?? req.body.precio);

		if (
			!nombre ||
			stock === undefined ||
			Number.isNaN(precioCompra) ||
			Number.isNaN(precioVenta)
		) {
			return res
				.status(400)
				.json({ error: "nombre, precio_compra, precio_venta y stock son obligatorios" });
		}

		if (precioCompra < 0 || precioVenta < 0 || Number(stock) < 0) {
			return res.status(400).json({
				error: "precio_compra, precio_venta y stock no pueden ser negativos",
			});
		}

		const [result] = await pool.query(
			"UPDATE productos SET nombre = ?, precio_compra = ?, precio_venta = ?, precio = ?, stock = ? WHERE id = ?",
			[nombre, precioCompra, precioVenta, precioVenta, stock, id]
		);

		if (result.affectedRows === 0) {
			return res.status(404).json({ error: "Producto no encontrado" });
		}

		return res.status(200).json({ message: "Producto actualizado correctamente" });
	} catch (error) {
		console.error("Error al actualizar producto:", error.message);
		return res.status(500).json({ error: "Error al actualizar producto" });
	}
});

app.delete(["/productos/:id", "/api/productos/:id"], async (req, res) => {
	try {
		const { id } = req.params;

		const [result] = await pool.query("DELETE FROM productos WHERE id = ?", [id]);

		if (result.affectedRows === 0) {
			return res.status(404).json({ error: "Producto no encontrado" });
		}

		return res.status(200).json({ message: "Producto eliminado correctamente" });
	} catch (error) {
		console.error("Error al eliminar producto:", error.message);
		return res.status(500).json({ error: "Error al eliminar producto" });
	}
});

app.get(["/ventas", "/api/ventas"], async (req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT
				v.id AS venta_id,
				v.total,
				v.metodo_pago,
				v.fecha,
				dv.producto_id,
				dv.cantidad,
				dv.precio AS precio_venta,
				dv.costo_unitario,
				(dv.precio - dv.costo_unitario) * dv.cantidad AS ganancia_linea,
				p.nombre AS producto_nombre
			 FROM ventas v
			 INNER JOIN detalle_venta dv ON dv.venta_id = v.id
			 INNER JOIN productos p ON p.id = dv.producto_id
			 ORDER BY v.fecha DESC, v.id DESC, dv.id ASC`
		);

		const ventasMap = new Map();

		for (const row of rows) {
			if (!ventasMap.has(row.venta_id)) {
				ventasMap.set(row.venta_id, {
					id: row.venta_id,
					createdAt: row.fecha,
					paymentMethod: row.metodo_pago,
					total: Number(row.total),
					items: [],
				});
			}

			ventasMap.get(row.venta_id).items.push({
				id: row.producto_id,
				name: row.producto_nombre,
				qty: Number(row.cantidad),
				price: Number(row.precio_venta),
				cost: Number(row.costo_unitario),
				profit: Number(row.ganancia_linea),
			});
		}

		return res.status(200).json(Array.from(ventasMap.values()));
	} catch (error) {
		console.error("Error al obtener ventas:", error.message);
		return res.status(500).json({ error: "Error al obtener ventas" });
	}
});

app.post(["/ventas", "/api/ventas"], async (req, res) => {
	let connection;

	try {
		connection = await pool.getConnection();
		const { total, metodo_pago, items } = req.body;
		const detalleComanda = String(req.body.detalle_comanda || "").trim();

		if (total === undefined || !metodo_pago || !Array.isArray(items) || items.length === 0) {
			return res
				.status(400)
				.json({ error: "Debes enviar total, metodo_pago e items" });
		}

		for (const item of items) {
			const { producto_id, cantidad } = item;

			if (!producto_id || !cantidad) {
				return res.status(400).json({
					error: "Cada item debe incluir producto_id y cantidad",
				});
			}
		}

		await connection.beginTransaction();
		const productosVentaMap = new Map();

		for (const item of items) {
			const { producto_id, cantidad } = item;

			const [stockRows] = await connection.query(
				"SELECT stock, precio_compra, precio_venta FROM productos WHERE id = ? FOR UPDATE",
				[producto_id]
			);

			if (stockRows.length === 0) {
				const notFoundError = new Error(
					`Producto con id ${producto_id} no existe`
				);
				notFoundError.statusCode = 404;
				throw notFoundError;
			}

			const stockActual = Number(stockRows[0].stock);

			if (stockActual < Number(cantidad)) {
				const stockError = new Error(
					`Stock insuficiente para el producto con id ${producto_id}`
				);
				stockError.statusCode = 409;
				throw stockError;
			}

			productosVentaMap.set(Number(producto_id), {
				precio_compra: Number(stockRows[0].precio_compra || 0),
				precio_venta: Number(stockRows[0].precio_venta || 0),
			});
		}

		const totalCalculado = Number(
			items
				.reduce((sum, item) => {
					const producto = productosVentaMap.get(Number(item.producto_id));
					return sum + Number(item.cantidad) * Number(producto?.precio_venta || 0);
				}, 0)
				.toFixed(2)
		);

		if (Number.isFinite(Number(total)) && Math.abs(Number(total) - totalCalculado) > 0.01) {
			console.warn(
				`Total recibido (${total}) no coincide con total calculado (${totalCalculado}). Se usará el calculado.`
			);
		}

		const [ventaResult] = await connection.query(
			"INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)",
			[totalCalculado, metodo_pago]
		);

		const ventaId = ventaResult.insertId;

		for (const item of items) {
			const { producto_id, cantidad } = item;
			const producto = productosVentaMap.get(Number(producto_id));
			const precioVenta = Number(producto?.precio_venta || 0);
			const costoUnitario = Number(producto?.precio_compra || 0);

			await connection.query(
				"INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio, costo_unitario) VALUES (?, ?, ?, ?, ?)",
				[ventaId, producto_id, cantidad, precioVenta, costoUnitario]
			);

			await connection.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [cantidad, producto_id]);
		}

		const [comandaResult] = await connection.query(
			"INSERT INTO comandas (venta_id, detalle_comanda, estado) VALUES (?, ?, 'pendiente')",
			[ventaId, detalleComanda || null]
		);

		const comandaId = comandaResult.insertId;

		for (const item of items) {
			await connection.query(
				"INSERT INTO comanda_items (comanda_id, producto_id, cantidad, nota_item) VALUES (?, ?, ?, ?)",
				[comandaId, item.producto_id, item.cantidad, item.nota_item || null]
			);
		}

		await connection.commit();

		const nuevaComanda = await obtenerComandaPorId(comandaId);
		if (nuevaComanda) {
			io.emit("nueva_comanda", nuevaComanda);
		}

		const [productosActualizados] = await connection.query(
			"SELECT * FROM productos"
		);

		return res.status(201).json({
			message: "Venta registrada correctamente",
			ventaId,
			comandaId,
			total: totalCalculado,
			metodo_pago,
			productos: productosActualizados,
		});
	} catch (error) {
		if (connection) {
			await connection.rollback();
		}
		console.error("Error al registrar venta:", error.message);
		return res
			.status(error.statusCode || 500)
			.json({ error: error.message || "Error al registrar venta" });
	} finally {
		if (connection) {
			connection.release();
		}
	}
});

app.get(["/comandas", "/api/comandas"], async (req, res) => {
	try {
		const estado = String(req.query.estado || "pendiente").toLowerCase();
		const comandas = await obtenerComandas(estado);
		return res.status(200).json(comandas);
	} catch (error) {
		console.error("Error al obtener comandas:", error.message);
		return res.status(500).json({ error: "Error al obtener comandas" });
	}
});

app.get(["/comandas/pendientes", "/api/comandas/pendientes"], async (req, res) => {
	try {
		const comandas = await obtenerComandas("pendiente");
		return res.status(200).json(comandas);
	} catch (error) {
		console.error("Error al obtener comandas pendientes:", error.message);
		return res.status(500).json({ error: "Error al obtener comandas pendientes" });
	}
});

app.patch(["/comandas/:id/listo", "/api/comandas/:id/listo"], async (req, res) => {
	try {
		const { id } = req.params;
		const [result] = await pool.query(
			"UPDATE comandas SET estado = 'listo', fecha_completado = NOW() WHERE id = ? AND estado = 'pendiente'",
			[id]
		);

		if (result.affectedRows === 0) {
			const comanda = await obtenerComandaPorId(id);
			if (!comanda) {
				return res.status(404).json({ error: "Comanda no encontrada" });
			}

			if (comanda.estado === "listo") {
				return res.status(200).json({
					message: "La comanda ya estaba marcada como lista",
					comanda,
				});
			}

			return res.status(409).json({ error: "No se pudo actualizar la comanda" });
		}

		const comandaActualizada = await obtenerComandaPorId(id);
		io.emit("comanda_lista", {
			comandaId: Number(id),
			comanda: comandaActualizada,
		});

		return res.status(200).json({
			message: "Comanda marcada como lista",
			comanda: comandaActualizada,
		});
	} catch (error) {
		console.error("Error al marcar comanda como lista:", error.message);
		return res.status(500).json({ error: "Error al marcar comanda como lista" });
	}
});

app.post("/api/comprobante", async (req, res) => {
	try {
		logToFile("=== POST /api/comprobante INICIADO ===");
		logToFile("Body: " + JSON.stringify(req.body));
		const {
			venta_id,
			fecha_de_emision,
			cliente_numero_de_documento,
			cliente_denominacion,
			items,
		} = req.body;

		if (!venta_id || !fecha_de_emision || !cliente_numero_de_documento || !cliente_denominacion) {
			return res.status(400).json({
				error: "venta_id, fecha_de_emision, cliente_numero_de_documento y cliente_denominacion son obligatorios",
			});
		}

		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({
				error: "Debe enviar items para emitir el comprobante",
			});
		}

		const numeroDocumento = String(cliente_numero_de_documento).trim();
		const tipoDocumentoCliente = numeroDocumento.length === 11 ? "6" : "1";

		if (![8, 11].includes(numeroDocumento.length)) {
			return res.status(400).json({
				error: "El documento del cliente debe tener 8 (DNI) o 11 (RUC) dígitos",
			});
		}

		const documento = tipoDocumentoCliente === "6" ? "factura" : "boleta";
		const serie = documento === "factura" ? "F001" : "B001";
		const numero = String(venta_id).padStart(8, "0");

		for (const item of items) {
			if (!item.descripcion || !item.cantidad || item.precio_unitario === undefined) {
				return res.status(400).json({
					error: "Cada item debe incluir descripcion, cantidad y precio_unitario",
				});
			}
		}

		const { itemsSunat, totalGravada, totalIgv, total } = construirItemsSunat(items);

		logToFile("itemsSunat construidos: " + JSON.stringify(itemsSunat));

		const payloadSunat = {
			serie,
			numero,
			fecha_de_emision,
			cliente_tipo_de_documento: tipoDocumentoCliente,
			cliente_numero_de_documento: numeroDocumento,
			cliente_denominacion,
			items: itemsSunat,
			total_gravada: totalGravada,
			total_igv: totalIgv,
			total,
		};

		logToFile("payloadSunat construido, llamando emitir" + documento + "...");

		const respuestaSunat =
			documento === "factura"
				? await emitirFactura(payloadSunat)
				: await emitirBoleta(payloadSunat);

		if (respuestaSunat?.success !== true) {
			return res.status(400).json({
				error:
					respuestaSunat?.message ||
					"APISUNAT no confirmó la emisión del comprobante",
				respuesta: respuestaSunat,
			});
		}

		const xml = obtenerValorComprobante(respuestaSunat, ["xml", "xml_url", "enlace_xml"]);
		const pdf = obtenerValorComprobante(respuestaSunat, ["pdf", "pdf_url", "enlace_pdf"]);
		const cdr = obtenerValorComprobante(respuestaSunat, ["cdr", "cdr_url", "enlace_cdr"]);
		const hash = obtenerValorComprobante(respuestaSunat, ["hash", "digest_value", "codigo_hash"]);
		const documentId = obtenerValorComprobante(respuestaSunat, ["documentId"]);
		const estado = obtenerValorComprobante(respuestaSunat, ["status"]);
		const fileName = obtenerValorComprobante(respuestaSunat, ["fileName"]);

		await pool.query(
			`INSERT INTO comprobantes (
				venta_id,
				tipo_documento,
				serie,
				numero,
				cliente_tipo_documento,
				cliente_numero_documento,
				cliente_denominacion,
				xml,
				pdf,
				cdr,
				hash,
				respuesta_json
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				tipo_documento = VALUES(tipo_documento),
				serie = VALUES(serie),
				numero = VALUES(numero),
				cliente_tipo_documento = VALUES(cliente_tipo_documento),
				cliente_numero_documento = VALUES(cliente_numero_documento),
				cliente_denominacion = VALUES(cliente_denominacion),
				xml = VALUES(xml),
				pdf = VALUES(pdf),
				cdr = VALUES(cdr),
				hash = VALUES(hash),
				respuesta_json = VALUES(respuesta_json)`,
			[
				venta_id,
				documento,
				serie,
				numero,
				tipoDocumentoCliente,
				numeroDocumento,
				cliente_denominacion,
				xml,
				pdf,
				cdr,
				hash,
				JSON.stringify(respuestaSunat),
			]
		);

		return res.status(201).json({
			message: `${documento} enviada a APISUNAT (${estado || "PENDIENTE"})`,
			documento,
			serie,
			numero,
			documentId,
			estado,
			fileName,
			hash,
			pdf,
			xml,
			cdr,
		});
	} catch (error) {
		logToFile("ERROR: " + error.message);
		logToFile("STACK: " + error.stack);
		console.error("Error al emitir comprobante:", error.message);
		return res.status(500).json({ error: error.message || "Error al emitir comprobante" });
	}
});

app.get("/api/comprobante", (req, res) => {
	return res.status(405).json({
		error: "Usa POST /api/comprobante para emitir un comprobante electrónico",
	});
});

app.get(["/api/consultar-cliente", "/consultar-cliente"], async (req, res) => {
	try {
		const { documento } = req.query;

		if (!documento || documento.trim().length === 0) {
			return res.status(400).json({ error: "Documento requerido" });
		}

		const docLimpio = documento.trim();
		const esRuc = docLimpio.length === 11;
		const esDni = docLimpio.length === 8;

		if (!esRuc && !esDni) {
			return res.status(400).json({
				error: "El documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC)",
			});
		}

		const token = process.env.APIS_NET_PE_TOKEN;
		const tipoDocumento = esRuc ? "6" : "1";

		if (!token) {
			return res.status(500).json({
				error: "Falta APIS_NET_PE_TOKEN en .env",
			});
		}

		// Solo RUC por ahora (DNI requiere plan pagado)
		if (esDni) {
			return res.status(200).json({
				found: false,
				documento: docLimpio,
				tipoDocumento,
				mensaje: "Ingresa el nombre del cliente manualmente",
			});
		}

		const urlFinal = `https://api.decolecta.com/v1/sunat/ruc?numero=${docLimpio}`;

		let denominacion = null;

		try {
			const response = await fetch(urlFinal, {
				method: "GET",
				headers: {
					"Accept": "application/json",
					"Authorization": `Bearer ${token}`,
				},
			});

			const text = await response.text();
			let data = null;
			try {
				data = JSON.parse(text);
			} catch {
				console.warn("Respuesta no-JSON:", text);
			}

			console.log(`Respuesta apis.net.pe (RUC):`, JSON.stringify(data));

			if (response.ok && data) {
				denominacion = data?.razon_social || data?.razonSocial || data?.nombre || null;
			} else {
				console.warn(`apis.net.pe respondió ${response.status}:`, text);
			}
		} catch (err) {
			console.error(`Error consultando apis.net.pe:`, err.message);
		}

		if (denominacion) {
			return res.status(200).json({
				found: true,
				documento: docLimpio,
				denominacion: denominacion.trim().toUpperCase(),
				tipoDocumento,
			});
		}

		return res.status(200).json({
			found: false,
			documento: docLimpio,
			tipoDocumento,
			mensaje: "No se encontraron datos. Por favor, ingresa el nombre manualmente.",
		});
	} catch (error) {
		console.error("Error consultando cliente:", error);
		return res.status(500).json({
			error: "Error al consultar los datos del cliente",
			detalles: error.message,
		});
	}
});

const iniciarServidor = async () => {
	try {
		await initDB();
		await crearTablaComprobantes();
		await crearTablasComandas();
		await ejecutarSeed();
		io.on("connection", (socket) => {
			console.log(`Socket conectado: ${socket.id}`);
		});

		httpServer.listen(PORT, "0.0.0.0", () => {
			console.log(`Servidor backend corriendo en puerto ${PORT}`);
		});
	} catch (error) {
		console.error("Error al iniciar el servidor:", error);
		process.exit(1);
	}
};

iniciarServidor();
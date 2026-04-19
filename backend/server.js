import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import fs from "fs";
import pool from "./db.js";
import { emitirBoleta, emitirFactura } from "./apisunat.js";

const app = express();
const PORT = 3000;

const PRODUCTOS_INICIALES = [
	{ nombre: "Pan", precio: 2.5, stock: 10 },
	{ nombre: "Leche", precio: 4.2, stock: 10 },
	{ nombre: "Huevos", precio: 7.8, stock: 10 },
	{ nombre: "Arroz", precio: 3.6, stock: 10 },
	{ nombre: "Aceite", precio: 9.5, stock: 10 },
];

const sembrarProductosIniciales = async () => {
	for (const producto of PRODUCTOS_INICIALES) {
		const [rows] = await pool.query(
			"SELECT id FROM productos WHERE nombre = ? LIMIT 1",
			[producto.nombre]
		);

		if (rows.length === 0) {
			await pool.query(
				"INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)",
				[producto.nombre, producto.precio, producto.stock]
			);
		}
	}
};

const crearTablaComprobantes = async () => {
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
		const [rows] = await pool.query("SELECT * FROM productos");
		return res.status(200).json(rows);
	} catch (error) {
		console.error("Error al obtener productos:", error.message);
		return res.status(500).json({ error: "Error al obtener productos" });
	}
});

app.post(["/productos", "/api/productos"], async (req, res) => {
	try {
		const { nombre, precio, stock } = req.body;

		if (!nombre || precio === undefined || stock === undefined) {
			return res
				.status(400)
				.json({ error: "nombre, precio y stock son obligatorios" });
		}

		const [result] = await pool.query(
			"INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)",
			[nombre, precio, stock]
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
		const { nombre, precio, stock } = req.body;

		if (!nombre || precio === undefined || stock === undefined) {
			return res
				.status(400)
				.json({ error: "nombre, precio y stock son obligatorios" });
		}

		const [result] = await pool.query(
			"UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?",
			[nombre, precio, stock, id]
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
				dv.precio,
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
				price: Number(row.precio),
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

		if (total === undefined || !metodo_pago || !Array.isArray(items) || items.length === 0) {
			return res
				.status(400)
				.json({ error: "Debes enviar total, metodo_pago e items" });
		}

		for (const item of items) {
			const { producto_id, cantidad, precio } = item;

			if (!producto_id || !cantidad || precio === undefined) {
				return res.status(400).json({
					error: "Cada item debe incluir producto_id, cantidad y precio",
				});
			}
		}

		await connection.beginTransaction();

		for (const item of items) {
			const { producto_id, cantidad } = item;

			const [stockRows] = await connection.query(
				"SELECT stock FROM productos WHERE id = ? FOR UPDATE",
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
		}

		const [ventaResult] = await connection.query(
			"INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)",
			[total, metodo_pago]
		);

		const ventaId = ventaResult.insertId;

		for (const item of items) {
			const { producto_id, cantidad, precio } = item;

			await connection.query(
				"INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)",
				[ventaId, producto_id, cantidad, precio]
			);

			await connection.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [cantidad, producto_id]);
		}

		await connection.commit();

		const [productosActualizados] = await connection.query(
			"SELECT * FROM productos"
		);

		return res.status(201).json({
			message: "Venta registrada correctamente",
			ventaId,
			total,
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
		await crearTablaComprobantes();
		await sembrarProductosIniciales();
		app.listen(PORT, () => {
			console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
		});
	} catch (error) {
		console.error("Error al iniciar el servidor:", error.message);
		process.exit(1);
	}
};

iniciarServidor();
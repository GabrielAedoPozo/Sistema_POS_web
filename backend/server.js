import express from "express";
import cors from "cors";
import pool from "./db.js";

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

app.use(cors());
app.use(express.json());

app.get("/productos", async (req, res) => {
	try {
		const [rows] = await pool.query("SELECT * FROM productos");
		return res.status(200).json(rows);
	} catch (error) {
		console.error("Error al obtener productos:", error.message);
		return res.status(500).json({ error: "Error al obtener productos" });
	}
});

app.post("/productos", async (req, res) => {
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

app.put("/productos/:id", async (req, res) => {
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

app.delete("/productos/:id", async (req, res) => {
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

app.get("/ventas", async (req, res) => {
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

app.post("/ventas", async (req, res) => {
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

const iniciarServidor = async () => {
	try {
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

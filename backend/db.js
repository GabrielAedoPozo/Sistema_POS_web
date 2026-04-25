import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const pool = mysql.createPool({
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME || "pos_system",
	port: process.env.DB_PORT || 3306,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	multipleStatements: true,
});

export const initDB = async () => {
	await pool.query(
		`CREATE TABLE IF NOT EXISTS productos (
			id INT AUTO_INCREMENT PRIMARY KEY,
			nombre VARCHAR(255) NOT NULL,
			precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0,
			precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
			precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
			stock INT NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

	const [productosColumns] = await pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos'`
	);
	const productosColumnSet = new Set(productosColumns.map((col) => col.COLUMN_NAME));

	if (!productosColumnSet.has("precio_compra")) {
		await pool.query(
			"ALTER TABLE productos ADD COLUMN precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER nombre"
		);
	}

	if (!productosColumnSet.has("precio_venta")) {
		await pool.query(
			"ALTER TABLE productos ADD COLUMN precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER precio_compra"
		);
	}

	if (!productosColumnSet.has("created_at")) {
		await pool.query(
			"ALTER TABLE productos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
		);
	}

	await pool.query(
		"UPDATE productos SET precio_venta = CASE WHEN precio_venta = 0 THEN precio ELSE precio_venta END"
	);
	await pool.query("UPDATE productos SET precio = precio_venta");

	await pool.query(
		`CREATE TABLE IF NOT EXISTS ventas (
			id INT AUTO_INCREMENT PRIMARY KEY,
			total DECIMAL(10, 2) NOT NULL,
			metodo_pago VARCHAR(50) NOT NULL,
			fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

	await pool.query(
		`CREATE TABLE IF NOT EXISTS detalle_venta (
			id INT AUTO_INCREMENT PRIMARY KEY,
			venta_id INT NOT NULL,
			producto_id INT NOT NULL,
			cantidad INT NOT NULL,
			precio DECIMAL(10, 2) NOT NULL,
			costo_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
			CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id),
			CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
		)`
	);

	const [detalleColumns] = await pool.query(
		`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_venta'`
	);
	const detalleColumnSet = new Set(detalleColumns.map((col) => col.COLUMN_NAME));

	if (!detalleColumnSet.has("costo_unitario")) {
		await pool.query(
			"ALTER TABLE detalle_venta ADD COLUMN costo_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER precio"
		);
	}
};

export default pool;
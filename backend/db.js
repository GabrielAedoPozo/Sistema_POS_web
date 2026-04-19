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
			precio DECIMAL(10, 2) NOT NULL,
			stock INT NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

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
			CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id),
			CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
		)`
	);
};

export default pool;
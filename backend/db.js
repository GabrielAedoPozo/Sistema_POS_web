import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const pool = mysql.createPool({
	host: "localhost",
	user: "root",
	password: process.env.DB_PASSWORD,
	database: "pos_system",
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

export default pool;

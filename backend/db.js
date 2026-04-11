import "dotenv/config";
import mysql from "mysql2/promise";

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

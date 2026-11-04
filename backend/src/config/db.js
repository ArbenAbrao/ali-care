const mysql = require("mysql2/promise");
const env = require("./env");
const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+08:00",
  dateStrings: true,
  charset: "utf8mb4",
});
pool.on("connection", (connection) =>
  connection.query("SET time_zone = '+08:00'"),
);
module.exports = pool;
